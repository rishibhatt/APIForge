import net from "net";

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
 * Validates whether an IP string (IPv4 or IPv6) is a public, non-internal IP address.
 */
export function validateIpAddress(ip: string): IpValidationResult {
  const normalized = ip.trim().toLowerCase();

  if (net.isIPv4(normalized) || parseIPv4ToUint32(normalized) !== null) {
    const u32 = parseIPv4ToUint32(normalized);
    if (u32 === null) {
      return { allowed: false, reason: "INVALID_IP", ip };
    }

    for (const range of IPV4_BLOCKED_RANGES) {
      if (ipv4InCidr(u32, range.cidr, range.prefix)) {
        return { allowed: false, reason: range.reason, ip };
      }
    }

    return { allowed: true, ip };
  }

  if (net.isIPv6(normalized)) {
    // Check loopback ::1 / ::
    if (normalized === "::1" || normalized === "::") {
      return { allowed: false, reason: "LOOPBACK", ip };
    }

    // Check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (normalized.startsWith("::ffff:")) {
      const v4Part = normalized.substring(7);
      if (net.isIPv4(v4Part) || parseIPv4ToUint32(v4Part) !== null) {
        return validateIpAddress(v4Part);
      }
      // Hex IPv4-mapped
      const hexParts = v4Part.split(":");
      if (hexParts.length === 2) {
        const high = parseInt(hexParts[0]!, 16);
        const low = parseInt(hexParts[1]!, 16);
        if (!isNaN(high) && !isNaN(low)) {
          const u32 = ((high << 16) | low) >>> 0;
          const dotted = `${(u32 >> 24) & 255}.${(u32 >> 16) & 255}.${(u32 >> 8) & 255}.${u32 & 255}`;
          return validateIpAddress(dotted);
        }
      }
    }

    // Unique Local fc00::/7 (fc00:: to fdff:ffff:...)
    if (/^(fc|fd)/i.test(normalized)) {
      // Check AWS IPv6 metadata: fd00:ec2::254
      if (normalized.includes("ec2::254") || normalized.includes("169:254")) {
        return { allowed: false, reason: "METADATA_ENDPOINT", ip };
      }
      return { allowed: false, reason: "PRIVATE_NETWORK", ip };
    }

    // Link Local fe80::/10 (fe80:: to febf::)
    if (/^fe[89ab]/i.test(normalized)) {
      return { allowed: false, reason: "PRIVATE_NETWORK", ip };
    }

    return { allowed: true, ip };
  }

  return { allowed: false, reason: "INVALID_IP", ip };
}
