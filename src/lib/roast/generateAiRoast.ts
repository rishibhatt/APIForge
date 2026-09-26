import { generateGroqTextBuffered } from "@/lib/groq-generate-buffered";
import type { RoastPattern, RoastStrength } from "./types";

export interface AiRoastGenerationOutput {
  opening?: string;
  roast?: string;
  caption?: string;
}

export async function generateAiRoastContent(params: {
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
      .map((p) => `- ${p.category}: ${p.technicalExplanation} (${p.count} endpoints)`)
      .join("\n");

    const prompt = `API Specification Findings:
- Score: ${params.score}/100 (${params.verdict})
- Classifier Personality: ${params.personality}
- Total Operations: ${params.totalEndpoints}
- Major Architectural Flaws Detected:
${patternsSummary || "- Surprisingly few critical flaws detected."}

Generate a savage, hilarious, unhinged-yet-factually-accurate roast in raw JSON:
{
  "opening": "One brutal, witty opening line matching the score intensity.",
  "roast": "2-3 ruthless, developer-native sentences roasting the specific GET-with-body, naming inconsistency, missing error schemas, or REST crimes.",
  "caption": "One punchy video meme caption referencing the specific API crimes (e.g. 'APIForge discovering your POST /users/search endpoint')."
}`;

    const system = `You are a legendary, ruthlessly savage Principal Staff Engineer reviewing an API pull request for "Roast My API".
Your goal is to deliver brutal, hilarious, developer-native roasts that attack bad REST choices, camelCase URLs, GET requests with bodies, missing 4xx schemas, and unversioned endpoints.
NEVER use polite corporate filler or generic praise.
Every output must be fresh, unique, witty, and savage.
Return ONLY raw JSON with keys "opening", "roast", "caption". Do not wrap in markdown code blocks.`;

    const res = await generateGroqTextBuffered({
      prompt,
      system,
      temperature: 0.88,
      maxOutputTokens: 350,
      maxRetries: 1,
    });

    let cleanedText = res.text.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(json)?/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleanedText) as AiRoastGenerationOutput;
    if (parsed && typeof parsed.roast === "string" && parsed.roast.length > 10) {
      return {
        opening: parsed.opening?.trim(),
        roast: parsed.roast.trim(),
        caption: parsed.caption?.trim(),
      };
    }
  } catch (err) {
    console.warn("AI roast generation fallback triggered:", err);
  }
  return null;
}
