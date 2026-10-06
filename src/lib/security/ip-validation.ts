import net from "net";

export interface IpValidationOptions {
  allowLoopback?: boolean;
  allowPrivateNetworks?: boolean;
}

export interface IpValidationResult {
  allowed: boolean;
  reason?: "PRIVATE_NETWORK" | "LOOPBACK" | "METADATA_ENDPOINT" | "INVALID_IP";
  ip: string;
}

/**
 * Parse a string IP or numeric representation (decimal/hex) into a standard IPv4 32-bit unsigned integer.
 */
export function parseIPv4ToUint32(ipStr: string): number | null {
  const clean = ipStr.trim();
  if (!clean) return null;

  // Single decimal string (e.g. "2130706433" -> 127.0.0.1)
  if (/^\d+$/.test(clean)) {
    const val = Number(clean);
    if (val >= 0 && val <= 0xffffffff) {
      return val >>> 0;
    }
    return null;
  }

  // Hexadecimal notation (e.g. "0x7f000001")
  if (/^0x[0-9a-fA-F]+$/i.test(clean)) {
    const val = Number(clean);
    if (val >= 0 && val <= 0xffffffff) {
      return val >>> 0;
    }
    return null;
  }

  // Dotted decimal or octal notation (e.g. "127.0.0.1", "0177.0.0.1")
  const parts = clean.split(".");
  if (parts.length !== 4) return null;

  let u32 = 0;
  for (let i = 0; i < 4; i++) {
    const part = parts[i]!;
    let num: number;
    if (/^0[0-7]+$/.test(part)) {
      num = parseInt(part, 8);
    } else if (/^\d+$/.test(part)) {
      num = parseInt(part, 10);
    } else {
      return null;
    }

    if (isNaN(num) || num < 0 || num > 255) {
      return null;
    }
    u32 = (u32 << 8) | num;
  }

  return u32 >>> 0;
}

function ipv4InCidr(ipU32: number, cidrBaseStr: string, prefixLen: number): boolean {
  const baseU32 = parseIPv4ToUint32(cidrBaseStr);
  if (baseU32 === null) return false;
  if (prefixLen === 0) return true;
  const mask = ((0xffffffff << (32 - prefixLen)) >>> 0);
  return (ipU32 & mask) === (baseU32 & mask);
}

const IPV4_BLOCKED_RANGES: { cidr: string; prefix: number; reason: "LOOPBACK" | "PRIVATE_NETWORK" | "METADATA_ENDPOINT" }[] = [
  { cidr: "127.0.0.0", prefix: 8, reason: "LOOPBACK" },
  { cidr: "10.0.0.0", prefix: 8, reason: "PRIVATE_NETWORK" },
  { cidr: "172.16.0.0", prefix: 12, reason: "PRIVATE_NETWORK" },
  { cidr: "192.168.0.0", prefix: 16, reason: "PRIVATE_NETWORK" },
  { cidr: "169.254.0.0", prefix: 16, reason: "METADATA_ENDPOINT" }, // Cloud metadata & link-local
  { cidr: "100.64.0.0", prefix: 10, reason: "PRIVATE_NETWORK" }, // Carrier-grade NAT
  { cidr: "198.18.0.0", prefix: 15, reason: "PRIVATE_NETWORK" }, // Benchmarking
  { cidr: "0.0.0.0", prefix: 8, reason: "LOOPBACK" },
  { cidr: "224.0.0.0", prefix: 4, reason: "PRIVATE_NETWORK" }, // Multicast
  { cidr: "240.0.0.0", prefix: 4, reason: "PRIVATE_NETWORK" }, // Reserved
  { cidr: "255.255.255.255", prefix: 32, reason: "PRIVATE_NETWORK" },
];

/**
 * Expand an IPv6 literal (optionally with zone id / embedded dotted IPv4 tail) into 8 hextets.
 * Handles non-canonical spellings such as "0:0:0:0:0:0:0:1" or "0:0:0:0:0:ffff:7f00:1".
 */
function expandIPv6(ip: string): number[] | null {
  let s = ip.split("%")[0]!;
  const tail: number[] = [];
  const lastColon = s.lastIndexOf(":");
  const maybeV4 = s.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    const u32 = parseIPv4ToUint32(maybeV4);
    if (u32 === null) return null;
    tail.push((u32 >>> 16) & 0xffff, u32 & 0xffff);
    s = s.slice(0, lastColon + 1) + "0";
    // the placeholder "0" is replaced by the two IPv4 hextets below
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) =>
    part === "" ? [] : part.split(":").map((h) => parseInt(h, 16));
  const head = parse(halves[0]!);
  const rest = halves.length === 2 ? parse(halves[1]!) : [];
  if (tail.length) {
    const target = halves.length === 2 ? rest : head;
    target.pop();
    target.push(...tail);
  }
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 ? fill !== 0 : fill < 0) return null;
  const out = [...head, ...new Array<number>(fill).fill(0), ...rest];
  if (out.length !== 8 || out.some((h) => !Number.isInteger(h) || h < 0 || h > 0xffff)) {
    return null;
  }
  return out;
}

function embeddedV4(high: number, low: number): string {
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

/**
 * Validates whether an IP string (IPv4 or IPv6) is a public, non-internal IP address.
 */
export function validateIpAddress(
  ip: string,
  options?: IpValidationOptions,
): IpValidationResult {
  const normalized = ip.trim().toLowerCase();
  const allowLoopback = options?.allowLoopback ?? false;
  const allowPrivate = options?.allowPrivateNetworks ?? false;

  if (net.isIPv4(normalized) || parseIPv4ToUint32(normalized) !== null) {
    const u32 = parseIPv4ToUint32(normalized);
    if (u32 === null) {
      return { allowed: false, reason: "INVALID_IP", ip };
    }

    for (const range of IPV4_BLOCKED_RANGES) {
      if (ipv4InCidr(u32, range.cidr, range.prefix)) {
        if (range.reason === "LOOPBACK" && allowLoopback) {
          continue;
        }
        if (range.reason === "PRIVATE_NETWORK" && allowPrivate) {
          continue;
        }
        return { allowed: false, reason: range.reason, ip };
      }
    }

    return { allowed: true, ip };
  }

  if (net.isIPv6(normalized)) {
    const h = expandIPv6(normalized);
    if (h) {
      const zeroPrefix = (n: number) => h.slice(0, n).every((x) => x === 0);
      // ::  and ::1 in any spelling
      if (zeroPrefix(7) && (h[7] === 0 || h[7] === 1)) {
        return allowLoopback ? { allowed: true, ip } : { allowed: false, reason: "LOOPBACK", ip };
      }
      // IPv4-mapped ::ffff:a.b.c.d and deprecated IPv4-compatible ::a.b.c.d
      if (zeroPrefix(5) && (h[5] === 0xffff || h[5] === 0)) {
        return validateIpAddress(embeddedV4(h[6]!, h[7]!), options);
      }
      // NAT64 well-known prefix 64:ff9b::/96 routes to the embedded IPv4 on NAT64 networks
      if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
        return validateIpAddress(embeddedV4(h[6]!, h[7]!), options);
      }
      // 6to4 2002:AABB:CCDD::/48 embeds an IPv4 address
      if (h[0] === 0x2002) {
        const v4 = validateIpAddress(embeddedV4(h[1]!, h[2]!), options);
        if (!v4.allowed) return { ...v4, ip };
      }
      // Multicast ff00::/8 and deprecated site-local fec0::/10
      if ((h[0]! & 0xff00) === 0xff00 || (h[0]! & 0xffc0) === 0xfec0) {
        return allowPrivate ? { allowed: true, ip } : { allowed: false, reason: "PRIVATE_NETWORK", ip };
      }
    }

    // Check loopback ::1 / ::
    if (normalized === "::1" || normalized === "::") {
      if (allowLoopback) {
        return { allowed: true, ip };
      }
      return { allowed: false, reason: "LOOPBACK", ip };
    }

    // Check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (normalized.startsWith("::ffff:")) {
      const v4Part = normalized.substring(7);
      if (net.isIPv4(v4Part) || parseIPv4ToUint32(v4Part) !== null) {
        return validateIpAddress(v4Part, options);
      }
      // Hex IPv4-mapped
      const hexParts = v4Part.split(":");
      if (hexParts.length === 2) {
        const high = parseInt(hexParts[0]!, 16);
        const low = parseInt(hexParts[1]!, 16);
        if (!isNaN(high) && !isNaN(low)) {
          const u32 = ((high << 16) | low) >>> 0;
          const dotted = `${(u32 >> 24) & 255}.${(u32 >> 16) & 255}.${(u32 >> 8) & 255}.${u32 & 255}`;
          return validateIpAddress(dotted, options);
        }
      }
    }

    // Unique Local fc00::/7 (fc00:: to fdff:ffff:...)
    if (/^(fc|fd)/i.test(normalized)) {
      // Check AWS IPv6 metadata: fd00:ec2::254
      if (normalized.includes("ec2::254") || normalized.includes("169:254")) {
        return { allowed: false, reason: "METADATA_ENDPOINT", ip };
      }
      if (allowPrivate) {
        return { allowed: true, ip };
      }
      return { allowed: false, reason: "PRIVATE_NETWORK", ip };
    }

    // Link Local fe80::/10 (fe80:: to febf::)
    if (/^fe[89ab]/i.test(normalized)) {
      if (allowPrivate) {
        return { allowed: true, ip };
      }
      return { allowed: false, reason: "PRIVATE_NETWORK", ip };
    }

    return { allowed: true, ip };
  }

  return { allowed: false, reason: "INVALID_IP", ip };
}
