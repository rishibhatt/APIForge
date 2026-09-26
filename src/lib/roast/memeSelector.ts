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
    .replace(/\d+/g, "#")
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

  const epLabel = primaryEndpoint ? ` (${primaryEndpoint})` : "";
  const findingText = primaryFindingSummary ? `: ${primaryFindingSummary}` : "";

  // Meme-specific comedic delivery logic based on actual API data
  switch (memeId) {
    case "perfect":
      if (score >= 90) {
        rawCandidates.push(
          `Score: ${score}/100. Annoyingly clean. We found ${totalFindings} minor finding(s) just to keep your ego manageable.`,
          `Bro got a ${score}/100 and actually read the REST API design specification.`,
          `${score}/100. Rare footage of an API with zero catastrophic design crimes.`,
          `${score}/100. APIForge tried to bully this spec, but there's almost nothing to roast.`,
          `Annoyingly good design. ${totalEndpoints} endpoint(s) and zero structural crimes.`,
        );
      } else if (score >= 75) {
        rawCandidates.push(
          `Score: ${score}/100. Pretty clean. Unfortunately, your ${topCategory} conventions still have unresolved feelings.`,
          `${score}/100. Posing like a pristine production spec while ${totalFindings} finding(s) exist in the background.`,
          `Flexing a ${score}/100 score while ${primaryEndpoint || "one endpoint"} is doing side quests.`,
          `${score}/100. Good attempt at REST conventions, but APIForge noticed${findingText}.`,
        );
      } else {
        rawCandidates.push(
          `Score: ${score}/100 and still posing with total, unearned confidence.`,
          `Bro got a ${score}/100 and walked into the code review smiling.`,
          `Flexing like a 100/100 spec despite ${totalFindings} findings under the rug.`,
          `Score: ${score}/100. The optimism is unmatched. The API quality is... elsewhere.`,
        );
      }
      break;

    case "slapping":
      if (topCategory === "http-semantics" || (primaryFindingSummary && primaryFindingSummary.includes("GET"))) {
        rawCandidates.push(
          `GET request with a body detected? HTTP standards saw this and started swinging.`,
          `APIForge correcting your GET request payload decisions at 2 AM...`,
          `Senior engineer entering the code review for HTTP verbs swinging.`,
        );
      }
      if (topCategory === "naming") {
        rawCandidates.push(
          `APIForge correcting your verb-in-path decisions...`,
          `When path casing switches mid-sentence in production...`,
          `When every single endpoint has its own custom naming convention...`,
        );
      }
      if (score >= 85) {
        rawCandidates.push(
          `${score}/100 and APIForge STILL found one flaw worth correcting.`,
          `Senior dev inspecting ${score}/100 spec to correct the 1 remaining warning...`,
        );
      } else {
        rawCandidates.push(
          `${totalFindings} issues detected? Senior dev entering the code review swinging.`,
          `APIForge isn't reviewing your ${score}/100 API, it's disciplining it.`,
          `When APIForge finds ${primaryFindingSummary || "naming chaos"}...`,
          `${totalFindings} findings detected. Bro submitted an API and a cry for help.`,
          `HTTP standards saw ${primaryEndpoint || "this spec"} and started throwing hands.`,
        );
      }
      break;

    case "eww":
      if (topCategory === "errors") {
        rawCandidates.push(
          `When every failure returns a mystery box instead of a proper 4xx status...`,
          `200 OK for an error payload? Your API believes bad news should arrive wearing a party hat.`,
          `Opening endpoint failure response and getting plain HTML error text...`,
        );
      }
      if (topCategory === "documentation") {
        rawCandidates.push(
          `APIForge finding another completely un-documented endpoint${epLabel}...`,
          `Opening endpoint schema with zero parameter descriptions...`,
        );
      }
      if (score >= 85) {
        rawCandidates.push(
          `${score}/100 and somehow this one endpoint${epLabel} still looks like it was written during a fire drill.`,
          `Overall ${score}/100, but looking at ${primaryEndpoint || "this schema"} response payload like...`,
        );
      } else {
        rawCandidates.push(
          `APIForge looking at ${primaryFindingSummary || "this payload"}: Absolutely not.`,
          `${score}/100. The API passes structural validation, but spiritually fails.`,
          `Opening endpoint number ${totalEndpoints} and reading the payload schema...`,
          `Score: ${score}/100. Looking at ${totalFindings} findings like...`,
          `When the API documentation disappears right when you need it most...`,
        );
      }
      break;

    case "confused":
      if (topCategory === "naming") {
        rawCandidates.push(
          `When /users suddenly becomes /getAllUsers in the middle of a spec...`,
          `APIForge trying to understand your URL casing strategy...`,
          `Reading this API naming convention like a mystery novel...`,
        );
      }
      if (topCategory === "versioning" || topCategory === "structure") {
        rawCandidates.push(
          `Trying to calculate the nested path depth of /v1/v2/users/id/items...`,
          `APIForge trying to understand why this payload is nested 6 levels deep...`,
        );
      }
      if (score >= 85) {
        rawCandidates.push(
          `${score}/100, but APIForge is still trying to understand why ${primaryEndpoint || "this path"} exists.`,
          `Wait... an API this clean actually exists in production?`,
        );
      } else {
        rawCandidates.push(
          `APIForge trying to understand your API design choices be like...`,
          `Wait... why does ${primaryFindingSummary || "this endpoint behave like this"}?`,
          `${totalFindings} issues detected. Reading this spec like a code review puzzle.`,
          `When HTTP methods and path verbs start arguing in the same spec...`,
          `Trying to parse ${totalEndpoints} endpoints with 4 different architectural patterns...`,
        );
      }
      break;

    case "classic":
      if (topCategory === "http-semantics") {
        rawCandidates.push(
          `This is classic: returning 200 OK for internal server errors.`,
          `Classic: POST request returning an empty body with zero status headers.`,
          `Ah yes. The classic 'HTTP is merely a suggestion' approach.`,
        );
      }
      if (topCategory === "naming") {
        rawCandidates.push(
          `Ah yes, classic... camelCase, snake_case, and kebab-case all in one payload.`,
          `When the endpoint path is literally /get_user_info_final_v2_new... classic.`,
        );
      }
      if (score >= 85) {
        rawCandidates.push(
          `${score}/100. This is classic: almost flawless, yet ${primaryFindingSummary || "one tiny detail"} sneaked in.`,
          `Classic senior dev move: ${score}/100 and zero fluff.`,
        );
      } else {
        rawCandidates.push(
          `Ah yes, classic... ${primaryFindingSummary || "classic REST anti-pattern"}.`,
          `This is classic: ${totalFindings} findings across ${totalEndpoints} endpoints.`,
          `Classic API design: 15 query parameters and zero schema descriptions.`,
          `When ${primaryEndpoint || "an endpoint"} is literally doing side quests... classic.`,
        );
      }
      break;

    case "who_are_you":
      if (topCategory === "documentation" || (primaryFindingSummary && primaryFindingSummary.includes("summary"))) {
        rawCandidates.push(
          `Inspecting an endpoint with no summary, no description and no schema: WHO ARE YOU?`,
          `Found an endpoint with zero documentation: Wait a minute... WHO ARE YOU?`,
        );
      }
      if (primaryEndpoint) {
        rawCandidates.push(
          `Inspecting path ${primaryEndpoint}: Wait a minute... WHO ARE YOU?`,
          `Looking at ${primaryEndpoint} like: Wait a minute... WHO ARE YOU?`,
        );
      }
      if (score >= 85) {
        rawCandidates.push(
          `${score}/100. APIForge inspecting your single remaining warning: Wait a minute... WHO ARE YOU?`,
          `Looking at the 1% un-documented edge case: Wait a minute... WHO ARE YOU?`,
        );
      } else {
        rawCandidates.push(
          `${totalFindings} findings detected. APIForge isn't reviewing your spec, it's conducting an investigation.`,
          `When ${primaryFindingSummary || "an unmodeled endpoint appears"}: Wait a minute... WHO ARE YOU?`,
          `Looking at operationId 'handleRequest_v2': Wait a minute... WHO ARE YOU?`,
          `When a 404 response payload returns a 2MB binary buffer: Wait a minute... WHO ARE YOU?`,
        );
      }
      break;
  }

  // Also include general fallback templates for the meme from config
  const memeConfig = ROAST_MEMES.find((m) => m.id === memeId);
  if (memeConfig) {
    rawCandidates.push(...memeConfig.captionTemplates);
  }

  // Filter out recently shown captions to avoid near-duplicate repetition
  let freshCandidates = rawCandidates.filter(
    (c) => !recentCaptions.includes(normalizeCaption(c)),
  );

  if (freshCandidates.length === 0) {
    freshCandidates = rawCandidates;
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
