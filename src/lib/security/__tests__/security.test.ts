import { describe, it } from "node:test";
import assert from "node:assert";
import { validateIpAddress } from "../ip-validation";
import {
  containsControlCharacters,
  isIpAddress,
  normalizeAndValidateMethod,
  resolveAndValidateDestination,
  validateUrlStructure,
} from "../url-validation";
import {
  redactSensitiveHeaders,
  sanitizeRequestHeaders,
} from "../header-sanitization";

describe("Security Layer 1 — Input & Method Validation", () => {
  it("should normalize and validate allowed HTTP methods", () => {
    assert.deepStrictEqual(normalizeAndValidateMethod("get"), {
      valid: true,
      method: "GET",
    });
    assert.deepStrictEqual(normalizeAndValidateMethod("POST"), {
      valid: true,
      method: "POST",
    });
    assert.deepStrictEqual(normalizeAndValidateMethod("delete"), {
      valid: true,
      method: "DELETE",
    });
  });

  it("should permanently reject prohibited methods TRACE and CONNECT", () => {
    assert.strictEqual(normalizeAndValidateMethod("TRACE").valid, false);
    assert.strictEqual(normalizeAndValidateMethod("CONNECT").valid, false);
    assert.strictEqual(normalizeAndValidateMethod("INVALID").valid, false);
  });

  it("should detect control characters to prevent header/CRLF injection", () => {
    assert.strictEqual(containsControlCharacters("https://example.com"), false);
    assert.strictEqual(containsControlCharacters("https://example.com\r\nHeader:bad"), true);
    assert.strictEqual(containsControlCharacters("Value\0WithNull"), true);
  });
});

describe("Security Layer 2 & 8 — URL & Port Validation", () => {
  it("should allow standard HTTP and HTTPS URLs and non-restricted ports", () => {
    const res1 = validateUrlStructure("https://api.github.com/users");
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.url?.hostname, "api.github.com");

    const res2 = validateUrlStructure("http://example.com:8080/api");
    assert.strictEqual(res2.valid, true);

    const res3 = validateUrlStructure("http://example.com:3001/api");
    assert.strictEqual(res3.valid, true);
  });

  it("should reject non-HTTP/HTTPS protocols", () => {
    const protocols = [
      "file:///etc/passwd",
      "ftp://example.com",
      "gopher://example.com",
      "data:text/plain;base64,SGVsbG8=",
      "javascript:alert(1)",
      "ws://example.com",
      "wss://example.com",
      "ssh://root@example.com",
    ];

    for (const url of protocols) {
      const res = validateUrlStructure(url);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.reason, "UNSUPPORTED_PROTOCOL");
    }
  });

  it("should block restricted database and internal infrastructure ports", () => {
    const blockedPorts = [22, 25, 53, 3306, 5432, 6379, 9200, 11211, 27017, 2375];
    for (const port of blockedPorts) {
      const res = validateUrlStructure(`http://example.com:${port}`);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.reason, "PORT_BLOCKED");
    }
  });
});

describe("Security Layer 3, 4 & 5 — Localhost, Private IP & Metadata Blocking", () => {
  it("should block loopback and localhost hostnames when loopback is disabled", () => {
    const loopbacks = [
      "http://localhost",
      "http://localhost:3000",
      "http://localhost.localdomain",
      "http://127.0.0.1",
      "http://0.0.0.0",
      "http://[::1]",
      "http://test.localhost",
      "http://127.0.0.1.nip.io",
    ];

    for (const url of loopbacks) {
      const res = validateUrlStructure(url, { allowLoopback: false });
      assert.strictEqual(res.valid, false, `Should block ${url}`);
      assert.strictEqual(res.reason, "LOOPBACK");
    }
  });

  it("should allow loopback and localhost hostnames when allowLoopback is true", () => {
    const res = validateUrlStructure("http://localhost:3000/api", { allowLoopback: true });
    assert.strictEqual(res.valid, true);
  });

  it("should correctly distinguish IP addresses from hostnames with isIpAddress", () => {
    assert.strictEqual(isIpAddress("127.0.0.1"), true);
    assert.strictEqual(isIpAddress("192.168.1.1"), true);
    assert.strictEqual(isIpAddress("::1"), true);
    assert.strictEqual(isIpAddress("[::1]"), true);
    assert.strictEqual(isIpAddress("2130706433"), true);
    assert.strictEqual(isIpAddress("0x7f000001"), true);

    // Domains/hostnames must NOT be classified as IP addresses
    assert.strictEqual(isIpAddress("b25e-112-196-16-34.ngrok-free.app"), false);
    assert.strictEqual(isIpAddress("api.github.com"), false);
    assert.strictEqual(isIpAddress("localhost"), false);
    assert.strictEqual(isIpAddress("example.com"), false);
  });

  it("should validate IPv4 private ranges and alternate representations", () => {
    // 127.0.0.1 Loopback
    assert.strictEqual(validateIpAddress("127.0.0.1").allowed, false);
    assert.strictEqual(validateIpAddress("127.0.0.1").reason, "LOOPBACK");
    assert.strictEqual(validateIpAddress("127.0.0.1", { allowLoopback: true }).allowed, true);

    // Decimal IP representation of 127.0.0.1 (2130706433)
    assert.strictEqual(validateIpAddress("2130706433").allowed, false);

    // Hex IP representation 0x7f000001
    assert.strictEqual(validateIpAddress("0x7f000001").allowed, false);

    // Private IPv4 ranges
    assert.strictEqual(validateIpAddress("10.0.0.1").reason, "PRIVATE_NETWORK");
    assert.strictEqual(validateIpAddress("172.16.0.1").reason, "PRIVATE_NETWORK");
    assert.strictEqual(validateIpAddress("192.168.1.1").reason, "PRIVATE_NETWORK");
    assert.strictEqual(validateIpAddress("100.64.0.1").reason, "PRIVATE_NETWORK");

    // Private ranges allowed when allowPrivateNetworks is true
    assert.strictEqual(validateIpAddress("192.168.1.1", { allowPrivateNetworks: true }).allowed, true);
    assert.strictEqual(validateIpAddress("10.0.0.1", { allowPrivateNetworks: true }).allowed, true);

    // Cloud Metadata 169.254.169.254 (ALWAYS blocked)
    assert.strictEqual(validateIpAddress("169.254.169.254").reason, "METADATA_ENDPOINT");
    assert.strictEqual(validateIpAddress("169.254.169.254", { allowPrivateNetworks: true, allowLoopback: true }).allowed, false);

    // Public IPs should be allowed
    assert.strictEqual(validateIpAddress("8.8.8.8").allowed, true);
    assert.strictEqual(validateIpAddress("1.1.1.1").allowed, true);
    assert.strictEqual(validateIpAddress("140.82.121.4").allowed, true);
  });

  it("should validate IPv6 loopback, unique-local, link-local, and mapped IPv4", () => {
    assert.strictEqual(validateIpAddress("::1").allowed, false);
    assert.strictEqual(validateIpAddress("::ffff:127.0.0.1").allowed, false);
    assert.strictEqual(validateIpAddress("::ffff:10.0.0.1").allowed, false);
    assert.strictEqual(validateIpAddress("fd00::1").allowed, false);
    assert.strictEqual(validateIpAddress("fe80::1").allowed, false);
    assert.strictEqual(validateIpAddress("fd00:ec2::254").allowed, false);
  });
});

describe("Security Layer 12, 13, 14 & 15 — Header Sanitization & Redaction", () => {
  it("should strip hop-by-hop and infrastructure headers", () => {
    const rawHeaders = {
      "Accept": "application/json",
      "Connection": "keep-alive",
      "Proxy-Authorization": "Basic xyz",
      "Host": "evil.com",
      "Cookie": "session=secret",
      "X-Forwarded-For": "1.2.3.4",
      "User-Agent": "APIForgeTest/1.0",
    };

    const res = sanitizeRequestHeaders(rawHeaders);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.cleanHeaders["Accept"], "application/json");
    assert.strictEqual(res.cleanHeaders["User-Agent"], "APIForgeTest/1.0");
    assert.strictEqual(res.cleanHeaders["Connection"], undefined);
    assert.strictEqual(res.cleanHeaders["Proxy-Authorization"], undefined);
    assert.strictEqual(res.cleanHeaders["Host"], undefined);
    assert.strictEqual(res.cleanHeaders["Cookie"], undefined);
    assert.strictEqual(res.cleanHeaders["X-Forwarded-For"], undefined);
  });

  it("should redact sensitive authorization and API key headers", () => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer token123",
      "X-API-Key": "secretKey456",
      "Cookie": "session=abc",
    };

    const redacted = redactSensitiveHeaders(headers);
    assert.strictEqual(redacted["Content-Type"], "application/json");
    assert.strictEqual(redacted["Authorization"], "[REDACTED]");
    assert.strictEqual(redacted["X-API-Key"], "[REDACTED]");
    assert.strictEqual(redacted["Cookie"], "[REDACTED]");
  });
});
