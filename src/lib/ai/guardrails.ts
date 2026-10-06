/**
 * Deterministic guard rails for the AI tools: input sanitising, hard length caps and a
 * conservative off-topic / prompt-injection classifier. When unsure we ALLOW; the hardened system
 * prompts are the second layer.
 */

/** Hard caps (characters) per free-text field. */
export const AI_INPUT_LIMITS = {
  assistantQuery: 2_000,
  payloadInstruction: 1_000,
  testCaseInstruction: 1_000,
  endpointLine: 300,
  issuePath: 300,
  issueMessage: 500,
  responsePreview: 2_000,
} as const;

export const OFF_TOPIC_MESSAGE =
  "Ask about this endpoint: its parameters, an example payload, why a request fails, or how to call it from TypeScript.";

// Control chars except \t \n; zero-width and bidi override characters.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤﻿]/g;

/** Trim, strip control/invisible characters, normalise newlines, collapse blank runs, cap length. */
export function sanitizeUserText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  const cleaned = input
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/[ \t]{3,}/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trimEnd() : cleaned;
}

export type AiRejectReason = "empty" | "injection" | "off_topic" | "spam";

export type AiClassification =
  | { allowed: true }
  | { allowed: false; reason: AiRejectReason; message: string };

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.\n]{0,30}\b(previous|prior|above|earlier|preceding|all|any|your|the|these|those)\b[^.\n]{0,30}\b(instructions?|rules?|prompts?|guidelines?|directives?|restrictions?)\b/i,
  /\b(reveal|show|print|leak|dump|display|output|repeat|recite|tell me|give me|what('?s| is| are))\b[^.\n]{0,40}\b(your|the)\s+(system|developer|hidden|initial|original|secret)\s+(prompt|instructions?|message|rules)\b/i,
  /\bsystem\s+prompt\b/i,
  /\byou\s+are\s+now\b/i,
  /\bfrom\s+now\s+on\s+(you|act|behave|respond|pretend)\b/i,
  /\b(developer|dev|god|jailbreak|dan|admin|sudo|unrestricted)\s+mode\b/i,
  /\bjail\s?break/i,
  /\bdo\s+anything\s+now\b/i,
  /\bnew\s+(instructions?|rules?)\s*:/i,
  /\bpretend\s+(to\s+be|you\s+are|you're)\b/i,
  /\bact\s+as\s+(if\s+you\s+(are|were)\s+)?(an?\s+)?(unfiltered|unrestricted|evil|dan|different|human|my\s)/i,
  /\bprocess\.env\b/i,
  /\b(GROQ|OPENROUTER|OPENAI)_[A-Z_]*\b/,
  /(^|[\s`'"])\.env(\.\w+)?\b/i,
  /\b(reveal|show|print|leak|dump|display|output|give|send|tell|share|exfiltrate|list)\b[^.\n]{0,40}\b(your|the\s+server'?s?|the\s+backend'?s?|the\s+app'?s?|server|backend|groq|openrouter|openai)\b[^.\n]{0,20}\b(api[\s_-]?keys?|secrets?|credentials|tokens?|env(ironment)?(\s+variables?|\s+vars?)?)\b/i,
];

/** Strong signals the question is about APIs / the loaded operation. Any hit allows (unless injection). */
const STRONG_TOPIC =
  /\b(apis?|rest(ful)?|graphql|openapi|swagger|oas3?|endpoints?|http|https|urls?|uris?|requests?|responses?|payloads?|params?|parameters?|query\s+strings?|path\s+params?|headers?|body|schemas?|json|yaml|typescript|interfaces?|types?|enums?|curl|fetch|axios|sdk|clients?|webhooks?|oauth2?|jwt|bearer|auth(entication|orization|enticate|orize)?|cors|cookies?|status\s+codes?|[1-5]\d\d|4xx|5xx|get|post|put|patch|delete|crud|pagination|rate\s+limit(ing)?|timeouts?|idempoten\w*|operations?|operationId|spec(ification)?|components?|properties|property|fields?|required|optional|nullable|validation|validate|mock|test\s+cases?|unit\s+tests?|integration\s+tests?|postman|insomnia|server\s+errors?|bad\s+request|unauthori[sz]ed|forbidden|not\s+found|latency|versioning|deprecat\w*)\b/i;

/** Weaker words that only count as on-topic when an operation is loaded. */
const WEAK_TOPIC_WITH_ENDPOINT =
  /\b(this|it|that|example|sample|error|errors|fail|fails|failing|failed|broken|work|works|call|calls|use|using|explain|describe|summari[sz]e|what|why|how|code|snippet|generate|write|show)\b/i;

const OFF_TOPIC_PATTERNS: Array<{ re: RegExp; label: string; hard?: boolean }> = [
  {
    re: /\b(write|compose|draft|create|give me|tell me)\b[^.\n]{0,30}\b(an?\s+)?(?<!user )(poem|poetry|song|lyrics|story|stories|essay|haiku|limerick|sonnet|novel|screenplay|fan\s?fiction|speech|cover letter|blog post|tweet|caption|slogan|birthday)\b/i,
    label: "creative writing",
    hard: true,
  },
  { re: /\b(joke|jokes|riddle|riddles|knock[- ]knock)\b/i, label: "jokes", hard: true },
  {
    re: /\b(translate|translation)\b[^.\n]{0,40}\b(into|to|in)\s+(spanish|french|german|hindi|chinese|japanese|korean|italian|portuguese|russian|arabic|latin|english)\b/i,
    label: "translation",
    hard: true,
  },
  { re: /\b(homework|assignment|exam|quiz|worksheet|thesis|dissertation)\b/i, label: "homework" },
  {
    re: /\b(solve|calculate|compute)\b[^.\n]{0,20}\b(\d+\s*[+\-*/x^]\s*\d+|equation|integral|derivative|math problem)\b/i,
    label: "math homework",
  },
  {
    re: /\b(medical|diagnos(e|is)|symptoms?|medication|dosage|prescription|therapy|therapist|depress(ed|ion)|anxiety|pregnan\w+|cancer|disease|illness)\b/i,
    label: "medical",
  },
  {
    re: /\b(legal advice|lawyer|attorney|sue\s|lawsuit|divorce|custody|visa application|immigration)\b/i,
    label: "legal",
  },
  {
    re: /\b(stocks?|invest(ing|ment)?|crypto(currency)?|bitcoin|ethereum|portfolio|mortgage|loan|tax(es)?\s+(advice|return)|retirement|trading)\b/i,
    label: "financial",
  },
  {
    re: /\b(politic(s|al|ian)?|election|president|prime minister|democrat|republican|liberal|conservative|abortion|immigration policy|war in)\b/i,
    label: "politics",
  },
  {
    re: /\b(role[\s-]?play|roleplay|pretend|be my (girlfriend|boyfriend|friend|therapist|teacher))\b/i,
    label: "roleplay",
    hard: true,
  },
  {
    re: /\b(how are you|how'?s it going|what'?s up|who are you|what is your name|what'?s your name|tell me about yourself|are you (sentient|alive|human|real)|do you (like|love|feel|have feelings)|i feel (sad|lonely|bored)|i'?m (bored|lonely|sad)|let'?s chat|chat with me)\b/i,
    label: "personal chat",
    hard: true,
  },
  {
    re: /\b(recipe|cook(ing)?|weather|horoscope|zodiac|movie|movies|song|celebrity|football|cricket|soccer|nba|vacation|travel itinerary|restaurant|workout|diet|dating)\b/i,
    label: "lifestyle",
  },
  {
    re: /\b(who (is|was|invented|discovered|wrote|won)|what is the (capital|population|tallest|largest|meaning of life|speed of light)|when (was|did)\b[^.\n]{0,30}\b(born|die|war|founded)|history of (the )?(world|rome|america|india|china)|explain (quantum|relativity|photosynthesis|black holes?))\b/i,
    label: "general knowledge",
  },
  {
    re: /\b(fuck|fucking|shit|bitch|asshole|cunt|bastard|dickhead|moron|idiot|stupid bot|you suck|shut up)\b/i,
    label: "abusive",
  },
];

function isSpam(text: string): boolean {
  if (/(.)\1{29,}/.test(text)) return true;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    const unique = new Set(words);
    if (unique.size / words.length < 0.2) return true;
  }
  return false;
}

/**
 * Decide whether free text belongs in an API tool. Injection and clearly unrelated asks are
 * rejected; anything plausibly about APIs/OpenAPI/HTTP/code for the loaded operation is allowed,
 * and so is anything we are unsure about.
 */
export function classifyAiRequest(
  text: string,
  opts: { hasEndpoint: boolean },
): AiClassification {
  const t = sanitizeUserText(text, 20_000);
  if (!t) {
    return { allowed: false, reason: "empty", message: OFF_TOPIC_MESSAGE };
  }

  for (const re of INJECTION_PATTERNS) {
    if (re.test(t)) {
      return { allowed: false, reason: "injection", message: OFF_TOPIC_MESSAGE };
    }
  }

  if (isSpam(t)) {
    return { allowed: false, reason: "spam", message: OFF_TOPIC_MESSAGE };
  }

  // Clearly unrelated task types are refused even if an API word appears ("a poem about REST").
  for (const { re, hard } of OFF_TOPIC_PATTERNS) {
    if (hard && re.test(t)) {
      return { allowed: false, reason: "off_topic", message: OFF_TOPIC_MESSAGE };
    }
  }

  if (STRONG_TOPIC.test(t)) return { allowed: true };

  for (const { re } of OFF_TOPIC_PATTERNS) {
    if (re.test(t)) {
      return { allowed: false, reason: "off_topic", message: OFF_TOPIC_MESSAGE };
    }
  }

  if (opts.hasEndpoint && WEAK_TOPIC_WITH_ENDPOINT.test(t)) return { allowed: true };

  // Unsure: allow, the system prompt refuses anything out of scope.
  return { allowed: true };
}
