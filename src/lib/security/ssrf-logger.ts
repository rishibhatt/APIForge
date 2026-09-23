import { randomUUID } from "crypto";

export interface SsrfLogEvent {
  requestId: string;
  userId?: string;
  targetHostname: string;
  targetPort: number;
  executionMode: "apiforge-proxy" | "browser";
  action: "ALLOWED" | "BLOCKED";
  blockedReason?: string;
  timestamp: string;
}

export function generateRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
}

export function logSsrfSecurityEvent(event: SsrfLogEvent): void {
  const payload = {
    type: "SSRF_SECURITY_AUDIT",
    ...event,
  };

  if (event.action === "BLOCKED") {
    console.warn(`[SSRF_SECURITY_AUDIT] BLOCKED: ${JSON.stringify(payload)}`);
  } else {
    console.info(`[SSRF_SECURITY_AUDIT] ALLOWED: ${JSON.stringify(payload)}`);
  }
}
