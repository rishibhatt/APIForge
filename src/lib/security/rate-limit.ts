interface RateLimitRecord {
  timestamps: number[];
  concurrentCount: number;
}

const windowMs = 60_000; // 1 minute
const maxRequestsPerWindow = 60;
export const MAX_CONCURRENT_TESTS = 5;

const clientStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  clientStore.forEach((record, key) => {
    record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);
    if (record.timestamps.length === 0 && record.concurrentCount === 0) {
      clientStore.delete(key);
    }
  });
}, 30_000).unref?.();

export function checkRateLimitAndConcurrency(clientId: string): {
  allowed: boolean;
  reason?: "RATE_LIMITED" | "CONCURRENCY_LIMIT";
  message?: string;
} {
  const now = Date.now();
  let record = clientStore.get(clientId);
  if (!record) {
    record = { timestamps: [], concurrentCount: 0 };
    clientStore.set(clientId, record);
  }

  // Filter timestamps within sliding window
  record.timestamps = record.timestamps.filter((t: number) => now - t < windowMs);

  if (record.timestamps.length >= maxRequestsPerWindow) {
    return {
      allowed: false,
      reason: "RATE_LIMITED",
      message: `Rate limit exceeded. Maximum ${maxRequestsPerWindow} proxy requests per minute allowed.`,
    };
  }

  if (record.concurrentCount >= MAX_CONCURRENT_TESTS) {
    return {
      allowed: false,
      reason: "CONCURRENCY_LIMIT",
      message: `Concurrency limit reached. Maximum ${MAX_CONCURRENT_TESTS} simultaneous requests allowed.`,
    };
  }

  return { allowed: true };
}

export function acquireConcurrencySlot(clientId: string): void {
  const record = clientStore.get(clientId);
  if (record) {
    record.timestamps.push(Date.now());
    record.concurrentCount += 1;
  }
}

export function releaseConcurrencySlot(clientId: string): void {
  const record = clientStore.get(clientId);
  if (record && record.concurrentCount > 0) {
    record.concurrentCount -= 1;
  }
}
