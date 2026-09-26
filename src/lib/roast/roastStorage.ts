import type { SanitizedRoastReport } from "./types";
import { sanitizeRoastReport } from "./sanitizeReport";

// In-memory server-side cache for shared reports
const reportStore = new Map<string, SanitizedRoastReport>();

export function storeRoastReport(report: SanitizedRoastReport): string {
  const sanitized = sanitizeRoastReport(report);
  reportStore.set(sanitized.id, sanitized);
  return sanitized.id;
}

export function getRoastReport(id: string): SanitizedRoastReport | null {
  return reportStore.get(id) ?? null;
}

export function generateReportId(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `rst_${Date.now().toString(36)}_${rand}`;
}
