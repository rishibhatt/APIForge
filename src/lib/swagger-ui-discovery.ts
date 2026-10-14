/**
 * Finds the raw OpenAPI document behind a hosted docs page.
 *
 * Covers the Swagger UI setups seen in the wild:
 * - inline `SwaggerUIBundle({ url: '/openapi.json' })` (FastAPI, Django Ninja, hand-written pages)
 * - `urls: [{ url, name }]` multi-spec dropdowns and `configUrl` (Springdoc `/v3/api-docs/swagger-config`)
 * - `swagger-initializer.js` (swagger-ui-dist 4+, Springdoc)
 * - `JSON.parse('{"urls":[...]}')` config objects (Swashbuckle `index.html` / `index.js`)
 * - `swagger-ui-init.js` with `"swaggerDoc"` or `"swaggerUrl"` (NestJS, swagger-ui-express)
 *
 * Pure string work only: no fetching here, so it can be unit tested with saved HTML.
 */

export interface DiscoveredSpec {
  url: string;
  name?: string;
}

export interface SwaggerUiScan {
  /** Spec documents named by the page, in the order Swagger UI would show them. */
  specs: DiscoveredSpec[];
  /** Swagger UI `configUrl` targets: JSON files that hold `url` / `urls`. */
  configUrls: string[];
  /** Same-page scripts that may hold the Swagger UI options (initializer, init, index.js). */
  scriptUrls: string[];
}

/** Third-party bundles that never carry the options object; skip fetching them. */
const LIBRARY_SCRIPT =
  /swagger-ui-bundle|swagger-ui-standalone-preset|swagger-ui\.js|jquery|react(-dom)?(\.production)?(\.min)?\.js|polyfill|analytics|gtag|googletagmanager/i;

/** Script file names that usually hold the Swagger UI options object. */
const OPTIONS_SCRIPT = /swagger-ui-init\.js|swagger-initializer\.js|(^|\/)index\.js|swagger-config|swagger.*\.js/i;

export function looksLikeSwaggerUiPage(html: string): boolean {
  return (
    /id\s*=\s*["']swagger-ui["']/i.test(html) ||
    /SwaggerUIBundle|SwaggerUIStandalonePreset|\bSwaggerUI\s*\(/.test(html) ||
    /swagger-ui-init\.js|swagger-initializer\.js|swagger-ui-bundle/i.test(html)
  );
}

export function looksLikeHtml(contentType: string, text: string): boolean {
  return contentType.includes("text/html") || /^\s*</.test(text);
}

/** Resolve a spec path from a Swagger UI option against the page that declared it. */
export function resolveSpecPath(pageHref: string, specPath: string): string | null {
  let p = specPath.trim();
  if (!p || /[{}$<>]/.test(p)) return null; // unrendered template, e.g. {{ openapi_url }}
  if (/^\/\//.test(p)) p = new URL(pageHref).protocol + p;
  try {
    const resolved = new URL(p, pageHref);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    resolved.hash = "";
    return resolved.href;
  } catch {
    return null;
  }
}

/** Reads a JS string literal starting at `pos` (on the opening quote). Returns the value and end index. */
function readStringLiteral(src: string, pos: number): { value: string; end: number } | null {
  const quote = src[pos];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let out = "";
  for (let i = pos + 1; i < src.length; i++) {
    const c = src[i]!;
    if (c === "\\") {
      const next = src[i + 1];
      if (next === undefined) return null;
      if (next === "u" && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
        out += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
        i += 5;
      } else if (next === "/") {
        out += "/";
        i++;
      } else {
        out += next;
        i++;
      }
      continue;
    }
    if (c === quote) return { value: out, end: i + 1 };
    if (quote === "`" && c === "$" && src[i + 1] === "{") return null; // interpolated template
    if (c === "\n" && quote !== "`") return null;
    out += c;
  }
  return null;
}

/**
 * Reads the value of a `url`-style option: a string literal, optionally prefixed with
 * `window.location.origin +` (or `location.origin +`), or a variable declared with one
 * (`const specUrl = "/openapi.json"; ... url: specUrl`). `scope` is searched for that declaration.
 */
function readUrlValue(src: string, pos: number, scope: string = src, depth = 0): { value: string; end: number } | null {
  let p = pos;
  while (p < src.length && /\s/.test(src[p]!)) p++;
  const originPrefix = /^(?:window\.)?location\.origin\s*\+\s*/.exec(src.slice(p, p + 60));
  if (originPrefix) p += originPrefix[0].length;
  const lit = readStringLiteral(src, p);
  if (lit) return lit;

  const ident = /^[A-Za-z_$][\w$]*/.exec(src.slice(p, p + 80));
  if (!ident || depth > 2 || /^(null|undefined|true|false)$/.test(ident[0])) return null;
  const name = ident[0].replace(/\$/g, "\\$");
  const decl = new RegExp(`(?:\\b(?:const|let|var)\\s+|[{,;\\s])${name}\\s*=\\s*(?!=)`).exec(scope);
  if (!decl) return null;
  const v = readUrlValue(scope, decl.index + decl[0].length, scope, depth + 1);
  return v ? { value: v.value, end: p + ident[0].length } : null;
}

/**
 * swagger-ui-dist's own initializer (petstore.swagger.io and forks) picks the spec per host:
 * `ossServices = \`host=url,...\``, falling back to `defaultDefinitionUrl`.
 */
function ossServicesSpec(src: string, pageHost: string): string | null {
  const list = /ossServices\s*=\s*`([^`]*)`/.exec(src)?.[1];
  if (list) {
    for (const pair of list.split(",")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const host = pair.slice(0, eq).trim();
      if (host && pageHost.includes(host)) return pair.slice(eq + 1).trim();
    }
  }
  const def = /defaultDefinitionUrl\s*=\s*/.exec(src);
  return def ? readUrlValue(src, def.index + def[0].length)?.value ?? null : null;
}

/** Index of the bracket that closes the one at `start`, skipping string literals. */
function matchBracket(src: string, start: number): number {
  const open = src[start];
  const close = open === "[" ? "]" : open === "{" ? "}" : "";
  if (!close) return -1;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const lit = readStringLiteral(src, i);
      if (lit) {
        i = lit.end - 1;
        continue;
      }
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** All `key: "value"` / `"key": "value"` pairs for one key name, in source order. */
function findKeyValues(src: string, key: string): Array<{ value: string; index: number }> {
  const out: Array<{ value: string; index: number }> = [];
  const re = new RegExp(`(?<![\\w$.])["']?${key}["']?\\s*:`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const v = readUrlValue(src, m.index + m[0].length);
    if (v) out.push({ value: v.value, index: m.index });
  }
  return out;
}

/** `urls: [{ url: "...", name: "..." }, ...]` blocks. Returns entries and the ranges they cover. */
function findUrlsArrays(src: string): { specs: DiscoveredSpec[]; ranges: Array<[number, number]> } {
  const specs: DiscoveredSpec[] = [];
  const ranges: Array<[number, number]> = [];
  const re = /(?<![\w$.])["']?urls["']?\s*:\s*\[/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length - 1;
    const end = matchBracket(src, start);
    if (end === -1) continue;
    ranges.push([start, end]);
    const body = src.slice(start + 1, end);
    for (let i = 0; i < body.length; i++) {
      if (body[i] !== "{") continue;
      const close = matchBracket(body, i);
      if (close === -1) break;
      const obj = body.slice(i, close + 1);
      const url = findKeyValues(obj, "url")[0]?.value;
      const name = findKeyValues(obj, "name")[0]?.value;
      if (url) specs.push(name ? { url, name } : { url });
      i = close;
    }
  }
  return { specs, ranges };
}

/** `JSON.parse('...')` and `JSON.parse("...")` arguments (Swashbuckle `configObject`). */
function jsonParseArgs(src: string): string[] {
  const out: string[] = [];
  const re = /JSON\.parse\(\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const lit = readStringLiteral(src, m.index + m[0].length);
    if (lit) out.push(lit.value);
  }
  return out;
}

function specsFromConfigObject(o: Record<string, unknown>): { specs: DiscoveredSpec[]; configUrls: string[] } {
  const specs: DiscoveredSpec[] = [];
  const configUrls: string[] = [];
  if (Array.isArray(o.urls)) {
    for (const item of o.urls) {
      if (!item || typeof item !== "object") continue;
      const { url, name } = item as { url?: unknown; name?: unknown };
      if (typeof url === "string") specs.push(typeof name === "string" ? { url, name } : { url });
    }
    // Springdoc / Swagger UI: `urls.primaryName` picks which entry opens first.
    const primary = o["urls.primaryName"];
    if (typeof primary === "string") {
      const i = specs.findIndex((s) => s.name === primary);
      if (i > 0) specs.unshift(...specs.splice(i, 1));
    }
  }
  if (typeof o.url === "string") specs.push({ url: o.url });
  if (typeof o.swaggerUrl === "string") specs.push({ url: o.swaggerUrl });
  if (typeof o.configUrl === "string") configUrls.push(o.configUrl);
  return { specs, configUrls };
}

/** Parses a fetched Swagger UI `configUrl` response (Springdoc `swagger-config`). */
export function specsFromSwaggerConfigJson(raw: string, configHref: string): DiscoveredSpec[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  return resolveAll(specsFromConfigObject(parsed as Record<string, unknown>).specs, configHref);
}

function resolveAll(specs: DiscoveredSpec[], baseHref: string): DiscoveredSpec[] {
  const out: DiscoveredSpec[] = [];
  const seen = new Set<string>();
  for (const s of specs) {
    const url = resolveSpecPath(baseHref, s.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(s.name ? { url, name: s.name } : { url });
  }
  return out;
}

/** Inline `<script>` bodies, or the whole text when it is already JS. */
function scriptBodies(text: string): string[] {
  if (!/<script/i.test(text)) return [text];
  const out: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[2] && m[2].trim()) out.push(m[2]);
  }
  return out;
}

function scriptSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

/**
 * Scans a docs page (HTML) or one of its scripts (JS) for the Swagger UI options.
 * `baseHref` is the URL the text was loaded from; relative paths resolve against it.
 */
export function scanSwaggerUiSource(text: string, baseHref: string): SwaggerUiScan {
  const specs: DiscoveredSpec[] = [];
  const configUrls: string[] = [];

  for (const body of scriptBodies(text)) {
    // 1. JSON config objects (Swashbuckle).
    for (const arg of jsonParseArgs(body)) {
      try {
        const o = JSON.parse(arg) as unknown;
        if (o && typeof o === "object" && !Array.isArray(o)) {
          const found = specsFromConfigObject(o as Record<string, unknown>);
          specs.push(...found.specs);
          configUrls.push(...found.configUrls);
        }
      } catch {
        /* not JSON */
      }
    }

    // 2. `urls: [...]` dropdowns.
    const { specs: listed, ranges } = findUrlsArrays(body);
    specs.push(...listed);
    const inArray = (i: number) => ranges.some(([a, b]) => i > a && i < b);

    // 3. A lone `url:` / `swaggerUrl:` option. Only trusted near Swagger UI markers so an
    //    unrelated `url:` in some analytics snippet does not become a candidate.
    if (/SwaggerUI|swagger|openapi|api-docs|redoc/i.test(body)) {
      for (const key of ["url", "swaggerUrl"]) {
        for (const { value, index } of findKeyValues(body, key)) {
          if (!inArray(index)) specs.push({ url: value });
        }
      }
    }
    for (const { value } of findKeyValues(body, "configUrl")) configUrls.push(value);

    const oss = ossServicesSpec(body, new URL(baseHref).host);
    if (oss) specs.unshift({ url: oss });
  }

  // The stock swagger-ui-dist initializer ships the Petstore demo URL. When the page also names
  // its own spec, the demo is a leftover default, not the API the user pasted.
  const PETSTORE = /petstore\.swagger\.io\/v2\/swagger\.json/i;
  const own = specs.filter((s) => !PETSTORE.test(s.url));
  const chosen = own.length > 0 ? own : specs;

  const scriptUrls: string[] = [];
  for (const src of scriptSrcs(text)) {
    if (LIBRARY_SCRIPT.test(src) || !OPTIONS_SCRIPT.test(src)) continue;
    const abs = resolveSpecPath(baseHref, src);
    if (!abs) continue;
    // Only same-origin scripts: a CDN bundle never holds this page's options.
    if (new URL(abs).origin !== new URL(baseHref).origin) continue;
    if (!scriptUrls.includes(abs)) scriptUrls.push(abs);
  }

  return {
    specs: resolveAll(chosen, baseHref),
    configUrls: Array.from(
      new Set(configUrls.map((u) => resolveSpecPath(baseHref, u)).filter((u): u is string => !!u)),
    ),
    scriptUrls,
  };
}

/**
 * NestJS / swagger-ui-express embed the whole document in swagger-ui-init.js as
 * `"swaggerDoc": { ... }`. Returns it when present and well-formed.
 */
export function extractEmbeddedSwaggerDoc(js: string): Record<string, unknown> | null {
  const m = /["']?swaggerDoc["']?\s*:\s*\{/.exec(js);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  const end = matchBracket(js, start);
  if (end === -1) return null;
  try {
    const doc = JSON.parse(js.slice(start, end + 1)) as unknown;
    return doc && typeof doc === "object" && !Array.isArray(doc) ? (doc as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Default spec paths per framework, relative to one base directory. */
const SPEC_SUFFIXES = [
  "openapi.json",
  "swagger.json",
  "v3/api-docs",
  "openapi.yaml",
  "swagger/v1/swagger.json",
  "v2/api-docs",
  "api-docs",
  "swagger.yaml",
];

/** Last path segments that mean "this is a docs page, the spec sits next to it". */
const DOCS_SEGMENT = /^(docs?|swagger(-ui)?(\.html)?|api-docs|redoc|index\.html|ui|documentation|explorer|scalar|rapidoc)$/i;

/**
 * Guessed spec URLs for a pasted docs page, nearest first.
 * `/api/docs` gives `/api/openapi.json`, `/api/swagger.json`, …, then the same under `/`.
 * NestJS `/api` gives `/api-json`.
 */
export function guessSpecUrls(pageUrl: string, limit = 14): string[] {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    return [];
  }
  const out: string[] = [];
  const push = (path: string) => {
    const href = `${u.origin}${path}`;
    if (href !== pageUrl && !out.includes(href)) out.push(href);
  };

  const segments = u.pathname.split("/").filter(Boolean);
  // Strip trailing docs-ish segments: /api/swagger-ui/index.html → /api
  while (segments.length && DOCS_SEGMENT.test(segments[segments.length - 1]!)) segments.pop();

  // NestJS default: docs at /<path>, JSON at /<path>-json.
  const rawPath = u.pathname.replace(/\/+$/, "");
  if (rawPath && !/\.\w+$/.test(rawPath)) push(`${rawPath}-json`);

  const bases: string[] = [];
  for (let n = segments.length; n >= 0; n--) {
    bases.push(n === 0 ? "" : `/${segments.slice(0, n).join("/")}`);
  }
  for (const base of bases) {
    for (const suffix of SPEC_SUFFIXES) push(`${base}/${suffix}`);
  }
  return out.slice(0, limit);
}
