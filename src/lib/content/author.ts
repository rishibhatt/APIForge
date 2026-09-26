import type { Author } from "@/content/types";

export const CANONICAL_AUTHOR: Author = {
  name: "Rishab Bhatt",
  role: "Founder & Developer of APIForge",
  avatar: "/images/authors/rishab-bhatt.png",
  website: "https://rishieee.netlify.app/",
  github: "https://github.com/rishibhatt",
  linkedin: "https://www.linkedin.com/in/rishab-bhatt-7ba7111ab/",
  x: "https://x.com/Rishi_o07",
  bio: "Creator of APIForge. Developer passionate about API design, OpenAPI standards, automated test generation, and developer productivity tooling.",
};

export const AUTHORS: Record<string, Author> = {
  rishab: CANONICAL_AUTHOR,
  default: CANONICAL_AUTHOR,
};

export function getAuthor(key: string = "rishab"): Author {
  return AUTHORS[key] || CANONICAL_AUTHOR;
}
