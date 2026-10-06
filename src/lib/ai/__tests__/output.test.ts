import { describe, it } from "node:test";
import assert from "node:assert";
import { extractTypeScriptBlock, normalizePromptMarkdown } from "../output";
import {
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

describe("normalizePromptMarkdown", () => {
  const overrides = { context: "- API name: Petstore\n- Base URL: Not specified in the spec", contract: "CONTRACT BODY" };

  it("orders the six sections, strips preamble and fences, injects deterministic parts", () => {
    const raw =
      "Here is your prompt:\n```markdown\n# Task\nBuild a client.\n## Types\n```typescript\nexport interface A {}\n```\n## Requirements\n- handle 404\n## Acceptance criteria\n- [ ] works\n```";
    const out = normalizePromptMarkdown(raw, overrides);
    const headings = out.split("\n").filter((l) => /^#{1,2} /.test(l));
    assert.deepStrictEqual(headings, [
      "# Task",
      "## Context",
      "## Endpoint contract",
      "## Types",
      "## Requirements",
      "## Acceptance criteria",
    ]);
    assert.ok(out.includes("- API name: Petstore"));
    assert.ok(out.includes("CONTRACT BODY"));
    assert.ok(out.includes("export interface A"));
    assert.ok(!out.includes("Here is your prompt"));
  });

  it("overrides model-written context/contract and fills missing sections", () => {
    const out = normalizePromptMarkdown(
      "# Task\nDo it\n\n## Context\nmade up\n\n## Endpoint contract\ninvented endpoint",
      overrides,
    );
    assert.ok(!out.includes("made up") && !out.includes("invented endpoint"));
    assert.ok(out.includes("## Types\n\nNot specified in the spec."));
    assert.ok(out.includes("## Acceptance criteria\n\nNot specified in the spec."));
  });

  it("does not treat headings inside code fences as sections", () => {
    const out = normalizePromptMarkdown(
      "# Task\nx\n## Types\n```typescript\n// ## Requirements\nexport type A = 1;\n```\n## Requirements\n- r\n## Acceptance criteria\n- [ ] a",
      overrides,
    );
    assert.ok(out.includes("// ## Requirements"));
    assert.strictEqual(out.match(/^## Requirements$/gm)?.length, 1);
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
});
