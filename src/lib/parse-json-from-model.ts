/** Strip optional markdown fences and parse JSON from model output. */
export function parseJsonFromModelText(text: string): unknown {
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(s);
  if (fence?.[1]) s = fence[1].trim();
  return JSON.parse(s);
}
