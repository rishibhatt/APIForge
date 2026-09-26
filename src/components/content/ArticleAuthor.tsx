import type { Author } from "@/content/types";
import styles from "./content.module.css";

export interface ArticleAuthorProps {
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: string;
}

export default function ArticleAuthor({
  author,
  publishedAt,
  updatedAt,
  readingTime,
}: ArticleAuthorProps) {
  return (
    <div className={styles.authorBox}>
      <div className={styles.authorAvatar}>
        {author.name.charAt(0)}
      </div>
      <div className={styles.authorInfo}>
        <div className={styles.authorHeader}>
          <span className={styles.authorName}>{author.name}</span>
          <span className={styles.authorRole}>{author.role}</span>
        </div>
        <div className={styles.authorMeta}>
          <span>Published: {publishedAt}</span>
          {updatedAt && <span> · Updated: {updatedAt}</span>}
          {readingTime && <span> · {readingTime}</span>}
        </div>
        <div className={styles.authorLinks}>
          {author.website && (
            <a href={author.website} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          )}
          {author.github && (
            <a href={author.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          )}
          {author.linkedin && (
            <a href={author.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          )}
          {author.x && (
            <a href={author.x} target="_blank" rel="noopener noreferrer">
              X (Twitter)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
