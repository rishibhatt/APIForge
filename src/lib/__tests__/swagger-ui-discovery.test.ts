import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractEmbeddedSwaggerDoc,
  guessSpecUrls,
  looksLikeSwaggerUiPage,
  resolveSpecPath,
  scanSwaggerUiSource,
  specsFromSwaggerConfigJson,
} from "../swagger-ui-discovery";
import { parseSpecFetchHeaders } from "../security/spec-fetch-headers";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", "swagger-ui", name), "utf-8");

const urlsOf = (specs: Array<{ url: string }>) => specs.map((s) => s.url);

describe("Swagger UI discovery — docs pages per framework", () => {
  it("FastAPI: inline SwaggerUIBundle with a single-quoted relative url", () => {
    const html = fixture("fastapi.html");
    assert.ok(looksLikeSwaggerUiPage(html));
    const scan = scanSwaggerUiSource(html, "https://app.example.com/api/docs");
    assert.deepStrictEqual(urlsOf(scan.specs), ["https://app.example.com/api/openapi.json"]);
  });

  it("Swashbuckle: JSON.parse config object with urls[]", () => {
    const html = fixture("swashbuckle-index.html");
    const scan = scanSwaggerUiSource(html, "https://api.example.com/index.html");
    assert.deepStrictEqual(scan.specs, [
      { url: "https://api.example.com/swagger/v1/swagger.json", name: "V1" },
    ]);
  });

  it("Springdoc: initializer script gives configUrl, swagger-config lists specs with primaryName first", () => {
    const pageHref = "https://shop.example.com/swagger-ui/index.html";
    const page = scanSwaggerUiSource(fixture("springdoc-index.html"), pageHref);
    assert.deepStrictEqual(page.scriptUrls, ["https://shop.example.com/swagger-ui/swagger-initializer.js"]);

    const js = scanSwaggerUiSource(fixture("springdoc-initializer.js"), pageHref);
    assert.deepStrictEqual(js.configUrls, ["https://shop.example.com/v3/api-docs/swagger-config"]);

    const specs = specsFromSwaggerConfigJson(
      fixture("springdoc-swagger-config.json"),
      "https://shop.example.com/v3/api-docs/swagger-config",
    );
    assert.deepStrictEqual(specs, [
      { url: "https://shop.example.com/v3/api-docs/admin", name: "admin" },
      { url: "https://shop.example.com/v3/api-docs/public", name: "public" },
    ]);
  });

  it("NestJS: swagger-ui-init.js embeds the document under swaggerDoc", () => {
    const pageHref = "https://cats.example.com/api";
    const page = scanSwaggerUiSource(fixture("nestjs-index.html"), pageHref);
    assert.deepStrictEqual(page.scriptUrls, ["https://cats.example.com/swagger-ui-init.js"]);

    const js = fixture("nestjs-swagger-ui-init.js");
    const doc = extractEmbeddedSwaggerDoc(js);
    assert.ok(doc);
    assert.strictEqual((doc.info as { title: string }).title, "Cats example");
    assert.ok((doc.paths as Record<string, unknown>)["/cats"]);
    // `url: url` resolves to window.location.* at runtime: not a literal, so no bogus candidate.
    assert.deepStrictEqual(scanSwaggerUiSource(js, pageHref).specs, []);
  });

  it("swagger-ui-express: swaggerUrl option", () => {
    const scan = scanSwaggerUiSource(fixture("express-swagger-ui-init.js"), "https://x.example.com/docs/");
    assert.deepStrictEqual(urlsOf(scan.specs), ["https://x.example.com/api/v1/openapi.yaml"]);
  });

  it("swagger-ui-dist initializer: ossServices host match, else defaultDefinitionUrl", () => {
    const js = fixture("petstore-initializer.js");
    assert.deepStrictEqual(urlsOf(scanSwaggerUiSource(js, "https://petstore3.swagger.io/").specs), [
      "https://petstore3.swagger.io/api/v3/openapi.json",
    ]);
    assert.deepStrictEqual(urlsOf(scanSwaggerUiSource(js, "https://docs.example.com/").specs), [
      "https://petstore.swagger.io/v2/swagger.json",
    ]);
  });

  it("inline urls[] dropdown: all entries, primaryName first, analytics url ignored", () => {
    const scan = scanSwaggerUiSource(fixture("inline-urls.html"), "https://docs.example.com/docs/");
    assert.deepStrictEqual(scan.specs, [
      { url: "https://docs.example.com/docs/specs/orders.yaml", name: "Orders" },
      { url: "https://docs.example.com/billing/openapi.json", name: "Billing" },
      { url: "https://cdn.example.com/catalog.json", name: "Catalog" },
    ]);
    assert.deepStrictEqual(scan.scriptUrls, [], "CDN bundles are never fetched for options");
  });

  it("url built from window.location.origin + a variable", () => {
    const scan = scanSwaggerUiSource(fixture("origin-concat.html"), "https://ops.example.com/tools/docs");
    assert.deepStrictEqual(urlsOf(scan.specs), ["https://ops.example.com/internal/v2/openapi.json"]);
  });

  it("unrendered server template placeholders are skipped", () => {
    const scan = scanSwaggerUiSource(fixture("unrendered-template.html"), "https://a.example.com/docs");
    assert.deepStrictEqual(scan.specs, []);
  });

  it("a plain web page is not a Swagger UI page", () => {
    assert.strictEqual(looksLikeSwaggerUiPage("<html><body><h1>Hello</h1></body></html>"), false);
  });
});

describe("Swagger UI discovery — guessed spec paths", () => {
  it("looks next to the docs page before the origin root", () => {
    const g = guessSpecUrls("https://h.example.com/api/docs");
    assert.strictEqual(g[0], "https://h.example.com/api/docs-json");
    assert.strictEqual(g[1], "https://h.example.com/api/openapi.json");
    assert.ok(g.indexOf("https://h.example.com/api/openapi.json") < g.indexOf("https://h.example.com/openapi.json"));
  });

  it("strips swagger-ui/index.html segments", () => {
    const g = guessSpecUrls("https://h.example.com/swagger-ui/index.html");
    assert.ok(g.includes("https://h.example.com/v3/api-docs"));
    assert.ok(g.includes("https://h.example.com/swagger/v1/swagger.json"));
  });

  it("NestJS /api docs path guesses /api-json", () => {
    assert.strictEqual(guessSpecUrls("https://h.example.com/api")[0], "https://h.example.com/api-json");
  });
});

describe("Swagger UI discovery — path resolution", () => {
  it("resolves relative, root-relative and protocol-relative paths", () => {
    assert.strictEqual(resolveSpecPath("https://a.io/docs/", "openapi.json"), "https://a.io/docs/openapi.json");
    assert.strictEqual(resolveSpecPath("https://a.io/docs/", "/openapi.json"), "https://a.io/openapi.json");
    assert.strictEqual(resolveSpecPath("https://a.io/docs/", "//b.io/s.json"), "https://b.io/s.json");
  });

  it("rejects non-http schemes", () => {
    assert.strictEqual(resolveSpecPath("https://a.io/", "javascript:alert(1)"), null);
    assert.strictEqual(resolveSpecPath("https://a.io/", "file:///etc/passwd"), null);
  });
});

describe("Spec fetch auth headers", () => {
  it("accepts Authorization and API key headers, drops blank rows", () => {
    const r = parseSpecFetchHeaders({ Authorization: "Bearer abc", "X-API-Key": " k ", "": "" });
    assert.deepStrictEqual(r, { ok: true, headers: { Authorization: "Bearer abc", "X-API-Key": "k" } });
  });

  it("rejects header injection and transport headers", () => {
    assert.strictEqual(parseSpecFetchHeaders({ Authorization: "a\r\nX-Evil: 1" }).ok, false);
    assert.strictEqual(parseSpecFetchHeaders({ Host: "internal" }).ok, false);
    assert.strictEqual(parseSpecFetchHeaders({ "bad name": "x" }).ok, false);
    assert.strictEqual(parseSpecFetchHeaders(["Authorization"]).ok, false);
  });
});
