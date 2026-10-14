import { describe, it } from "node:test";
import assert from "node:assert";
import { applyBodyContentType, applyQueryParams, buildRequestBody } from "../http/request-body";
import {
  binaryPreviewKind,
  downloadFileName,
  isStreamContentType,
  isTextContentType,
  readResponseBytes,
} from "../http/response-body";
import { bodyKindForMediaType, formFieldsFromBody, isFileSchema } from "../request-body-mode";
import { getRequestBodyInfo } from "../request-body-example";
import { queryString, serializeQueryRows } from "../query-params";
import type { Endpoint } from "@/types/api";

const ep = (over: Partial<Endpoint>): Endpoint => ({ id: "post:/x", method: "POST", path: "/x", ...over });

describe("Request bodies — media type to editor", () => {
  it("maps media types to body kinds", () => {
    assert.strictEqual(bodyKindForMediaType("application/json"), "json");
    assert.strictEqual(bodyKindForMediaType("application/vnd.api+json"), "json");
    assert.strictEqual(bodyKindForMediaType("multipart/form-data"), "multipart");
    assert.strictEqual(bodyKindForMediaType("multipart/mixed"), "multipart");
    assert.strictEqual(bodyKindForMediaType("application/x-www-form-urlencoded"), "form");
    assert.strictEqual(bodyKindForMediaType("application/xml"), "text");
    assert.strictEqual(bodyKindForMediaType("text/csv"), "text");
    assert.strictEqual(bodyKindForMediaType("application/octet-stream"), "binary");
    assert.strictEqual(bodyKindForMediaType("image/png"), "binary");
    assert.strictEqual(bodyKindForMediaType("video/*"), "binary");
    assert.strictEqual(bodyKindForMediaType("application/pdf"), "binary");
  });

  it("detects file schemas across OpenAPI versions", () => {
    assert.ok(isFileSchema({ type: "string", format: "binary" }));
    assert.ok(isFileSchema({ type: "file" }));
    assert.ok(isFileSchema({ type: "string", contentMediaType: "image/png" }));
    assert.ok(!isFileSchema({ type: "string", format: "byte" }));
    assert.ok(!isFileSchema({ type: "string" }));
  });

  it("OpenAPI 3 multipart: file, file array, JSON part with encoding, text field", () => {
    const endpoint = ep({
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["avatar", "title"],
              properties: {
                title: { type: "string", example: "Holiday" },
                avatar: { type: "string", format: "binary" },
                gallery: { type: "array", items: { type: "string", format: "binary" } },
                meta: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } },
                id: { type: "integer", readOnly: true },
              },
            },
            encoding: { avatar: { contentType: "image/png, image/jpeg" } },
          },
          "application/json": { schema: { type: "object" } },
        },
      },
    });
    const info = getRequestBodyInfo(endpoint, "multipart/form-data")!;
    assert.deepStrictEqual(info.mediaTypes, ["application/json", "multipart/form-data"]);
    const fields = formFieldsFromBody(info);
    assert.deepStrictEqual(
      fields.map((f) => [f.name, f.kind, f.multiple, f.required]),
      [
        ["avatar", "file", false, true],
        ["title", "text", false, true],
        ["gallery", "file", true, false],
        ["meta", "text", false, false],
      ],
    );
    assert.strictEqual(fields.find((f) => f.name === "avatar")!.accept, "image/png, image/jpeg");
    assert.strictEqual(fields.find((f) => f.name === "title")!.value, "Holiday");
    assert.strictEqual(fields.find((f) => f.name === "meta")!.contentType, "application/json");
  });

  it("Swagger 2 formData with type: file becomes multipart", () => {
    const info = getRequestBodyInfo(
      ep({
        parameters: [
          { in: "formData", name: "file", type: "file", required: true },
          { in: "formData", name: "note", type: "string" },
        ],
      }),
    )!;
    assert.strictEqual(info.mediaType, "multipart/form-data");
    assert.deepStrictEqual(formFieldsFromBody(info).map((f) => f.kind), ["file", "text"]);
  });

  it("Swagger 2 formData without files stays urlencoded", () => {
    const info = getRequestBodyInfo(ep({ parameters: [{ in: "formData", name: "a", type: "string" }] }))!;
    assert.strictEqual(info.mediaType, "application/x-www-form-urlencoded");
  });
});

describe("Request bodies — building the HTTP body", () => {
  it("multipart: FormData with files and typed JSON part; Content-Type removed for the boundary", async () => {
    const png = new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" });
    const built = buildRequestBody(
      {
        url: "https://x.io",
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        bodyKind: "multipart",
        formParts: [
          { name: "title", value: "Hi" },
          { name: "meta", value: '{"a":1}', contentType: "application/json" },
          { name: "avatar", fileIndex: 0, fileName: "a.png" },
        ],
      },
      [png],
    );
    assert.ok(built.body instanceof FormData);
    assert.strictEqual(built.contentType, null);
    const fd = built.body as FormData;
    assert.strictEqual(fd.get("title"), "Hi");
    const avatar = fd.get("avatar") as File;
    assert.strictEqual(avatar.name, "a.png");
    assert.strictEqual(avatar.size, 4);
    assert.strictEqual((fd.get("meta") as Blob).type, "application/json");

    const headers = new Headers({ "Content-Type": "multipart/form-data" });
    applyBodyContentType(headers, built);
    assert.strictEqual(headers.get("content-type"), null);

    // What actually goes on the wire carries a boundary.
    const wire = new Request("https://x.io", { method: "POST", body: built.body });
    assert.match(wire.headers.get("content-type") ?? "", /^multipart\/form-data; boundary=/);
  });

  it("urlencoded: a=1&b=two%20words", () => {
    const built = buildRequestBody({
      url: "https://x.io",
      method: "POST",
      bodyKind: "form",
      formParts: [
        { name: "a", value: "1" },
        { name: "b", value: "two words" },
      ],
    });
    assert.strictEqual(built.body, "a=1&b=two+words");
    assert.strictEqual(built.contentType, "application/x-www-form-urlencoded");
  });

  it("binary: raw file body with its own type", () => {
    const vid = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    const built = buildRequestBody({ url: "https://x.io", method: "PUT", bodyKind: "binary", binaryFileIndex: 0 }, [vid]);
    assert.strictEqual(built.body, vid);
    assert.strictEqual(built.contentType, "video/mp4");
    assert.strictEqual(built.size, 10);
  });

  it("json stays the default", () => {
    const built = buildRequestBody({ url: "https://x.io", method: "POST", body: { a: 1 } });
    assert.strictEqual(built.body, '{"a":1}');
    assert.strictEqual(built.contentType, "application/json");
  });

  it("missing file reference fails clearly", () => {
    assert.throws(() =>
      buildRequestBody({ url: "https://x.io", method: "POST", bodyKind: "multipart", formParts: [{ name: "f", fileIndex: 2 }] }),
    );
  });
});

describe("Query parameters — OpenAPI style and explode", () => {
  const row = (key: string, value: string) => ({ key, value, enabled: true });

  it("array, OAS3 default form+explode: repeated keys", () => {
    const q = serializeQueryRows([row("id", "1, 2,3")], { id: { in: "query", schema: { type: "array" } } });
    assert.deepStrictEqual(q, { id: ["1", "2", "3"] });
    assert.strictEqual(queryString(q), "?id=1&id=2&id=3");
  });

  it("array, explode false / pipeDelimited / Swagger 2 csv default", () => {
    assert.deepStrictEqual(
      serializeQueryRows([row("id", "[1,2]")], { id: { schema: { type: "array" }, explode: false } }),
      { id: "1,2" },
    );
    assert.deepStrictEqual(
      serializeQueryRows([row("id", "1,2")], { id: { schema: { type: "array" }, style: "pipeDelimited", explode: false } }),
      { id: "1|2" },
    );
    assert.deepStrictEqual(serializeQueryRows([row("id", "1,2")], { id: { type: "array" } }), { id: "1,2" });
    assert.deepStrictEqual(
      serializeQueryRows([row("id", "1,2")], { id: { type: "array", collectionFormat: "multi" } }),
      { id: ["1", "2"] },
    );
  });

  it("object, deepObject: filter[name]=a", () => {
    assert.deepStrictEqual(
      serializeQueryRows([row("filter", '{"name":"a","age":3}')], {
        filter: { schema: { type: "object" }, style: "deepObject", explode: true },
      }),
      { "filter[name]": "a", "filter[age]": "3" },
    );
  });

  it("same key on two rows: repeated", () => {
    assert.deepStrictEqual(serializeQueryRows([row("tag", "a"), row("tag", "b")]), { tag: ["a", "b"] });
  });

  it("applyQueryParams appends repeated values", () => {
    const u = new URL("https://x.io/p?keep=1");
    applyQueryParams(u, { id: ["1", "2"], q: "x" });
    assert.strictEqual(u.search, "?keep=1&id=1&id=2&q=x");
  });
});

describe("Responses — text, binary and streams", () => {
  it("classifies content types", () => {
    assert.ok(isTextContentType("application/json; charset=utf-8"));
    assert.ok(isTextContentType("application/problem+json"));
    assert.ok(isTextContentType("text/html"));
    assert.ok(isTextContentType("image/svg+xml"));
    assert.ok(isTextContentType(""));
    assert.ok(!isTextContentType("image/png"));
    assert.ok(!isTextContentType("application/pdf"));
    assert.ok(!isTextContentType("application/octet-stream"));
    assert.ok(isStreamContentType("text/event-stream"));
    assert.strictEqual(binaryPreviewKind("video/mp4"), "video");
    assert.strictEqual(binaryPreviewKind("application/zip"), "none");
  });

  it("download name from Content-Disposition, else from the type", () => {
    assert.strictEqual(downloadFileName('attachment; filename="report.pdf"', "application/pdf"), "report.pdf");
    assert.strictEqual(downloadFileName(undefined, "image/png"), "response.png");
    assert.strictEqual(downloadFileName(undefined, "application/x-zip"), "response.zip");
  });

  it("caps non-stream bodies and cuts streams after the window", async () => {
    const big = new Response(new Uint8Array(100), { headers: { "content-type": "image/png" } });
    assert.deepStrictEqual(await readResponseBytes(big, { maxBytes: 10, streamWindowMs: 50 }), { kind: "too-large", limit: 10 });

    const enc = new TextEncoder();
    const sse = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode("data: one\n\n"));
        // never closes, like a live SSE feed
      },
    });
    const res = new Response(sse, { headers: { "content-type": "text/event-stream" } });
    const out = await readResponseBytes(res, { maxBytes: 1024, streamWindowMs: 100 });
    assert.strictEqual(out.kind, "ok");
    if (out.kind === "ok") {
      assert.strictEqual(out.truncated, true);
      assert.strictEqual(new TextDecoder().decode(out.bytes), "data: one\n\n");
    }
  });
});
