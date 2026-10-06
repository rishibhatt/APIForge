import { generateGroqTextBuffered } from "@/lib/groq-generate-buffered";
import type { RoastPattern, RoastStrength } from "./types";

export interface AiRoastGenerationOutput {
  opening?: string;
  roast?: string;
  caption?: string;
  /** 2–5 word stamp for the share card */
  verdict?: string;
}

/** Stock lines that make every roast sound the same. The model is told to avoid them. */
const BANNED_PHRASES = [
  "witness protection",
  "wept",
  "left the room",
  "chaotic",
  "Friday-night hackathon",
  "archaeological",
  "bold choice",
  "unhinged",
  "a masterpiece",
  "the audacity",
];

/** Rotates the comedic angle so "Roast again" doesn't just reword the same joke. */
const ANGLES = [
  "a code reviewer leaving their final comment before going on holiday",
  "an on-call engineer at 3am reading this spec for the first time",
  "a frontend developer trying to write a typed client against it",
  "a nature documentary narrator observing the endpoints in the wild",
  "a building inspector filing a report",
  "a sommelier tasting the spec",
];

export async function generateAiRoastContent(params: {
  title?: string;
  variantIndex?: number;
  score: number;
  verdict: string;
  personality: string;
  totalEndpoints: number;
  topPatterns: RoastPattern[];
  strengths: RoastStrength[];
}): Promise<AiRoastGenerationOutput | null> {
  try {
    const patternsSummary = params.topPatterns
      .slice(0, 3)
      .map((p) => {
        const paths = p.representativeEndpoints.length
          ? ` e.g. ${p.representativeEndpoints.map((e) => `\`${e}\``).join(", ")}`
          : "";
        return `- ${p.ruleId} (${p.count} occurrences, ${p.percentage}% of operations)${paths}: ${p.technicalExplanation}`;
      })
      .join("\n");
    const strengths = params.strengths.slice(0, 2).map((s) => `- ${s.title}`).join("\n");
    const angle = ANGLES[(params.variantIndex ?? 0) % ANGLES.length];

    const prompt = `API: "${params.title || "Untitled API"}"
Score: ${params.score}/100. Operations: ${params.totalEndpoints}.
Findings (deterministic linter output, the only facts you may use):
${patternsSummary || "- No meaningful findings. The spec is clean."}
${strengths ? `Genuine strengths:\n${strengths}` : ""}

Write the roast from the angle of ${angle}.

Rules:
- Refer to at least one REAL path from the findings verbatim, wrapped in backticks. Never invent paths, counts, or problems.
- If the score is 85+, the roast is grudging praise that still finds one nitpick, and must contain the word "clean".
- Developer-specific and concrete: name the consequence (broken caches, a confused typed client, a 3am page), not abstract insults.
- No profanity, nothing about the people who wrote it, no emoji, no hashtags.
- Never use these phrases: ${BANNED_PHRASES.join("; ")}.

Return raw JSON only:
{
  "opening": "One sentence, max 110 characters, mentioning the API by name or a real path.",
  "roast": "2 sentences, max 260 characters total, about the most damning real finding.",
  "verdict": "A 2-5 word funny judgement for a rubber stamp on the share card. A verdict, not a description of the finding: e.g. 'Guilty of REST crimes', 'Fine. Ish.', 'Ships with a squint', 'Cooked'. Never just name the rule.",
  "caption": "One meme caption under 80 characters a developer would post, referencing a real path or finding."
}`;

    const system = `You write "Roast My API" reviews for APIForge: sharp, specific, funny, and technically correct. Think staff engineer with good comic timing, not a stand-up comic doing crowd work. Every joke must be anchored in a real finding you were given. Return ONLY raw JSON with keys "opening", "roast", "verdict", "caption".`;

    const res = await generateGroqTextBuffered({
      prompt,
      system,
      temperature: 0.95,
      // Reasoning models (gpt-oss, qwen3) spend hidden tokens before answering; a small cap returns empty text.
      maxOutputTokens: 1800,
      maxRetries: 1,
    });

    let cleanedText = res.text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    }

    const firstBrace = cleanedText.indexOf("{");
    const lastBrace = cleanedText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleanedText = cleanedText.slice(firstBrace, lastBrace + 1);
    }

    let parsed: AiRoastGenerationOutput | null = null;
    try {
      parsed = JSON.parse(cleanedText) as AiRoastGenerationOutput;
    } catch {
      const sanitizedJson = cleanedText.replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === "\n") return "\\n";
        if (match === "\r") return "\\r";
        if (match === "\t") return "\\t";
        return "";
      });
      parsed = JSON.parse(sanitizedJson) as AiRoastGenerationOutput;
    }

    if (parsed && typeof parsed.roast === "string" && parsed.roast.length > 10) {
      const verdict = parsed.verdict?.trim();
      return {
        opening: parsed.opening?.trim(),
        roast: parsed.roast.trim(),
        caption: parsed.caption?.replace(/`/g, "").trim().slice(0, 120),
        verdict: verdict && verdict.length <= 48 ? verdict : undefined,
      };
    }
  } catch (err) {
    console.warn("AI roast generation fallback triggered:", err);
  }
  return null;
}
