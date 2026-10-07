/**
 * Turns a raw spec-parse failure (client validation, /api/swagger/parse error string, network error)
 * into something a person can act on: what failed, and how to fix it.
 */
export interface ParseErrorInfo {
  /** Short sentence: what went wrong. */
  title: string;
  /** How to fix it. */
  fix: string;
  /** The original message, kept for the curious (shown muted). */
  raw: string;
}

const RAW_LINK_FIX =
  "Paste the raw spec link instead: open the docs page, look for the openapi.json or swagger.json link (often /openapi.json, /swagger.json, /v3/api-docs or /v2/swagger.json) and use that URL.";

export function describeParseError(rawMessage: string): ParseErrorInfo {
  const raw = rawMessage.trim() || "Parse failed";
  const m = raw.toLowerCase();

  if (m.startsWith("enter a url")) {
    return { title: "Paste a spec URL first.", fix: "Use a link to an OpenAPI 3 or Swagger 2 document, e.g. https://api.example.com/openapi.json.", raw };
  }
  if (m.includes("not look like a valid url") || m === "invalid url" || m.includes("must include a hostname")) {
    return { title: "That isn't a valid URL.", fix: "Include the scheme and host, e.g. https://api.example.com/openapi.json.", raw };
  }
  if (m.includes("only http") ) {
    return { title: "Only http:// and https:// links are supported.", fix: "Use a web URL for the spec. For a local file, host it or paste its public raw link.", raw };
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return { title: "Too many parse requests in a short time.", fix: "Wait a minute, then try again.", raw };
  }
  if (m.includes("could not resolve hostname") || m.includes("enotfound") || m.includes("getaddrinfo")) {
    return { title: "The host in this URL could not be found.", fix: "Check the domain for typos. Hosts that only exist on your private network can't be reached from APIForge.", raw };
  }
  if (m.includes("loopback") || m.includes("restricted ip") || m.includes("metadata endpoint") || m.includes("not permitted for security") || m.includes("private")) {
    return { title: "This address is blocked by APIForge's network safety rules.", fix: "Localhost, private-network and cloud-metadata addresses can't be fetched here. Use a publicly reachable spec URL.", raw };
  }
  if (m.includes("timed out") || m.includes("timeout")) {
    return { title: "The server took too long to send the spec.", fix: "Check that the URL opens in your browser, then try again. Very large specs may need a direct raw link.", raw };
  }
  if (m.includes("could not connect") || m.includes("econnrefused") || m.includes("failed to fetch") || m.includes("network")) {
    return { title: "Couldn't connect to that server.", fix: "Make sure the URL is publicly reachable and opens in your browser.", raw };
  }
  if (m.includes("exceeds") && m.includes("mb")) {
    return { title: "The spec is too large to fetch.", fix: "Split the spec, or point at a smaller per-service document.", raw };
  }
  if (/http 40[13]\b/.test(m) || m.includes("unauthorized") || m.includes("forbidden")) {
    return { title: "The server refused to share the spec (authentication required).", fix: "APIForge fetches specs without credentials. Use a publicly accessible spec URL.", raw };
  }
  if (/http 404\b/.test(m) || m.includes("not found")) {
    return { title: "Nothing was found at that URL (404).", fix: RAW_LINK_FIX, raw };
  }
  if (
    m.includes("is not a valid json schema") ||
    m.includes("invalid openapi document") ||
    m.includes("unexpected token") ||
    m.includes("swagger ui page") ||
    m.includes("not a valid openapi") ||
    m.includes("is not a valid") ||
    m.includes("yaml")
  ) {
    return { title: "This URL returned a web page, not an OpenAPI spec.", fix: RAW_LINK_FIX, raw };
  }
  if (m.includes("no endpoints") || m.includes("no operations")) {
    return { title: "The spec loaded, but it has no operations.", fix: "Check that the document defines paths. Some docs pages load several specs; paste the link to the one you need.", raw };
  }
  return { title: "Couldn't load this spec.", fix: RAW_LINK_FIX, raw };
}
