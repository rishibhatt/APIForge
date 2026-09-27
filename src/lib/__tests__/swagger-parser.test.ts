import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeAndStubMissingRefs } from "../sanitize-refs";

interface TestSchemaNode {
  $ref?: string;
  type?: string;
  description?: string;
}

interface TestDocStructure {
  paths: Record<string, {
    get: {
      responses: Record<string, {
        content: Record<string, {
          schema: TestSchemaNode;
        }>;
      }>;
    };
  }>;
}

describe("Swagger Parser — Resilient $ref Stubbing & Parsing Audit", () => {
  it("should replace missing local $ref pointers with safe fallback schemas", () => {
    const rawDoc: Record<string, unknown> = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/memberships": {
          get: {
            summary: "Get memberships",
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/adminMembershipOffering",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          existingSchema: {
            type: "string",
          },
        },
      },
    };

    const sanitized = sanitizeAndStubMissingRefs(rawDoc) as unknown as TestDocStructure;

    const getRespSchema = sanitized.paths["/memberships"].get.responses["200"].content["application/json"].schema;
    assert.strictEqual(getRespSchema.$ref, undefined);
    assert.strictEqual(getRespSchema.type, "object");
    assert.ok(getRespSchema.description?.includes("Unmodeled schema reference"));
  });

  it("should preserve valid local $ref pointers that exist in the document root", () => {
    const validDoc: Record<string, unknown> = {
      openapi: "3.0.0",
      info: { title: "Valid API", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    };

    const sanitized = sanitizeAndStubMissingRefs(validDoc) as unknown as TestDocStructure;

    const userSchema = sanitized.paths["/users"].get.responses["200"].content["application/json"].schema;
    assert.strictEqual(userSchema.$ref, "#/components/schemas/User");
  });
});
