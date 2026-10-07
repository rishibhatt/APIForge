import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  consumeWindowLimit,
  peekWindowLimit,
  resetWindowLimits,
} from "@/lib/security/rate-limit";

const WINDOW = 5 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

describe("rolling window limiter", () => {
  beforeEach(() => resetWindowLimits());

  it("counts down remaining and reports resetAt of the oldest request", () => {
    const a = consumeWindowLimit("k", 3, WINDOW, T0);
    assert.deepStrictEqual(
      { allowed: a.allowed, remaining: a.remaining, resetAt: a.resetAt, limit: a.limit },
      { allowed: true, remaining: 2, resetAt: T0 + WINDOW, limit: 3 },
    );
    const b = consumeWindowLimit("k", 3, WINDOW, T0 + 1000);
    assert.strictEqual(b.remaining, 1);
    assert.strictEqual(b.resetAt, T0 + WINDOW);
    assert.strictEqual(b.windowMs, WINDOW);
  });

  it("refuses at the limit without recording and keeps resetAt", () => {
    for (let i = 0; i < 3; i++) consumeWindowLimit("k", 3, WINDOW, T0 + i);
    const denied = consumeWindowLimit("k", 3, WINDOW, T0 + 10);
    assert.strictEqual(denied.allowed, false);
    assert.strictEqual(denied.remaining, 0);
    assert.strictEqual(denied.resetAt, T0 + WINDOW);
    assert.strictEqual(peekWindowLimit("k", 3, WINDOW, T0 + 11).remaining, 0);
  });

  it("slides: the oldest request leaves first and frees exactly one slot", () => {
    consumeWindowLimit("k", 3, WINDOW, T0);
    consumeWindowLimit("k", 3, WINDOW, T0 + 60_000);
    consumeWindowLimit("k", 3, WINDOW, T0 + 120_000);
    assert.strictEqual(consumeWindowLimit("k", 3, WINDOW, T0 + 130_000).allowed, false);

    const justAfterFirst = peekWindowLimit("k", 3, WINDOW, T0 + WINDOW + 1);
    assert.strictEqual(justAfterFirst.remaining, 1);
    assert.strictEqual(justAfterFirst.allowed, true);
    assert.strictEqual(justAfterFirst.resetAt, T0 + 60_000 + WINDOW);

    const again = consumeWindowLimit("k", 3, WINDOW, T0 + WINDOW + 2);
    assert.strictEqual(again.allowed, true);
    assert.strictEqual(again.remaining, 0);
    assert.strictEqual(consumeWindowLimit("k", 3, WINDOW, T0 + WINDOW + 3).allowed, false);
  });

  it("frees everything after a full window and resetAt becomes null", () => {
    consumeWindowLimit("k", 2, WINDOW, T0);
    const p = peekWindowLimit("k", 2, WINDOW, T0 + WINDOW + 1);
    assert.strictEqual(p.remaining, 2);
    assert.strictEqual(p.resetAt, null);
  });

  it("peek never consumes and keys are isolated", () => {
    assert.strictEqual(peekWindowLimit("a", 5, WINDOW, T0).remaining, 5);
    assert.strictEqual(peekWindowLimit("a", 5, WINDOW, T0).remaining, 5);
    consumeWindowLimit("a", 5, WINDOW, T0);
    assert.strictEqual(peekWindowLimit("a", 5, WINDOW, T0).remaining, 4);
    assert.strictEqual(peekWindowLimit("b", 5, WINDOW, T0).remaining, 5);
  });

  it("shares one store through globalThis", () => {
    consumeWindowLimit("g", 5, WINDOW, T0);
    const g = globalThis as unknown as Record<string, { store: Map<string, unknown> }>;
    assert.ok(g.__apiforgeWindowLimitStore__.store.has("g"));
  });
});
