/**
 * Deterministic roast copy. Every line is chosen by a seed derived from the spec itself,
 * so two different APIs get different roasts, the same API gets the same roast (shared
 * links match what the author saw), and "Roast again" walks the pools by variant index.
 *
 * Lines reference real evidence: the API title, the offending path, counts, and percentages.
 * Avoid stock phrasing ("witness protection", "HTTP wept", "quietly left the room").
 */

export interface RoastLineContext {
  title: string;
  /** e.g. "POST /createUser"; falls back to a neutral phrase when missing */
  path: string;
  count: number;
  pct: number;
  total: number;
  issues: number;
  score: number;
  strength?: string;
}

type Line = (c: RoastLineContext) => string;

/** FNV-1a: small, stable, good enough to spread picks across pools. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(pool: readonly T[], seed: number, offset = 0): T {
  return pool[(seed + offset) % pool.length]!;
}

const code = (s: string) => `\`${s}\``;

/* —— Openings, by intensity (1 clean … 5 nuclear). Intensity 1 always says "clean". —— */
export const OPENINGS: Record<number, Line[]> = {
  1: [
    (c) => `${c.title} is clean. Irritatingly, professionally clean.`,
    (c) => `We came to roast ${c.title} and found a clean spec. Rude.`,
    () => `Clean paths, declared errors, actual descriptions. Who hurt you into being this responsible?`,
    (c) => `${c.total} endpoints and the spec is clean. We checked twice out of spite.`,
  ],
  2: [
    (c) => `${c.title} is mostly fine, which is the most dangerous kind of API.`,
    () => `Solid bones. A few questionable tattoos.`,
    () => `This passes review the way a used car passes inspection: technically, and with everyone avoiding eye contact.`,
    (c) => `${c.score}/100. The kind of API that gets a thumbs-up emoji instead of an approval.`,
  ],
  3: [
    (c) => `${c.title} works. That is the nicest sentence in this report.`,
    (c) => `${c.total} endpoints, ${c.issues} findings. Somebody shipped on a Friday.`,
    () => `This API has strong "we'll clean it up in v2" energy, and there is no v2.`,
    (c) => `${c.title} reads like four teams designed it and none of them were invited to the same meeting.`,
  ],
  4: [
    (c) => `${c.title} isn't an API so much as a series of decisions.`,
    (c) => `We read all ${c.total} endpoints. We needed a minute afterwards.`,
    () => `Your spec validates. So does a ransom note, technically.`,
    (c) => `${c.issues} findings. At this point the linter is less a tool and more a witness.`,
  ],
  5: [
    (c) => `${c.title} scored ${c.score}. The linter asked to be reassigned.`,
    (c) => `${c.issues} findings across ${c.total} endpoints. This isn't tech debt, it's a mortgage.`,
    () => `We'd suggest a refactor, but this needs a rewrite and a small ceremony.`,
    (c) => `Reviewing ${c.title} felt less like a code review and more like an incident retro.`,
  ],
};

/* —— Rule-specific punchlines. `path` is real evidence from the spec. —— */
export const RULE_LINES: Record<string, Line[]> = {
  ACTION_IN_PATH: [
    (c) => `${code(c.path)} puts the verb in the URL, which is like labelling a door "DOOR". HTTP methods already exist. They were here first.`,
    (c) => `${c.count} routes bring their own verbs, led by ${code(c.path)}. The method field is sitting right there, unemployed.`,
    (c) => `${code(c.path)} reads like a controller function that escaped and registered a domain.`,
    (c) => `Your URLs narrate themselves. ${code(c.path)} doesn't need a voiceover; that's what the method is for.`,
  ],
  GET_WITH_BODY: [
    (c) => `${code(c.path)} is a GET with a request body. Half the proxies on the internet will drop it silently and the other half will judge you.`,
    (c) => `A GET with a body. ${code(c.path)} works on localhost. It will not work behind a CDN, a cache, or on a Tuesday.`,
    (c) => `${code(c.path)} wants to be a POST so badly. Let it.`,
  ],
  VERB_METHOD_MISMATCH: [
    (c) => `${code(c.path)}: the method says it, then the path says it again, louder, in case the server wasn't listening.`,
    (c) => `${code(c.path)} is the API equivalent of "ATM machine".`,
    (c) => `${c.count} endpoints repeat their HTTP verb in the path. ${code(c.path)} is the ringleader.`,
  ],
  CAMEL_CASE_PATH: [
    (c) => `${code(c.path)} is camelCase in a URL. Somewhere a case-insensitive load balancer is waiting to ruin your week.`,
    (c) => `Your paths look like JavaScript variables that wandered onto the open internet. Exhibit A: ${code(c.path)}.`,
    (c) => `${c.count} camelCase segments. URLs are not Java classes, and ${code(c.path)} knows what it did.`,
  ],
  UNDERSCORE_PATH: [
    (c) => `${code(c.path)} uses underscores, so the API reads like a 2009 MySQL column that got promoted to management.`,
    (c) => `Underscores in ${c.count} paths. Put ${code(c.path)} in an underlined link and watch it turn into a space.`,
  ],
  MISSING_SUCCESS_RESPONSE: [
    (c) => `${code(c.path)} never says what success looks like. Clients find out the way you find a parcel on the doorstep: by tripping over it.`,
    (c) => `${c.count} operations define no 2xx response. The contract is, roughly, "trust me".`,
  ],
  MISSING_ERROR_RESPONSE: [
    (c) => `${c.pct}% of operations document zero errors. ${code(c.path)} fails the way a vending machine eats coins: silently, and with your money.`,
    (c) => `${code(c.path)} has no error responses. Optimism is not a schema.`,
    (c) => `No 4xx, no 5xx on ${c.count} operations. According to your API, your API has never been wrong.`,
  ],
  UNDOCUMENTED_OPERATIONS: [
    (c) => `${c.count} operations have no summary. ${code(c.path)} is self-documenting in the sense that you'll have to read the source.`,
    (c) => `${code(c.path)} ships without a description. The next developer will reverse-engineer it from the network tab and spite.`,
    (c) => `${c.pct}% of the spec is undocumented. It's not an API reference, it's a choose-your-own-adventure.`,
  ],
  MISSING_VERSIONING: [
    (c) => `No version anywhere. The first breaking change to ${code(c.path)} will be a surprise party nobody RSVP'd to.`,
    () => `Unversioned. Every deploy is a breaking change you just haven't met yet.`,
  ],
  SINGULAR_PLURAL_MIX: [
    (c) => `${code(c.path)} can't decide if it's one thing or many. Your resources have commitment issues.`,
    () => `Singular here, plural there. Integrators will guess right exactly half the time.`,
  ],
  DEEP_NESTING: [
    (c) => `${code(c.path)} is nested so deep it needs a breadcrumb trail and a packed lunch.`,
    (c) => `At the depth of ${code(c.path)}, URLs start needing a parental guidance rating.`,
  ],
  DUPLICATE_OPERATIONS: [
    (c) => `${code(c.path)} is defined twice, presumably so it has someone to talk to.`,
  ],
};

/* —— Fallback bodies when the top pattern has no dedicated lines. —— */
export const GENERIC_LINES: Line[] = [
  (c) => `${c.issues} findings across ${c.total} endpoints, and ${code(c.path)} is the one we'd frame.`,
  (c) => `${code(c.path)} is where we stopped taking notes and started taking screenshots.`,
  (c) => `The pattern starting at ${code(c.path)} repeats across ${c.count} operations. That's not a bug, that's a tradition.`,
];

/** Only for specs with zero findings. */
export const CLEAN_LINES: Line[] = [
  (c) => `${c.total} operations and zero findings. Our roast comedian has filed for unemployment.`,
  () => `If we had to complain, it would be that there's nothing to complain about, which is honestly worse.`,
  () => `Zero findings. Frame it, then never touch it again.`,
];

/** Clean score, but there is still something real to nitpick. Prefixes a rule line. */
export const NITPICK_LEADS: string[] = [
  "Our one complaint:",
  "We had to squint, but:",
  "Fine, one note:",
];

/* —— Optional closer that credits a real strength. —— */
export const CREDIT_LINES: Line[] = [
  (c) => `Credit where due: ${c.strength?.toLowerCase()}.`,
  (c) => `In fairness, ${c.strength?.toLowerCase()}, so it's not all bad.`,
];

/* —— Short stamp verdicts for the share card (keep under ~36 chars). —— */
export const VERDICTS: Record<number, string[]> = {
  1: ["Clean. Suspiciously clean.", "Nothing to roast. We're furious.", "Passed. Annoyingly."],
  2: ["Fine. Ish.", "Good bones, bad habits.", "Ships. With a squint."],
  3: ["Works on my machine.", "Technically alive.", "Held together by vibes."],
  4: ["Guilty of REST crimes.", "A production-shaped object.", "Step away from the spec."],
  5: ["Rewrite recommended.", "Fully cooked.", "Burn it down, keep the domain."],
};

export function intensityForScore(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 85) return 1;
  if (score >= 70) return 2;
  if (score >= 55) return 3;
  if (score >= 40) return 4;
  return 5;
}

export function getVerdictByScore(score: number, seed = 0): string {
  return pick(VERDICTS[intensityForScore(score)]!, seed);
}
