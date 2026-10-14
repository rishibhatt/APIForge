/**
 * Upload Lab: a local API + OpenAPI spec for testing Run API with non-JSON requests and responses.
 *
 *   npm run upload-lab
 *   then paste http://127.0.0.1:4545/openapi.json into APIForge
 *
 * Every write endpoint echoes back what it received (method, Content-Type, query, parts, sizes),
 * so you can see exactly what APIForge sent.
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 4545);
const ORIGIN = `http://127.0.0.1:${PORT}`;

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
// Smallest valid one-page PDF
const PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
    "4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 20 40 Td (Upload Lab PDF) Tj ET\nendstream endobj\n" +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

const ok = { 200: { description: "Echo of what the server received" } };

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Upload Lab",
    version: "1.0.0",
    description: "Local test API for multipart, forms, raw files, binary responses, streams and query styles.",
  },
  servers: [{ url: ORIGIN }],
  paths: {
    "/upload": {
      post: {
        tags: ["Requests"],
        summary: "Multipart: file + file[] + text + JSON part (also accepts JSON)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["avatar", "title"],
                properties: {
                  title: { type: "string", example: "Holiday" },
                  avatar: { type: "string", format: "binary", description: "An image" },
                  gallery: { type: "array", items: { type: "string", format: "binary" } },
                  meta: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } },
                },
              },
              encoding: { avatar: { contentType: "image/png, image/jpeg" } },
            },
            "application/json": { schema: { type: "object", properties: { title: { type: "string" } } } },
          },
        },
        responses: ok,
      },
    },
    "/video": {
      post: {
        tags: ["Requests"],
        summary: "Multipart video upload",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["video"],
                properties: { video: { type: "string", format: "binary" }, caption: { type: "string" } },
              },
              encoding: { video: { contentType: "video/*" } },
            },
          },
        },
        responses: ok,
      },
    },
    "/form": {
      post: {
        tags: ["Requests"],
        summary: "URL-encoded form",
        requestBody: {
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["username"],
                properties: { username: { type: "string" }, remember: { type: "boolean" } },
              },
            },
          },
        },
        responses: ok,
      },
    },
    "/raw": {
      put: {
        tags: ["Requests"],
        summary: "Raw binary body (octet-stream)",
        requestBody: { content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
        responses: ok,
      },
    },
    "/xml": {
      post: {
        tags: ["Requests"],
        summary: "XML text body",
        requestBody: { content: { "application/xml": { schema: { type: "string" }, example: "<note><to>Ana</to></note>" } } },
        responses: ok,
      },
    },
    "/search": {
      get: {
        tags: ["Requests"],
        summary: "Query arrays, deepObject, cookie param",
        parameters: [
          { in: "query", name: "id", schema: { type: "array", items: { type: "integer" } }, example: [1, 2, 3] },
          { in: "query", name: "csv", explode: false, schema: { type: "array", items: { type: "string" } } },
          { in: "query", name: "filter", style: "deepObject", explode: true, schema: { type: "object" } },
          { in: "cookie", name: "session", schema: { type: "string" } },
        ],
        responses: ok,
      },
    },
    "/image.png": {
      get: { tags: ["Responses"], summary: "PNG response", responses: { 200: { description: "png", content: { "image/png": {} } } } },
    },
    "/report.pdf": {
      get: { tags: ["Responses"], summary: "PDF response", responses: { 200: { description: "pdf", content: { "application/pdf": {} } } } },
    },
    "/archive.zip": {
      get: { tags: ["Responses"], summary: "Download-only binary", responses: { 200: { description: "zip", content: { "application/zip": {} } } } },
    },
    "/events": {
      get: { tags: ["Responses"], summary: "Server-sent events (never ends)", responses: { 200: { description: "sse", content: { "text/event-stream": {} } } } },
    },
  },
};

async function echo(req, res, url, cors) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const ct = req.headers["content-type"] || "";
  let parts = null;
  if (ct.startsWith("multipart/")) {
    const fd = await new Request("http://x", { method: "POST", headers: { "content-type": ct }, body }).formData();
    parts = [];
    for (const [name, v] of fd.entries()) {
      parts.push(typeof v === "string" ? { name, value: v } : { name, file: v.name, type: v.type, size: v.size });
    }
  }
  const textual = /json|text|xml|urlencoded/.test(ct) && !ct.startsWith("multipart/");
  res.writeHead(200, { ...cors, "content-type": "application/json" });
  res.end(
    JSON.stringify(
      {
        method: req.method,
        path: url.pathname,
        contentType: ct,
        query: Object.fromEntries([...new Set(url.searchParams.keys())].map((k) => [k, url.searchParams.getAll(k)])),
        cookie: req.headers.cookie ?? null,
        bytes: body.length,
        text: textual ? body.toString() : undefined,
        parts,
      },
      null,
      2,
    ),
  );
}

http
  .createServer(async (req, res) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
      "access-control-expose-headers": "content-disposition, content-type, content-length",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    const url = new URL(req.url, ORIGIN);
    switch (url.pathname) {
      case "/openapi.json":
        return res.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify(spec, null, 2));
      // A Swagger UI page with a definition dropdown (two specs): tests docs-page discovery and the spec picker.
      case "/docs":
        return res.writeHead(200, { ...cors, "content-type": "text/html; charset=utf-8" }).end(`<!doctype html>
<html><head><title>Upload Lab docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"></head>
<body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>
  window.ui = SwaggerUIBundle({
    urls: [
      { url: "/openapi.json", name: "Upload Lab (full)" },
      { url: "/mini.json", name: "Mini API with a much longer definition name" },
    ],
    dom_id: "#swagger-ui",
  });
</script></body></html>`);
      case "/mini.json":
        return res.writeHead(200, { ...cors, "content-type": "application/json" }).end(
          JSON.stringify({
            openapi: "3.0.3",
            info: { title: "Mini API", version: "1.0.0" },
            servers: [{ url: ORIGIN }],
            paths: { "/image.png": spec.paths["/image.png"], "/form": spec.paths["/form"] },
          }),
        );
      case "/image.png":
        return res.writeHead(200, { ...cors, "content-type": "image/png" }).end(PNG);
      case "/report.pdf":
        return res
          .writeHead(200, { ...cors, "content-type": "application/pdf", "content-disposition": 'inline; filename="report.pdf"' })
          .end(PDF);
      case "/archive.zip":
        return res
          .writeHead(200, { ...cors, "content-type": "application/zip", "content-disposition": 'attachment; filename="archive.zip"' })
          .end(Buffer.from("PK\u0005\u0006" + "\0".repeat(18), "binary"));
      case "/events": {
        res.writeHead(200, { ...cors, "content-type": "text/event-stream", "cache-control": "no-cache" });
        let n = 0;
        const t = setInterval(() => res.write(`data: tick ${++n}\n\n`), 1000);
        req.on("close", () => clearInterval(t));
        return;
      }
      default:
        return echo(req, res, url, cors);
    }
  })
  .listen(PORT, () => console.log(`Upload Lab on ${ORIGIN}  →  paste ${ORIGIN}/openapi.json into APIForge`));
