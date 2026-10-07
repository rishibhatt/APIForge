import Link from "next/link";
import type { Author } from "@/content/types";
import { formatDate } from "./labels";
import styles from "./content.module.css";

export interface ArticleAuthorProps {
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: string;
  topic?: string;
  topicHref?: string;
}

/**
 * Article header metadata, placed below the title and lede:
 * a mono micro-label row (updated date, reading time, topic) and the author line.
 */
export default function ArticleAuthor({
  author,
  publishedAt,
  updatedAt,
  readingTime,
  topic,
  topicHref,
}: ArticleAuthorProps) {
  const showUpdated = Boolean(updatedAt && updatedAt !== publishedAt);
  const stampDate = showUpdated ? (updatedAt as string) : publishedAt;

  return (
    <div className={styles.byline}>
      <ul className={styles.metaRow} aria-label="Article details">
        <li>
          {showUpdated ? "Updated " : "Published "}
          <time dateTime={stampDate}>{formatDate(stampDate)}</time>
        </li>
        {readingTime && <li>{readingTime}</li>}
        {topic && (
          <li>
            {topicHref ? (
              <Link href={topicHref} className={styles.topicTag}>
                {topic}
              </Link>
            ) : (
              <span className={styles.topicTag}>{topic}</span>
            )}
          </li>
        )}
      </ul>

      <div className={styles.bylineAuthor}>
        {author.avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={author.avatar} alt="" className={styles.bylineAvatar} width={36} height={36} />
        ) : (
          <span className={styles.bylineAvatarFallback} aria-hidden>
            {author.name.charAt(0)}
          </span>
        )}
        <div className={styles.bylineText}>
          <span className={styles.bylineName}>
            {author.website ? (
              <a href={author.website} rel="author">
                {author.name}
              </a>
            ) : (
              author.name
            )}
          </span>
          {showUpdated && (
            <span className={styles.bylineMeta}>
              First published <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
