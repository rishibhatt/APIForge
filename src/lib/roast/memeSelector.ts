import { ROAST_MEMES, type RoastMemeConfig } from "./memeConfig";
import type { RoastPersonality } from "./personality";
import type { RoastSummary } from "./types";

export interface SelectedMemeResult {
  meme: RoastMemeConfig;
  caption: string;
}

const CATEGORY_CAPTIONS: Record<string, Record<string, string[]>> = {
  slapping: {
    "http-semantics": [
      "APIForge correcting your GET request payload decisions...",
      "When APIForge finds GET requests carrying body suitcases...",
      "Senior engineer entering the code review for HTTP verbs...",
    ],
    naming: [
      "APIForge correcting your verb-in-path decisions...",
      "When every endpoint has its own naming convention...",
      "When path casing switches mid-sentence...",
    ],
  },
  confused: {
    naming: [
      "When /users suddenly becomes /getAllUsers...",
      "APIForge trying to understand your URL casing strategy...",
      "Reading this API naming convention like...",
    ],
    documentation: [
      "Reading this documentation looking for non-existent summaries...",
      "APIForge inspecting endpoint summaries like...",
    ],
  },
  eww: {
    errors: [
      "When every failure comes with a mystery box instead of 4xx status...",
      "Opening endpoint failure responses like...",
    ],
    documentation: [
      "APIForge finding another completely un-documented endpoint...",
      "When the API passes structural validation but spiritually fails...",
    ],
  },
  perfect: {
    clean: [
      "When the developer actually read the REST specification...",
      "Rare footage of an annoyingly clean OpenAPI document...",
      "APIForge trying to find something to roast...",
    ],
  },
};

export function selectRoastMeme(
  summary: RoastSummary,
  personality?: RoastPersonality,
  excludeId?: string,
  lastCaption?: string,
): SelectedMemeResult {
  const score = summary.score;
  const topCategories = summary.topPatterns.map((p) => p.category);

  // Score candidate memes
  const scored = ROAST_MEMES.map((meme) => {
    let points = 0;

    // 1. Score range match
    if (score >= meme.scoreRange[0] && score <= meme.scoreRange[1]) {
      points += 40;
    } else {
      const dist = Math.min(
        Math.abs(score - meme.scoreRange[0]),
        Math.abs(score - meme.scoreRange[1]),
      );
      points -= dist * 0.8;
    }

    // 2. Mood & personality alignment
    if (score >= 80 && meme.mood === "celebratory") points += 30;
    if (score < 40 && meme.mood === "aggressive") points += 30;
    if (personality === "CHAOTIC" && meme.mood === "aggressive") points += 20;
    if (personality === "CONFUSED" && meme.mood === "confused") points += 20;
    if (personality === "SILENT_API" && meme.id === "eww") points += 25;

    // 3. Category match
    if (topCategories.includes("naming") && meme.id === "confused") points += 15;
    if (topCategories.includes("http-semantics") && meme.id === "slapping") points += 15;

    // Exclude penalty when cycling
    if (excludeId && meme.id === excludeId) {
      points -= 1000;
    }

    // Small jitter
    points += Math.random() * 5;

    return { meme, points };
  });

  scored.sort((a, b) => b.points - a.points);
  const selected = scored[0]?.meme || ROAST_MEMES[0]!;

  // Select finding-aware caption
  let candidates: string[] = [];
  const memeCatCaptions = CATEGORY_CAPTIONS[selected.id];
  if (memeCatCaptions) {
    for (const cat of topCategories) {
      if (memeCatCaptions[cat]) {
        candidates.push(...memeCatCaptions[cat]!);
      }
    }
  }

  if (candidates.length === 0) {
    candidates = selected.captionTemplates;
  }

  // Filter out last caption if possible to avoid immediate duplication
  if (lastCaption && candidates.length > 1) {
    candidates = candidates.filter((c) => c !== lastCaption);
  }

  const randIdx = Math.floor(Math.random() * candidates.length);
  let caption = candidates[randIdx] || candidates[0] || selected.captionTemplates[0]!;

  if (caption.includes("{issueCount}")) {
    caption = caption.replace("{issueCount}", String(summary.totalFindings));
  }

  return {
    meme: selected,
    caption,
  };
}
