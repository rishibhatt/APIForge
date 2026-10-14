import {
  ROAST_MEME_IDS,
  ROAST_MEMES,
  type RoastMemeConfig,
  type RoastMemeId,
} from "./memeConfig";
import type { RoastSummary } from "./types";

export interface SelectedMemeResult {
  meme: RoastMemeConfig & {
    caption: string;
  };
  caption: string;
}

export interface SelectMemeOptions {
  excludeId?: RoastMemeId | string;
  recentMemeIds?: (RoastMemeId | string)[];
  seed?: string;
}

export interface SelectRoastMemeOptions extends SelectMemeOptions {
  recentCaptions?: string[];
  lastCaption?: string;
}

/**
 * Deterministic pseudo-random number generator [0, 1) for testing when a seed is provided.
 */
function seededRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

/**
 * Pure random choice selector for meme videos.
 *
 * CRITICAL RULE:
 * The API score, personality, or issue category MUST NOT determine which meme video is selected.
 * Every meme remains eligible for any API score.
 */
export function selectRandomRoastMeme(options: SelectMemeOptions = {}): RoastMemeId {
  const { excludeId, recentMemeIds = [], seed } = options;

  // 1. Filter out immediate previous meme if excludeId is provided
  let candidates: RoastMemeId[] = ROAST_MEME_IDS.filter(
    (memeId) => memeId !== excludeId,
  );

  if (candidates.length === 0) {
    candidates = [...ROAST_MEME_IDS];
  }

  // 2. Smart randomness: if recentMemeIds are provided, prefer non-recent candidates
  if (recentMemeIds.length > 0) {
    const nonRecent = candidates.filter((m) => !recentMemeIds.includes(m));
    if (nonRecent.length > 0) {
      candidates = nonRecent;
    }
  }

  // 3. Select uniformly at random
  const rand = seed ? seededRandom(seed) : Math.random();
  const index = Math.floor(rand * candidates.length);
  return candidates[index] || ROAST_MEME_IDS[0]!;
}

/**
 * Normalizes captions for de-duplication comparison.
 */
export function normalizeCaption(caption: string): string {
  return caption
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\d+/g, "0") // stays a word char, so normalizing twice is a no-op
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract actual API analysis facts for roast content.
 */
interface RoastContext {
  score: number;
  totalFindings: number;
  totalEndpoints: number;
  primaryFindingSummary?: string;
  primaryEndpoint?: string;
  topCategory?: string;
  personality?: string;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Short noun phrase naming a real finding, for meme captions. */
function captionSubject(ruleId: string, path: string, count: number): string {
  const at = path ? ` ${path}` : "";
  switch (ruleId) {
    case "ACTION_IN_PATH":
      return path ? `${path} with a verb in the URL` : `${count} routes with verbs in the URL`;
    case "GET_WITH_BODY":
      return `a GET with a request body${path ? ` (${path})` : ""}`;
    case "VERB_METHOD_MISMATCH":
      return path ? `${path} saying the verb twice` : "paths that repeat their HTTP verb";
    case "CAMEL_CASE_PATH":
      return `camelCase in${at || " the URLs"}`;
    case "UNDERSCORE_PATH":
      return `underscores in${at || " the URLs"}`;
    case "MISSING_SUCCESS_RESPONSE":
      return path ? `${path} with no documented 2xx` : `${count} operations with no documented 2xx`;
    case "MISSING_ERROR_RESPONSE":
      return path ? `${path} with zero error responses` : `${count} operations with zero error responses`;
    case "UNDOCUMENTED_OPERATIONS":
      return path ? `${path} with no description` : `${count} undocumented operations`;
    case "MISSING_VERSIONING":
      return "an API with no version anywhere";
    case "SINGULAR_PLURAL_MIX":
      return path ? `${path} mixing singular and plural` : "singular and plural resources mixed together";
    case "DEEP_NESTING":
      return path ? `how deep ${path} goes` : "six levels of nested paths";
    case "DUPLICATE_OPERATIONS":
      return path ? `${path} defined twice` : "duplicate operations";
    default:
      return path ? `whatever ${path} is doing` : `${count} findings in one spec`;
  }
}

function extractRoastContext(summary: RoastSummary): RoastContext {
  const score = summary.score;
  const totalFindings = summary.totalFindings;
  const totalEndpoints = summary.totalEndpoints;
  const topPattern = summary.topPatterns[0];

  return {
    score,
    totalFindings,
    totalEndpoints,
    primaryFindingSummary: topPattern?.technicalExplanation,
    primaryEndpoint: topPattern?.representativeEndpoints[0],
    topCategory: topPattern?.category || "general",
    personality: summary.personality || "CONFUSED",
  };
}

/**
 * Generate score-aware & factual roast captions tailored specifically to the selected meme's style.
 */
export function generateMemeCaption(
  memeId: RoastMemeId,
  summary: RoastSummary,
  options: { recentCaptions?: string[]; seed?: string } = {},
): string {
  const ctx = extractRoastContext(summary);
  const { score, totalFindings, totalEndpoints, primaryFindingSummary, primaryEndpoint, topCategory } = ctx;
  const recentCaptions = (options.recentCaptions || []).map(normalizeCaption);

  const rawCandidates: string[] = [];
  const top = summary.topPatterns[0];
  const path = primaryEndpoint ?? "";

  // What the meme is reacting to: always a real finding, never an invented one.
  const subject = top ? captionSubject(top.ruleId, path, top.count) : "";
  const clean = !top || totalFindings === 0;
  void primaryFindingSummary;
  void topCategory;

  switch (memeId) {
    case "perfect":
      rawCandidates.push(
        ...(clean
          ? [`${score}/100. Zero findings. The posing is earned.`, `${totalEndpoints} endpoints, zero findings. Let them pose.`]
          : score >= 85
            ? [`${score}/100 and posing like nobody will notice ${subject}.`, `Flexing a ${score}/100 with ${subject} right there in the spec.`]
            : [`Posing with a ${score}/100 like ${subject} isn't in the spec.`, `${score}/100 and still walking into review with this energy.`]),
      );
      break;
    case "slapping":
      rawCandidates.push(
        ...(clean
          ? [`APIForge looking for something to correct in a ${score}/100 spec.`, `Senior dev reviewing ${totalEndpoints} clean endpoints, hand raised, nothing to hit.`]
          : [`APIForge meeting ${subject} in code review.`, `Senior dev after spotting ${subject}.`, `${totalFindings} findings. Starting with ${subject}.`]),
      );
      break;
    case "eww":
      rawCandidates.push(
        ...(clean
          ? [`Looking for a flaw in a ${score}/100 spec and finding nothing. Gross.`, `APIForge, disgusted by how clean ${totalEndpoints} endpoints can be.`]
          : [`APIForge opening ${subject}.`, `Reviewing ${subject} like:`, `When the first thing you see is ${subject}.`]),
      );
      break;
    case "confused":
      rawCandidates.push(
        ...(clean
          ? [`Trying to find a single finding in ${totalEndpoints} clean endpoints.`, `APIForge wondering who wrote a ${score}/100 spec on purpose.`]
          : [`Trying to understand ${subject}.`, `APIForge reading ${subject} for the third time.`, `Frontend dev writing a typed client against ${subject}.`]),
      );
      break;
    case "classic":
      rawCandidates.push(
        ...(clean
          ? [`A ${score}/100 spec with zero findings. Classic overachiever.`, `Ah yes. Classic ${score}/100 behaviour.`]
          : [`Ah yes. Classic ${subject}.`, `${capitalize(subject)}. A classic, unfortunately.`]),
      );
      break;
    case "who_are_you":
      rawCandidates.push(
        ...(clean
          ? [`A spec with zero findings: wait a minute… who are you?`, `${score}/100 and nothing to report: who are you?`]
          : [`Looking at ${subject}: wait a minute… who are you?`, `Finding ${subject} in a ${score}/100 spec: who are you?`]),
      );
      break;
  }

  // Generic per-meme lines only when the switch produced nothing.
  if (rawCandidates.length === 0) {
    const memeConfig = ROAST_MEMES.find((m) => m.id === memeId);
    if (memeConfig) rawCandidates.push(...memeConfig.captionTemplates);
  }

  // Filter out recently shown captions to avoid near-duplicate repetition
  let freshCandidates = rawCandidates.filter(
    (c) => !recentCaptions.includes(normalizeCaption(c)),
  );

  if (freshCandidates.length === 0) {
    // Everything was shown recently: allow repeats, but never the one just shown.
    const last = recentCaptions[recentCaptions.length - 1];
    freshCandidates = rawCandidates.filter((c) => normalizeCaption(c) !== last);
    if (freshCandidates.length === 0) freshCandidates = rawCandidates;
  }

  // Pick candidate using seed or random
  const rand = options.seed ? seededRandom(options.seed) : Math.random();
  const selectedIdx = Math.floor(rand * freshCandidates.length);
  let caption = freshCandidates[selectedIdx] || freshCandidates[0] || "APIForge inspecting your spec...";

  // Dynamic variable replacement
  caption = caption.replace("{issueCount}", String(totalFindings));
  caption = caption.replace("{endpointCount}", String(totalEndpoints));
  caption = caption.replace("{score}", String(score));

  return caption;
}

/**
 * Master entry point for Meme Selection.
 *
 * 1. Randomly selects meme video (independent of score/personality/category).
 * 2. Generates score-aware & meme-aware roast caption.
 */
export function selectRoastMeme(
  summary: RoastSummary,
  options: SelectRoastMemeOptions = {},
): SelectedMemeResult {
  const excludeId = options.excludeId || options.lastCaption ? undefined : options.excludeId;
  const seed = options.seed;

  // 1. Randomly select meme
  const selectedMemeId = selectRandomRoastMeme({
    excludeId: options.excludeId || excludeId,
    recentMemeIds: options.recentMemeIds,
    seed,
  });

  const memeConfig =
    ROAST_MEMES.find((m) => m.id === selectedMemeId) || ROAST_MEMES[0]!;

  // 2. Generate meme-specific roast caption
  const caption = generateMemeCaption(selectedMemeId, summary, {
    recentCaptions: options.recentCaptions,
    seed,
  });

  return {
    meme: {
      ...memeConfig,
      caption,
    },
    caption,
  };
}
