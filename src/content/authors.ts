import type { Author } from "./types";

export const CANONICAL_AUTHOR: Author = {
  id: "rishab",
  name: "Rishab Bhatt",
  role: "Founder & Lead Architect, APIForge",
  avatar: "/icon.png",
  website: "https://apiforge.info",
  github: "https://github.com/rishibhatt",
  linkedin: "https://linkedin.com/in/rishabbhatt",
  x: "https://x.com/Rishi_o07",
  bio: "Full-stack API engineer and creator of APIForge. Specialized in OpenAPI specification analysis, automated API linting, contract testing, and RESTful architecture.",
};

export const AUTHORS_REGISTRY: Record<string, Author> = {
  rishab: CANONICAL_AUTHOR,
};

export function getAuthor(authorKeyOrName?: string): Author {
  if (!authorKeyOrName) return CANONICAL_AUTHOR;
  const key = authorKeyOrName.toLowerCase();
  return AUTHORS_REGISTRY[key] || CANONICAL_AUTHOR;
}
