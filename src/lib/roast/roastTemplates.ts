export interface RoastTemplateVariant {
  id: string;
  structure: "A" | "B" | "C" | "D" | "E" | "F";
  intensity: 1 | 2 | 3 | 4 | 5; // 1: clean, 2: teasing, 3: brutal, 4: savage, 5: nuclear
  categories?: string[];
  requiredRules?: string[];
  minScore?: number;
  maxScore?: number;
  format: (params: {
    score: number;
    personality: string;
    topFindingText?: string;
    secondaryFindingText?: string;
    strengthText?: string;
    endpointCount: number;
    issueCount: number;
  }) => string;
}

export const OPENINGS_BY_INTENSITY: Record<number, string[]> = {
  1: [
    "Annoyingly clean. We spent 20 minutes trying to find something to criticize.",
    "We came prepared to tear this API apart. Unfortunately, you actually read the OpenAPI specification.",
    "Your API is behaving. We are respectfully disappointed.",
  ],
  2: [
    "Your API runs, but HTTP conventions appear to be in a shaky long-distance relationship.",
    "Not terrible. But your endpoints definitely made some questionable life choices.",
    "The API is functional. The naming conventions, however, have entered witness protection.",
  ],
  3: [
    "You shipped this API. Now we get to talk about what you actually shipped.",
    "Your endpoints couldn't agree on a naming convention, so they apparently formed a coalition and gave up.",
    "This API has the confidence of production software and the planning of a Friday-night hackathon.",
  ],
  4: [
    "We ran your specification through our engine. Someone had a very wild afternoon.",
    "This API isn't broken. It's just making several extremely confident decisions that happen to be wrong.",
    "REST wasn't misunderstood here. It was simply not consulted.",
  ],
  5: [
    "At this point, the API isn't asking for feedback. It's asking for witness protection.",
    "We stopped reviewing the API and started documenting the evidence.",
    "Your documentation is so sparse that the next developer will need archaeological equipment.",
  ],
};

export const ROAST_STRUCTURE_POOL: RoastTemplateVariant[] = [
  // Structure A: Observation -> Consequence -> Punchline
  {
    id: "struct-a-general",
    structure: "A",
    intensity: 3,
    minScore: 30,
    maxScore: 84,
    format: ({ topFindingText, endpointCount, issueCount }) =>
      topFindingText
        ? `${topFindingText} Across ${endpointCount} endpoints, we logged ${issueCount} issues. HTTP looked at this design and quietly left the room.`
        : `Your API registered ${issueCount} total issues across ${endpointCount} endpoints. HTTP looked at this design and quietly left the room.`,
  },
  // Structure B: We found A, then B -> Stopped calling it consistency
  {
    id: "struct-b-inconsistency",
    structure: "B",
    intensity: 4,
    minScore: 0,
    maxScore: 69,
    format: ({ topFindingText, secondaryFindingText }) =>
      topFindingText && secondaryFindingText
        ? `We found ${topFindingText.toLowerCase()} Then we found ${secondaryFindingText.toLowerCase()} At that point, we stopped calling it consistency.`
        : `We found path casing conflicts across multiple routes. Then we found missing error contracts. At that point, we stopped calling it consistency.`,
  },
  // Structure C: Positive -> Negative -> Sarcastic conclusion
  {
    id: "struct-c-mixed",
    structure: "C",
    intensity: 2,
    minScore: 50,
    maxScore: 89,
    format: ({ strengthText, topFindingText }) =>
      strengthText && topFindingText
        ? `Your API has ${strengthText.toLowerCase()} Unfortunately, it also has ${topFindingText.toLowerCase()} So congratulations on a truly chaotic compromise.`
        : `Your API has decent operation intent. Unfortunately, its path structure is a wildcard. So congratulations on a truly chaotic compromise.`,
  },
  // Structure D: Doing WHAT? -> Explanation -> Explain yourself
  {
    id: "struct-d-what",
    structure: "D",
    intensity: 4,
    minScore: 0,
    maxScore: 59,
    format: ({ topFindingText }) =>
      topFindingText
        ? `Your specification is doing WHAT? ${topFindingText} Please explain yourself.`
        : `Your URI routes are doing WHAT? CamelCase and verbs are running wild in your endpoints. Please explain yourself.`,
  },
  // Structure E: Score + Confidence + Finding
  {
    id: "struct-e-score",
    structure: "E",
    intensity: 3,
    minScore: 0,
    maxScore: 79,
    format: ({ score, topFindingText }) =>
      `Quality Score: ${score}/100. Confidence: questionable. Primary finding: ${topFindingText || "Multiple architectural anti-patterns detected."}`,
  },
  // Structure F: Extremely confident wrong decisions
  {
    id: "struct-f-confident",
    structure: "F",
    intensity: 3,
    minScore: 20,
    maxScore: 75,
    format: ({ endpointCount, issueCount }) =>
      `The API isn't broken. It's just making several extremely confident decisions across ${endpointCount} endpoints that happen to produce ${issueCount} issues.`,
  },
];

export const RULE_SPECIFIC_ROASTS: Record<string, string[]> = {
  ACTION_IN_PATH: [
    "Putting verbs in URL paths is like hitting 'Send' on a letter with 'SEND THIS' written on the envelope.",
    "HTTP verbs brought GET, POST, and DELETE to the party. Your URLs didn't need to rename them.",
  ],
  GET_WITH_BODY: [
    "GET requests with request bodies. Bold choice. HTTP semantics wept.",
    "GET woke up today and decided RFC specifications were merely optional guidelines.",
  ],
  VERB_METHOD_MISMATCH: [
    "Double verbing detected. POST is already creating; the URL path didn't need to shout it.",
    "POST /create. Why double-down on the action when HTTP already did the work?",
  ],
  CAMEL_CASE_PATH: [
    "CamelCase in URL routes is like putting capital letters in the middle of a domain name.",
    "Path casing switches mid-sentence like an unformatted JSON dump.",
  ],
  UNDERSCORE_PATH: [
    "Underscores in URLs belong in 2004 database tables, not modern API routes.",
    "Hyphens exist so URLs don't look like raw SQL column exports.",
  ],
  MISSING_SUCCESS_RESPONSE: [
    "Your API success strategy is a total surprise mechanic. No 2xx response schemas defined.",
    "Operations don't document success responses. Integrators are essentially guessing if it worked.",
  ],
  MISSING_ERROR_RESPONSE: [
    "Every failure currently comes with a mystery box instead of a structured 4xx/5xx error schema.",
    "When things go wrong, your API leaves developers to read tea leaves.",
  ],
  UNDOCUMENTED_OPERATIONS: [
    "Your documentation is so sparse that the next developer will need archaeological equipment.",
    "Endpoints are missing summaries. It's API design as a riddle.",
  ],
  MISSING_VERSIONING: [
    "No major version in the URL path. One update and client applications live dangerously.",
    "Living without API versioning is extreme sports for backend developers.",
  ],
};

export function getVerdictByScore(score: number): string {
  if (score >= 85) return "Annoyingly clean. We had to dig to find anything to criticize.";
  if (score >= 70) return "Not terrible. Not innocent either.";
  if (score >= 50) return "Technically alive. Architecturally concerning.";
  if (score >= 30) return "A very ambitious draft pretending to be production.";
  return "At this point, your API is asking for witness protection.";
}
