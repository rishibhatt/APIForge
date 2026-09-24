import dns from "dns";
import net from "net";
import {
  IpValidationOptions,
  parseIPv4ToUint32,
  validateIpAddress,
} from "./ip-validation";

export type UrlValidationReason =
  | "INVALID_URL"
  | "INVALID_IP"
  | "UNSUPPORTED_PROTOCOL"
  | "UNSUPPORTED_METHOD"
  | "CONTROL_CHARACTERS"
  | "LOOPBACK"
  | "PRIVATE_NETWORK"
  | "METADATA_ENDPOINT"
  | "PORT_BLOCKED"
  | "DNS_RESOLUTION_FAILED";

export interface TargetValidationResult {
  allowed: boolean;
  reason?: UrlValidationReason;
  message?: string;
  url?: URL;
  resolvedIps?: string[];
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const FORBIDDEN_METHODS = new Set(["TRACE", "CONNECT"]);

const DENIED_PORTS = new Set([
  22, // SSH
  23, // Telnet
  25, // SMTP
  53, // DNS
  110, // POP3
  143, // IMAP
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  9200, // Elasticsearch
  11211, // Memcached
  27017, // MongoDB
  2375, // Docker
  2376, // Docker SSL
  8500, // Consul
  9090, // Prometheus
  2181, // Zookeeper
  9092, // Kafka
  15672, // RabbitMQ
]);

const LOCALHOST_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

const METADATA_HOSTNAMES = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "169-254-169-254.nip.io",
]);

/**
 * Checks if a string represents an IPv4 / IPv6 address or numeric IP literal.
 */
export function isIpAddress(host: string): boolean {
  const clean = host.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (net.isIP(clean) !== 0) return true;
  if (/^\d+$/.test(clean) || /^0x[0-9a-fA-F]+$/i.test(clean)) {
    return parseIPv4ToUint32(clean) !== null;
  }
  return false;
}

/**
 * Checks if string contains control characters (\r, \n, \0, ASCII < 32 or 127-159)
 */
export function containsControlCharacters(str: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x1F\x7F-\x9F]/.test(str);
}

/**
 * Normalizes and validates HTTP Method.
 */
export function normalizeAndValidateMethod(methodStr: string): {
  valid: boolean;
  method: string;
} {
  const m = methodStr.trim().toUpperCase();
  if (FORBIDDEN_METHODS.has(m) || !ALLOWED_METHODS.has(m)) {
    return { valid: false, method: m };
  }
  return { valid: true, method: m };
}

/**
 * Synchronously checks preliminary URL security (schema, control chars, port, localhost string).
 */
export function validateUrlStructure(
  urlStr: string,
  options?: IpValidationOptions,
): {
  valid: boolean;
  url?: URL;
  reason?: UrlValidationReason;
  message?: string;
} {
  if (containsControlCharacters(urlStr)) {
    return {
      valid: false,
      reason: "CONTROL_CHARACTERS",
      message: "URL contains forbidden control characters",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return {
      valid: false,
      reason: "INVALID_URL",
      message: "Malformed target URL",
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    return {
      valid: false,
      reason: "UNSUPPORTED_PROTOCOL",
      message: `Protocol "${parsed.protocol}" is not supported. Only http: and https: are allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const allowLoopback = options?.allowLoopback ?? false;

  // Localhost check (skipped if loopback is explicitly allowed)
  if (!allowLoopback) {
    if (
      LOCALHOST_HOSTNAMES.has(hostname) ||
      hostname.endsWith(".localhost") ||
      (hostname.endsWith(".nip.io") && hostname.includes("127.0.0.1"))
    ) {
      return {
        valid: false,
        reason: "LOOPBACK",
        message: "Access to localhost/loopback destinations is prohibited.",
      };
    }
  }

  // Cloud metadata hostname check (always blocked for SSRF protection)
  if (METADATA_HOSTNAMES.has(hostname) || hostname.endsWith(".internal")) {
    return {
      valid: false,
      reason: "METADATA_ENDPOINT",
      message: "Access to cloud infrastructure metadata endpoints is prohibited.",
    };
  }

  // Port check
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : parsed.protocol === "https:"
      ? 443
      : 80;

  if (isNaN(port) || port < 1 || port > 65535) {
    return {
      valid: false,
      reason: "PORT_BLOCKED",
      message: `Invalid port "${parsed.port}".`,
    };
  }

  if (DENIED_PORTS.has(port)) {
    return {
      valid: false,
      reason: "PORT_BLOCKED",
      message: `Port ${port} is restricted for security reasons.`,
    };
  }

  return { valid: true, url: parsed };
}

/**
 * Resolves hostname via DNS and checks all returned IPs against private IP / loopback / metadata rules.
 */
export async function resolveAndValidateDestination(
  urlStr: string,
  options?: IpValidationOptions,
): Promise<TargetValidationResult> {
  const structCheck = validateUrlStructure(urlStr, options);
  if (!structCheck.valid || !structCheck.url) {
    return {
      allowed: false,
      reason: structCheck.reason,
      message: structCheck.message,
    };
  }

  const parsedUrl = structCheck.url;
  const rawHost = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");

  // If host is already an IP address, validate directly
  if (isIpAddress(rawHost) || rawHost.startsWith("[")) {
    const cleanIp = rawHost.replace(/^\[/, "").replace(/\]$/, "");
    const directIpCheck = validateIpAddress(cleanIp, options);
    if (!directIpCheck.allowed) {
      return {
        allowed: false,
        reason:
          directIpCheck.reason === "LOOPBACK"
            ? "LOOPBACK"
            : directIpCheck.reason === "METADATA_ENDPOINT"
              ? "METADATA_ENDPOINT"
              : directIpCheck.reason === "INVALID_IP"
                ? "INVALID_IP"
                : "PRIVATE_NETWORK",
        message: `Destination IP ${rawHost} is blocked (${directIpCheck.reason}).`,
        url: parsedUrl,
        resolvedIps: [cleanIp],
      };
    }
    return {
      allowed: true,
      url: parsedUrl,
      resolvedIps: [cleanIp],
    };
  }

  // Hostname DNS lookup
  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(rawHost, { all: true });
  } catch {
    return {
      allowed: false,
      reason: "DNS_RESOLUTION_FAILED",
      message: `Could not resolve hostname "${rawHost}".`,
      url: parsedUrl,
    };
  }

  if (!records || records.length === 0) {
    return {
      allowed: false,
      reason: "DNS_RESOLUTION_FAILED",
      message: `No IP addresses found for hostname "${rawHost}".`,
      url: parsedUrl,
    };
  }

  const resolvedIps: string[] = [];
  for (const record of records) {
    const ip = record.address;
    resolvedIps.push(ip);
    const ipCheck = validateIpAddress(ip, options);
    if (!ipCheck.allowed) {
      return {
        allowed: false,
        reason:
          ipCheck.reason === "LOOPBACK"
            ? "LOOPBACK"
            : ipCheck.reason === "METADATA_ENDPOINT"
              ? "METADATA_ENDPOINT"
              : "PRIVATE_NETWORK",
        message: `Destination hostname "${rawHost}" resolved to restricted IP ${ip} (${ipCheck.reason}).`,
        url: parsedUrl,
        resolvedIps,
      };
    }
  }

  return {
    allowed: true,
    url: parsedUrl,
    resolvedIps,
  };
}
