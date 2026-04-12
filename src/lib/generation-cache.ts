import type { OutputTab } from "@/types/api";

const store = new Map<string, string>();

export function generationCacheKey(endpointId: string, tab: OutputTab): string {
  return `${endpointId}:${tab}`;
}

export function getGenerationCache(
  endpointId: string,
  tab: OutputTab,
): string | undefined {
  return store.get(generationCacheKey(endpointId, tab));
}

export function setGenerationCache(
  endpointId: string,
  tab: OutputTab,
  text: string,
): void {
  store.set(generationCacheKey(endpointId, tab), text);
}

export function clearGenerationCache(
  endpointId: string,
  tab?: OutputTab,
): void {
  if (tab === undefined) {
    for (const key of Array.from(store.keys())) {
      if (key.startsWith(`${endpointId}:`)) store.delete(key);
    }
    return;
  }
  store.delete(generationCacheKey(endpointId, tab));
}
