/**
 * Picks a Material Symbols icon name from an OpenAPI tag / collection name.
 * First matching rule wins; falls back to "folder".
 */
export function collectionIconForTagName(tag: string): string {
  const n = tag.trim();
  if (!n) return "folder";
  const lower = n.toLowerCase();

  const rules: { pattern: RegExp; icon: string }[] = [
    { pattern: /auth|login|token|session|oauth|security|password|signin|signup/i, icon: "lock" },
    { pattern: /doc|documentation|book|guide|manual|readme|wiki/i, icon: "menu_book" },
    { pattern: /user|account|profile|identity|member|people/i, icon: "person" },
    { pattern: /payment|pay|billing|invoice|cart|shop|order|checkout|subscribe/i, icon: "shopping_cart" },
    { pattern: /message|chat|mail|email|notif|inbox|push/i, icon: "chat" },
    { pattern: /admin|config|setting|system|global|preference/i, icon: "settings" },
    { pattern: /file|upload|media|asset|image|video|storage|blob/i, icon: "folder_open" },
    { pattern: /search|query|filter|index/i, icon: "search" },
    { pattern: /report|analytic|stat|metric|dashboard|insight/i, icon: "analytics" },
    { pattern: /webhook|event|stream|queue|job|async/i, icon: "bolt" },
    { pattern: /inventory|stock|catalog|product|item/i, icon: "inventory_2" },
    { pattern: /location|map|geo|place/i, icon: "location_on" },
    { pattern: /health|status|ping|ready|live/i, icon: "monitor_heart" },
    { pattern: /\b(default|misc|general|other)\b/i, icon: "extension" },
  ];

  for (const { pattern, icon } of rules) {
    if (pattern.test(lower)) return icon;
  }

  return "folder";
}
