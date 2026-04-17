import type { Endpoint, GenerationScope, GroqStreamTab } from "@/types/api";

const store = new Map<string, string>();

export function generationCacheKey(
  scope: GenerationScope,
  operations: Endpoint[],
  tab: GroqStreamTab,
): string {
  const ids = operations.map((o) => o.id).sort().join("\u0001");
  return `${scope}\u0002${ids}\u0002${tab}`;
}

export function getGenerationCache(key: string): string | undefined {
  return store.get(key);
}

export function setGenerationCache(key: string, text: string): void {
  store.set(key, text);
}

export function clearGenerationCache(key: string): void {
  store.delete(key);
}
