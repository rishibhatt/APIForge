import { describe, it } from "node:test";
import assert from "node:assert";
import { extractTypeScriptBlock } from "../output";
import { assembleIdePrompt } from "@/lib/groq-prompts";
import {
  buildCrispOperation,
  buildOperationContract,
  operationTypeBase,
  describeAuth,
} from "../operation-context";
import type { Endpoint } from "@/types/api";

describe("extractTypeScriptBlock", () => {
  it("keeps one fenced block and drops prose", () => {
    const out = extractTypeScriptBlock(
      "Sure! Here you go:\n```ts\nexport interface Pet { id: number }\n```\nHope this helps.",
    );
    assert.strictEqual(out, "```typescript\nexport interface Pet { id: number }\n```");
  });

  it("joins multiple blocks into one", () => {
    const out = extractTypeScriptBlock(
      "```typescript\nexport type A = string;\n```\ntext\n```typescript\nexport type B = number;\n```",
    );
    assert.strictEqual(out.match(/```/g)?.length, 2);
    assert.ok(out.includes("type A") && out.includes("type B"));
  });

  it("wraps unfenced code and trims leading and trailing prose", () => {
    const out = extractTypeScriptBlock(
      "Here is the code\nexport interface X {\n  a: string;\n}\n",
    );
    assert.strictEqual(out, "```typescript\nexport interface X {\n  a: string;\n}\n```");
  });

  it("strips <think> blocks and ignores non-TS fences", () => {
    const out = extractTypeScriptBlock(
      "<think>hmm</think>\n```json\n{\"a\":1}\n```\n```typescript\nexport type T = 1;\n```",
    );
    assert.ok(!out.includes("hmm") && !out.includes('{"a"'));
    assert.ok(out.includes("export type T"));
  });

  it("handles an unterminated fence", () => {
    const out = extractTypeScriptBlock("```typescript\nexport type T = 1;");
    assert.strictEqual(out, "```typescript\nexport type T = 1;\n```");
  });

  it("returns a placeholder when there is no code", () => {
    assert.ok(extractTypeScriptBlock("I cannot help").includes("No TypeScript"));
  });
});

describe("operation-context", () => {
  const ep: Endpoint = {
    id: "1",
    method: "POST",
    path: "/pet/{petId}/photos",
    summary: "Upload",
    security: [{ petstore_auth: ["write:pets"] }],
    parameters: [
      { name: "petId", in: "path", required: true, schema: { type: "integer", format: "int64" }, description: "Pet id" },
      { name: "tag", in: "query", schema: { type: "string" } },
    ],
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
    },
    responses: { "200": { description: "ok" }, "404": { description: "missing" } },
  };

  it("derives stable type names", () => {
    assert.strictEqual(operationTypeBase({ method: "POST", path: "/pet" }), "PostPet");
    assert.strictEqual(operationTypeBase(ep), "PostPetByPetIdPhotos");
  });

  it("renders a deterministic contract with params table and status codes", () => {
    const md = buildOperationContract(ep, { securitySchemes: { petstore_auth: { type: "oauth2" } } });
    assert.ok(md.includes("| `petId` | path | integer (int64) | yes | Pet id |"));
    assert.ok(md.includes("| `tag` | query | string | no | Not specified in the spec |"));
    assert.ok(md.includes("`404`: missing"));
    assert.ok(md.includes("petstore_auth (oauth2; scopes: write:pets)"));
  });

  it("reports unspecified auth", () => {
    assert.strictEqual(describeAuth({ ...ep, security: undefined }), "Not specified in the spec");
  });

  it("renders a crisp endpoint block without schema JSON or filler", () => {
    const md = buildCrispOperation(ep);
    assert.ok(md.startsWith("### POST `/pet/{petId}/photos`: Upload"));
    assert.ok(md.includes("`petId` (path, integer (int64), required). Pet id"));
    assert.ok(md.includes("`tag` (query, string, optional)"));
    assert.ok(md.includes("shape in `PostPetByPetIdPhotosRequest.body`"));
    assert.ok(md.includes("- Errors: `404` missing"));
    assert.ok(!md.includes("Not specified") && !md.includes("{\""));
  });
});

describe("assembleIdePrompt", () => {
  const types = "```typescript\nexport interface Pet { id: number }\n```";
  const getPet: Endpoint = {
    id: "g",
    method: "GET",
    path: "/pet/{petId}",
    summary: "Find pet by ID",
    security: [{ api_key: [] }],
    parameters: [{ name: "petId", in: "path", required: true, schema: { type: "integer" } }],
    responses: {
      "200": { description: "ok", content: { "application/json": { schema: { type: "object" } } } },
      "404": { description: "Pet not found" },
    },
  };
  const meta = {
    specTitle: "Petstore",
    serverUrls: ["https://petstore3.swagger.io/api/v3"],
    securitySchemes: { api_key: { type: "apiKey", in: "header", name: "api_key" } },
  };

  it("builds a single-endpoint prompt with only the relevant facts", () => {
    const out = assembleIdePrompt([getPet], types, meta);
    const headings = out.split("\n").filter((l) => /^#{1,2} /.test(l));
    assert.deepStrictEqual(headings, ["# Task", "## API", "## Endpoint", "## Types", "## Rules"]);
    assert.ok(out.includes("Integrate `GET /pet/{petId}` from Petstore"));
    assert.ok(out.includes("- Base URL: `https://petstore3.swagger.io/api/v3`"));
    assert.ok(out.includes("- Auth: api_key (apiKey header api_key)"));
    assert.ok(out.includes("- Success: `200` `GetPetByPetIdResponse`"));
    assert.ok(out.includes("handle `404` explicitly"));
    assert.ok(out.includes("export interface Pet"));
    assert.ok(!out.includes("Not specified"));
  });

  it("covers every endpoint for a collection and lists auth per endpoint when it differs", () => {
    const listPets: Endpoint = { id: "l", method: "GET", path: "/pet", security: [], responses: { "200": { description: "ok" } } };
    const out = assembleIdePrompt([getPet, listPets], types, meta);
    assert.ok(out.includes("Integrate these 2 endpoints"));
    assert.ok(out.includes("## Endpoints"));
    assert.ok(out.includes("### GET `/pet`"));
    assert.ok(out.includes("- Auth: None (operation is explicitly public)"));
    assert.ok(out.includes("- Success: `200` no body"));
  });

  it("asks instead of guessing when the base URL is missing", () => {
    const out = assembleIdePrompt([getPet], types, { specTitle: "Petstore" });
    assert.ok(out.includes("- Base URL: not in the spec, ask me"));
  });
});
