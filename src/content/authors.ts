import type { Author } from "./types";

export const CANONICAL_AUTHOR: Author = {
  id: "rishab",
  name: "Rishab Bhatt",
  avatar: "/images/RishabPFP.png",
  website: "https://apiforge.info",
  github: "https://github.com/rishibhatt",
  linkedin: "https://linkedin.com/in/rishabbhatt",
  x: "https://x.com/Rishi_o07",
};

export const AUTHORS_REGISTRY: Record<string, Author> = {
  rishab: CANONICAL_AUTHOR,
};

export function getAuthor(authorKeyOrName?: string): Author {
  if (!authorKeyOrName) return CANONICAL_AUTHOR;
  const key = authorKeyOrName.toLowerCase();
  return AUTHORS_REGISTRY[key] || CANONICAL_AUTHOR;
}
