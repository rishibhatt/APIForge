/**
 * Resolve OpenAPI security schemes referenced by an operation for UI hints.
 */

export type AuthFieldKind = "bearer" | "basic" | "apiKey";

export interface AuthFieldHint {
  schemeName: string;
  kind: AuthFieldKind;
  /** apiKey only */
  apiKeyName?: string;
  apiKeyIn?: "header" | "query" | "cookie";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function schemeNamesFromSecurity(security: unknown): string[] {
  if (!Array.isArray(security) || security.length === 0) return [];
  const names = new Set<string>();
  for (const req of security) {
    if (req && typeof req === "object") {
      for (const k of Object.keys(req as Record<string, unknown>)) {
        if (k) names.add(k);
      }
    }
  }
  return Array.from(names);
}

/**
 * Lists auth mechanisms the spec may require for this operation (union across OR branches).
 */
export function authHintsForOperation(
  securitySchemes: Record<string, unknown> | null | undefined,
  operationSecurity: unknown,
): AuthFieldHint[] {
  const names = schemeNamesFromSecurity(operationSecurity);
  const out: AuthFieldHint[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const def = securitySchemes?.[name];
    if (!isObject(def)) continue;
    const type = def.type;
    if (type === "http") {
      const scheme = String(def.scheme ?? "").toLowerCase();
      if (scheme === "bearer") {
        const key = `bearer:${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ schemeName: name, kind: "bearer" });
        }
      } else if (scheme === "basic") {
        const key = `basic:${name}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ schemeName: name, kind: "basic" });
        }
      }
    } else if (type === "apiKey") {
      const kn = typeof def.name === "string" ? def.name : "";
      const kinRaw = def.in;
      const apiKeyIn =
        kinRaw === "header" || kinRaw === "query" || kinRaw === "cookie"
          ? kinRaw
          : "header";
      const key = `apiKey:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          schemeName: name,
          kind: "apiKey",
          apiKeyName: kn || "api_key",
          apiKeyIn,
        });
      }
    }
  }

  return out;
}

export function authHintSummary(hints: AuthFieldHint[]): string {
  if (hints.length === 0) return "";
  const parts = hints.map((h) => {
    if (h.kind === "bearer") return `Bearer (${h.schemeName})`;
    if (h.kind === "basic") return `Basic (${h.schemeName})`;
    return `API key ${h.apiKeyName ?? ""} (${h.apiKeyIn})`;
  });
  return parts.join(" · ");
}
