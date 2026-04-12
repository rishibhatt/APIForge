import type { OutputTab } from "@/types/api";

const store = new Map<string, string>();

function cacheKey(endpointId: string, tab: OutputTab): string {
  return `${endpointId}:${tab}`;
}

export function getGenerationCache(
  endpointId: string,
  tab: OutputTab,
): string | undefined {
  return store.get(cacheKey(endpointId, tab));
}

export function setGenerationCache(
  endpointId: string,
  tab: OutputTab,
  text: string,
): void {
  store.set(cacheKey(endpointId, tab), text);
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
  store.delete(cacheKey(endpointId, tab));
}
