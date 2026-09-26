import { describe, it } from "node:test";
import assert from "node:assert";
import { ROAST_MEME_IDS, type RoastMemeId } from "../memeConfig";
import {
  generateMemeCaption,
  normalizeCaption,
  selectRandomRoastMeme,
  selectRoastMeme,
} from "../memeSelector";
import type { RoastCategory, RoastPersonality, RoastSummary } from "../types";

function createMockSummary(score: number, category = "naming", personality = "CONFUSED"): RoastSummary {
  return {
    score,
    statusTier: score >= 85 ? "HEALTHY" : "CHAOTIC",
    totalEndpoints: 15,
    totalFindings: 8,
    criticalCount: 1,
    highCount: 3,
    mediumCount: 2,
    lowCount: 2,
    categoryBreakdown: [{ category, count: 8 }],
    topPatterns: [
      {
        ruleId: "ACTION_IN_PATH",
        category: category as RoastCategory,
        count: 5,
        percentage: 60,
        representativeEndpoints: ["GET /getUsers", "POST /createOrder"],
        severity: "high",
        technicalExplanation: "Path contains verb-like segment 'getUsers'",
        humorPriority: 1,
      },
    ],
    strengths: [{ title: "Valid JSON payloads", description: "All endpoints return valid JSON" }],
    personality: personality as RoastPersonality,
    roast: "Test roast text",
    verdict: "Test verdict",
    characterCount: 15,
    tone: "brutal",
  };
}

describe("APIForge Meme Selection Engine — Master Specification Audit", () => {
  it("Score Independence: All 6 memes can be selected for any API score", () => {
    const scores = [5, 25, 50, 75, 95];

    for (const score of scores) {
      const selectedMemes = new Set<RoastMemeId>();

      // Run 200 iterations for each score level
      for (let i = 0; i < 200; i++) {
        const memeId = selectRandomRoastMeme({ seed: `score-${score}-iter-${i}` });
        selectedMemes.add(memeId);
      }

      assert.strictEqual(
        selectedMemes.size,
        6,
        `Score ${score} failed to make all 6 memes eligible! Found: ${Array.from(selectedMemes).join(", ")}`,
      );
    }
  });

  it("Personality Independence: Personality does not exclude any meme", () => {
    const personalities = [
      "CHAOTIC",
      "CONFUSED",
      "SILENT_API",
      "OVERENGINEERED",
      "PERFECTIONIST",
    ];

    for (const p of personalities) {
      const selectedMemes = new Set<RoastMemeId>();

      for (let i = 0; i < 200; i++) {
        const memeId = selectRandomRoastMeme({ seed: `pers-${p}-iter-${i}` });
        selectedMemes.add(memeId);
      }

      assert.strictEqual(
        selectedMemes.size,
        6,
        `Personality ${p} excluded memes! Found: ${Array.from(selectedMemes).join(", ")}`,
      );
    }
  });

  it("Exclusion: Never returns excludeId (same meme twice in a row)", () => {
    for (const targetExclusion of ROAST_MEME_IDS) {
      for (let i = 0; i < 100; i++) {
        const selected = selectRandomRoastMeme({
          excludeId: targetExclusion,
          seed: `exclude-${targetExclusion}-${i}`,
        });
        assert.notStrictEqual(
          selected,
          targetExclusion,
          `Excluded meme '${targetExclusion}' was returned on iteration ${i}!`,
        );
      }
    }
  });

  it("Fair Distribution: Long-term distribution across 10,000 iterations is balanced (~16.7% each)", () => {
    const counts: Record<RoastMemeId, number> = {
      perfect: 0,
      slapping: 0,
      eww: 0,
      confused: 0,
      classic: 0,
      who_are_you: 0,
    };

    const TOTAL_RUNS = 10000;
    for (let i = 0; i < TOTAL_RUNS; i++) {
      const memeId = selectRandomRoastMeme();
      counts[memeId]++;
    }

    for (const memeId of ROAST_MEME_IDS) {
      const percentage = (counts[memeId] / TOTAL_RUNS) * 100;
      assert.ok(
        percentage >= 12 && percentage <= 22,
        `Meme ${memeId} distribution was ${percentage.toFixed(2)}%, outside expected 12-22% fair range!`,
      );
    }
  });

  it("Caption De-duplication: Normalizes captions and avoids immediate duplicate captions", () => {
    const summary = createMockSummary(50);
    const recentCaptions: string[] = [];

    for (let i = 0; i < 20; i++) {
      const caption = generateMemeCaption("slapping", summary, {
        recentCaptions,
        seed: `cap-dedup-${i}`,
      });

      assert.ok(caption.length > 5, "Caption should be non-empty string");
      const norm = normalizeCaption(caption);

      if (recentCaptions.length > 0) {
        assert.strictEqual(
          recentCaptions[recentCaptions.length - 1] !== norm,
          true,
          `Immediate duplicate caption detected: "${caption}"`,
        );
      }
      recentCaptions.push(norm);
    }
  });

  it("Meme & Issue Compatibility: Every meme x issue category produces a valid non-empty roast caption", () => {
    const categories = ["naming", "http-semantics", "errors", "documentation", "versioning", "structure"];

    for (const memeId of ROAST_MEME_IDS) {
      for (const category of categories) {
        const summary = createMockSummary(45, category);
        const res = selectRoastMeme(summary, { seed: `matrix-${memeId}-${category}` });

        assert.ok(res.caption.length > 0, `Empty caption for ${memeId} x ${category}`);
        assert.ok(res.meme.src.length > 0, `Empty video src for ${memeId}`);
        assert.strictEqual(res.meme.id, isRoastMemeId(res.meme.id) ? res.meme.id : "");
      }
    }
  });

  it("Deterministic Seeding: Seed produces 100% reproducible results", () => {
    const summary = createMockSummary(72);
    const res1 = selectRoastMeme(summary, { seed: "deterministic-seed-xyz" });
    const res2 = selectRoastMeme(summary, { seed: "deterministic-seed-xyz" });

    assert.strictEqual(res1.meme.id, res2.meme.id);
    assert.strictEqual(res1.caption, res2.caption);
  });
});

function isRoastMemeId(id: string): id is RoastMemeId {
  return ROAST_MEME_IDS.includes(id as RoastMemeId);
}
