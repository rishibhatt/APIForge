/** Optional header sent with a spec fetch, for docs pages behind a token or API key. */
export interface AuthHeader {
  name: string;
  value: string;
}

export const EMPTY_AUTH_HEADER: AuthHeader = { name: "Authorization", value: "" };

/** `{ name: value }` for the parse request body, or undefined when no value was entered. */
export function authHeaderToRecord(h: AuthHeader): Record<string, string> | undefined {
  const name = h.name.trim();
  const value = h.value.trim();
  return name && value ? { [name]: value } : undefined;
}
