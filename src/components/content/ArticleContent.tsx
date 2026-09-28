import type { ContentBlock } from "@/content/types";
import ArticleCodeBlock from "./ArticleCodeBlock";
import ArticleCTA from "./ArticleCTA";
import FAQSection from "./FAQSection";
import styles from "./content.module.css";

export interface ArticleContentProps {
  blocks: ContentBlock[];
}

export default function ArticleContent({ blocks }: ArticleContentProps) {
  if (!blocks || blocks.length === 0) return null;

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

          case "summary":
          case "tip":
          case "warning":
            return (
              <div key={idx} className={`${styles.callout} ${styles[`callout_${block.type === "warning" ? "danger" : "info"}`]}`}>
                <div className={styles.calloutTitle}>{block.title}</div>
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

          case "comparison":
            return (
              <div key={idx} className={styles.tableWrapper}>
                {block.title && <h3 className={styles.heading3}>{block.title}</h3>}
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
              </div>
            );

          case "checklist":
            return (
              <div key={idx} className={styles.callout + " " + styles.callout_info}>
                {block.title && <div className={styles.calloutTitle}>{block.title}</div>}
                <ul className={styles.unorderedList}>
                  {block.items.map((item, i) => (
                    <li key={i}>
                      {item.done ? "✅ " : "⏳ "}
                      <strong>{item.text}</strong>
                      {item.detail && <span> — {item.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );

          case "steps":
            return (
              <div key={idx} className={styles.articleBody}>
                {block.title && <h3 className={styles.heading3}>{block.title}</h3>}
                <ol className={styles.orderedList}>
                  {block.steps.map((step, i) => (
                    <li key={i}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                      {step.code && (
                        <ArticleCodeBlock language="yaml" code={step.code} />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );

          case "example":
          case "badExample":
          case "goodExample":
            return (
              <div key={idx} className={`${styles.callout} ${block.type === "badExample" ? styles.callout_danger : styles.callout_info}`}>
                <div className={styles.calloutTitle}>
                  {block.type === "badExample" ? "❌ " : "✅ "}
                  {block.title}
                </div>
                <ArticleCodeBlock language={block.language} code={block.code} />
                <p className={styles.calloutText}>{block.explanation}</p>
              </div>
            );

          case "decisionTree":
            return (
              <div key={idx} className={styles.tableWrapper}>
                <h3 className={styles.heading3}>{block.title}</h3>
                {block.description && <p className={styles.paragraph}>{block.description}</p>}
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Scenario / Condition</th>
                      <th>Recommendation</th>
                      <th>Alternative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.nodes.map((node, i) => (
                      <tr key={i}>
                        <td><strong>{node.condition}</strong></td>
                        <td>{node.recommendation}</td>
                        <td>{node.alternative || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "tool":
          case "cta":
            return (
              <ArticleCTA
                key={idx}
                title={block.title}
                description={block.description}
                buttonText={block.buttonText}
                href={block.href}
              />
            );

          case "faq":
            return <FAQSection key={idx} faqs={block.faqs} />;

          case "externalReference":
            return (
              <p key={idx} className={styles.paragraph}>
                🔗 <strong>Reference:</strong>{" "}
                <a href={block.url} target="_blank" rel="noopener noreferrer" className={styles.breadcrumbLink}>
                  {block.title} ({block.source})
                </a>
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
