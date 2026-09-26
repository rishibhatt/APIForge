import type { ContentBlock } from "@/content/types";
import ArticleCodeBlock from "./ArticleCodeBlock";
import ArticleCTA from "./ArticleCTA";
import styles from "./content.module.css";

export interface ArticleContentProps {
  blocks: ContentBlock[];
}

export default function ArticleContent({ blocks }: ArticleContentProps) {
  return (
    <div className={styles.articleBody}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={idx} className={styles.paragraph}>
                {block.text}
              </p>
            );

          case "heading": {
            const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
            const headingId = block.id || block.text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <Tag key={idx} id={headingId} className={styles[`heading${block.level}`]}>
                {block.text}
              </Tag>
            );
          }

          case "code":
            return (
              <ArticleCodeBlock
                key={idx}
                language={block.language}
                code={block.code}
                filename={block.filename}
                caption={block.caption}
              />
            );

          case "quote":
            return (
              <blockquote key={idx} className={styles.quote}>
                <p>&quot;{block.text}&quot;</p>
                {block.author && <cite>— {block.author}</cite>}
              </blockquote>
            );

          case "list":
            return block.ordered ? (
              <ol key={idx} className={styles.orderedList}>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className={styles.unorderedList}>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );

          case "callout":
            return (
              <div key={idx} className={`${styles.callout} ${styles[`callout_${block.variant || "info"}`]}`}>
                {block.title && <div className={styles.calloutTitle}>{block.title}</div>}
                <div className={styles.calloutText}>{block.text}</div>
              </div>
            );

          case "table":
            return (
              <div key={idx} className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {block.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {block.caption && <p className={styles.tableCaption}>{block.caption}</p>}
              </div>
            );

          case "tool":
            return (
              <ArticleCTA
                key={idx}
                title={block.title}
                description={block.description}
                buttonText={block.buttonText}
                href={block.href}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
