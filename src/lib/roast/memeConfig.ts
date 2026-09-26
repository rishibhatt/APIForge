export interface RoastMemeConfig {
  id: "eww" | "confused" | "perfect" | "slapping";
  src: string;
  poster?: string;
  mood: "aggressive" | "confused" | "disgusted" | "celebratory";
  tags: string[];
  scoreRange: [number, number];
  captionTemplates: string[];
}

export const ROAST_MEMES: RoastMemeConfig[] = [
  {
    id: "slapping",
    src: "/memes/slapping-v1.mp4",
    mood: "aggressive",
    tags: ["many-issues", "high-severity", "inconsistency", "chaos", "questionable"],
    scoreRange: [0, 55],
    captionTemplates: [
      "APIForge reviewing your API be like...",
      "When APIForge finds the 17th naming inconsistency...",
      "APIForge interrogating your endpoints at 2 AM...",
      "Every time a GET request brings a JSON body...",
    ],
  },
  {
    id: "confused",
    src: "/memes/confused-v1.mp4",
    mood: "confused",
    tags: ["unexpected", "inconsistent", "weird-design", "mixed-conventions", "verb-mismatch"],
    scoreRange: [30, 75],
    captionTemplates: [
      "APIForge trying to understand your API be like...",
      "When every endpoint follows a different naming convention...",
      "Reading this API documentation like...",
      "When HTTP methods and path verbs start arguing...",
    ],
  },
  {
    id: "eww",
    src: "/memes/eww-v1.mp4",
    mood: "disgusted",
    tags: ["questionable", "embarrassing", "bad-pattern", "cringe", "no-docs"],
    scoreRange: [15, 65],
    captionTemplates: [
      "APIForge finding another questionable endpoint...",
      "When the API passes validation but spiritually fails...",
      "Opening endpoint number 23 like...",
      "Looking at URL paths with camelCase in production...",
    ],
  },
  {
    id: "perfect",
    src: "/memes/perfect-v1.mp4",
    mood: "celebratory",
    tags: ["clean", "consistent", "excellent", "well-documented"],
    scoreRange: [75, 100],
    captionTemplates: [
      "APIForge trying to find something to roast...",
      "When the API is annoyingly clean...",
      "When the developer actually read the REST guidelines...",
      "Inspecting schemas and finding zero flaws be like...",
    ],
  },
];
