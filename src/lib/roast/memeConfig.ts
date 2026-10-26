export const ROAST_MEME_IDS = [
  "perfect",
  "slapping",
  "eww",
  "confused",
  "classic",
  "who_are_you",
  "mai_aa_jau",
  "batman",
  "singham",
] as const;

export type RoastMemeId = (typeof ROAST_MEME_IDS)[number];

const MEME_ASSETS: Record<RoastMemeId, string> = {
  perfect: "/memes/perfect-v1.mp4",
  slapping: "/memes/slapping-v1.mp4",
  eww: "/memes/eww-v1.mp4",
  confused: "/memes/confused-v1.mp4",
  classic: "/memes/this-is-classic-v1.mp4",
  who_are_you: "/memes/wait-a-minute-who-are-you-v1.mp4",
  mai_aa_jau: "/memes/mai-aajau-kya.mp4",
  batman: "/memes/man-turning-batman.mp4",
  singham: "/memes/singham-slapping-man.mp4",
};

export interface RoastMemeStyle {
  name: string;
  mood:
    | "aggressive"
    | "confused"
    | "disgusted"
    | "celebratory"
    | "ironic"
    | "suspicious"
    | "threatening"
    | "dramatic";
  tone: string;
  style: string;
}

const MEME_STYLES: Record<RoastMemeId, RoastMemeStyle> = {
  perfect: {
    name: "Perfect",
    mood: "celebratory",
    tone: "confident, smug, ironic",
    style: "celebrate perfection or ironically praise something questionable",
  },
  slapping: {
    name: "Slapping",
    mood: "aggressive",
    tone: "aggressive, chaotic, confrontational",
    style: "call out obvious API crimes dramatically",
  },
  eww: {
    name: "Eww",
    mood: "disgusted",
    tone: "disgusted, judgmental, grossed-out",
    style: "make bad API decisions sound physically painful",
  },
  confused: {
    name: "Confused",
    mood: "confused",
    tone: "confused, bewildered, sarcastic",
    style: "act like the API makes absolutely no sense",
  },
  classic: {
    name: "Classic",
    mood: "ironic",
    tone: "deadpan, sarcastic, veteran developer",
    style: "mock classic REST/API anti-patterns",
  },
  who_are_you: {
    name: "Who Are You?",
    mood: "suspicious",
    tone: "suspicious, investigative, absurd",
    style: "question the existence, identity, documentation or purpose of the endpoint",
  },
  mai_aa_jau: {
    name: "Main Aa Jaun Kya?",
    mood: "threatening",
    tone: "calm, menacing, last-warning host energy",
    style: "warn the team that APIForge is one more bad decision away from stepping in",
  },
  batman: {
    name: "Batman Turn",
    mood: "dramatic",
    tone: "brooding, cinematic, origin-story",
    style: "turn a painful API moment into the developer's dark origin story",
  },
  singham: {
    name: "Singham Slap",
    mood: "aggressive",
    tone: "gleeful, merciless, enjoying it too much",
    style: "deliver justice to API crimes with a big smile, one slap per finding",
  },
};

export interface RoastMemeConfig {
  id: RoastMemeId;
  src: string;
  poster?: string;
  mood: RoastMemeStyle["mood"];
  tags: string[];
  name: string;
  tone: string;
  style: string;
  scoreRange: [number, number];
  captionTemplates: string[];
}

export const ROAST_MEMES: RoastMemeConfig[] = [
  {
    id: "slapping",
    src: MEME_ASSETS.slapping,
    ...MEME_STYLES.slapping,
    tags: ["many-issues", "high-severity", "inconsistency", "chaos", "questionable"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge reviewing your API endpoints be like...",
      "When APIForge finds the 17th naming inconsistency in one file...",
      "APIForge interrogating your HTTP method choices at 2 AM...",
      "Every time a GET request brings a 5MB JSON body payload...",
      "When you add verbs to every path URL in production...",
    ],
  },
  {
    id: "confused",
    src: MEME_ASSETS.confused,
    ...MEME_STYLES.confused,
    tags: ["unexpected", "inconsistent", "weird-design", "mixed-conventions", "verb-mismatch"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge trying to understand your API design choices be like...",
      "When every endpoint path follows a completely different casing rule...",
      "Reading this API documentation looking for missing parameter descriptions...",
      "When HTTP methods and path verbs start arguing in the same spec...",
      "Trying to calculate the nested path depth of /v1/users/id/orders/item/id/status...",
    ],
  },
  {
    id: "eww",
    src: MEME_ASSETS.eww,
    ...MEME_STYLES.eww,
    tags: ["questionable", "embarrassing", "bad-pattern", "cringe", "no-docs"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge finding another questionable un-documented endpoint...",
      "When the API passes structural validation but spiritually fails...",
      "Opening endpoint number 23 and reading the response schema...",
      "Looking at URL paths with camelCase parameters in production...",
      "When a 500 Internal Error body returns plain HTML error page...",
    ],
  },
  {
    id: "classic",
    src: MEME_ASSETS.classic,
    ...MEME_STYLES.classic,
    tags: ["classic", "anti-pattern", "legacy", "irony", "predictable-error", "classic-mistake"],
    scoreRange: [0, 100],
    captionTemplates: [
      "Ah yes, classic API design... returning 200 OK with error: true in the JSON body.",
      "When the endpoint path is literally /get_user_info_final_v2_new... this is classic.",
      "Classic: POST request returning an empty body with zero status headers.",
      "APIForge inspecting classic API anti-patterns at 3 AM be like...",
      "This is classic... 15 query parameters and zero schema descriptions.",
      "Ah yes, classic... camelCase, snake_case, and kebab-case all in one payload.",
    ],
  },
  {
    id: "who_are_you",
    src: MEME_ASSETS.who_are_you,
    ...MEME_STYLES.who_are_you,
    tags: ["who-are-you", "mystery-endpoint", "unauthorized", "unauthenticated", "weird-operation-id", "unknown-schema"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge looking at an unauthenticated admin endpoint: Wait a minute... WHO ARE YOU?",
      "When an unmodeled endpoint with no description shows up in the spec: Wait a minute... WHO ARE YOU?",
      "APIForge inspecting operationId 'doStuff_v2': Wait a minute... WHO ARE YOU?",
      "When a GET request asks for basic auth AND bearer token AND api key: Wait a minute... WHO ARE YOU?",
      "Looking at a path named /v1/x92834729384 like: Wait a minute... WHO ARE YOU?",
      "When a 404 response payload returns a 2MB binary audio buffer: Wait a minute... WHO ARE YOU?",
    ],
  },
  {
    id: "perfect",
    src: MEME_ASSETS.perfect,
    ...MEME_STYLES.perfect,
    tags: ["clean", "consistent", "excellent", "well-documented"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge trying to find something to roast in a clean specification...",
      "When the API is annoyingly clean and adheres to RFC guidelines...",
      "When the developer actually read the REST API design specification...",
      "Inspecting schemas and finding zero naming flaws be like...",
      "Rare footage of a pristine, enterprise-ready OpenAPI 3.1 document...",
    ],
  },
  {
    id: "mai_aa_jau",
    src: MEME_ASSETS.mai_aa_jau,
    ...MEME_STYLES.mai_aa_jau,
    tags: ["warning", "repeat-offender", "breaking-change", "ignored-review", "last-chance"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge watching you return 200 OK with error: true: Main aa jaun kya?",
      "When the PR adds /getUserDataNew right next to /getUserData: Main aa jaun kya?",
      "Team says the API docs are 'self-explanatory'. Main aa jaun kya?",
      "Third hotfix on the same endpoint this week. Main aa jaun kya?",
      "Shipping a breaking change without bumping the version: Main aa jaun kya?",
    ],
  },
  {
    id: "batman",
    src: MEME_ASSETS.batman,
    ...MEME_STYLES.batman,
    tags: ["origin-story", "transformation", "auto-fix", "redemption", "dark-turn"],
    scoreRange: [0, 100],
    captionTemplates: [
      "Junior dev before the first API review vs. after the 40th comment...",
      "Me after the frontend team blamed my API for the third time this sprint...",
      "The backend dev who documented every endpoint after one 3 AM incident...",
      "When you decide the 200 OK with error: true ends tonight...",
      "Mild-mannered developer by day. Schema enforcer by night.",
    ],
  },
  {
    id: "singham",
    src: MEME_ASSETS.singham,
    ...MEME_STYLES.singham,
    tags: ["many-issues", "high-severity", "security", "justice", "repeat-offender"],
    scoreRange: [0, 100],
    captionTemplates: [
      "APIForge serving justice to every undocumented endpoint, one slap at a time...",
      "When the same naming bug shows up in 12 endpoints and you get to fix all of them...",
      "Code reviewer smiling through every slap on a GET with a request body...",
      "APIForge vs. 500 errors that return an HTML page, round 7...",
      "When the endpoint has no auth and you're the one doing the security review...",
    ],
  },
];
