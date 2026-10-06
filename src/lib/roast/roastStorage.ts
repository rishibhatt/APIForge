import { randomBytes } from "crypto";
import type { SanitizedRoastReport } from "./types";
import { sanitizeRoastReport } from "./sanitizeReport";

// In-memory server-side cache for shared reports (per process; lost on restart).
// Bounded so anonymous POSTs to /api/roast/analyze cannot grow memory without limit.
const MAX_REPORTS = 1_000;
const REPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Pinned to globalThis: Next bundles route handlers and pages separately, so a plain
// module-level Map gave /api/roast/analyze and /roast/[id] different stores (dead share links).
const globalStore = globalThis as typeof globalThis & {
  __apiforgeRoastReports?: Map<string, SanitizedRoastReport>;
};
const reportStore = (globalStore.__apiforgeRoastReports ??= new Map<string, SanitizedRoastReport>());

export function storeRoastReport(report: SanitizedRoastReport): string {
  const sanitized = sanitizeRoastReport(report);
  reportStore.set(sanitized.id, sanitized);
  while (reportStore.size > MAX_REPORTS) {
    const oldest = reportStore.keys().next().value;
    if (oldest === undefined) break;
    reportStore.delete(oldest);
  }
  return sanitized.id;
}

export function getRoastReport(id: string): SanitizedRoastReport | null {
  const report = reportStore.get(id);
  if (!report) return null;
  if (Date.now() - report.createdAt > REPORT_TTL_MS) {
    reportStore.delete(id);
    return null;
  }
  return report;
}

export function generateReportId(): string {
  const rand = randomBytes(8).toString("hex");
  return `rst_${Date.now().toString(36)}_${rand}`;
}
