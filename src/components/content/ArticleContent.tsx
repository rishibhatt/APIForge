import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentBlock, ContentType } from "@/content/types";
import { getKnowledgeItemBySlug } from "@/content/registry";
import ArticleCodeBlock from "./ArticleCodeBlock";
import ArticleCTA from "./ArticleCTA";
import FAQSection from "./FAQSection";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./content.module.css";

export interface ArticleContentProps {
  blocks: ContentBlock[];
  /**
   * When true, tool/cta, relatedContent and externalReference blocks are skipped here because
   * the page layout renders them once at the end (CTA, Related, Sources).
   */
  hoistEndMatter?: boolean;
}

const HOISTED_TYPES = new Set(["tool", "cta", "relatedContent", "externalReference"]);

const TYPE_PATHS: Record<ContentType, string> = {
  guide: "/guides",
  glossary: "/glossary",
  example: "/examples",
  comparison: "/compare",
  checklist: "/checklists",
  reference: "/reference",
  "tool-guide": "/guides",
};

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const CODE_PATTERN = /`([^`\n]+)`/g;

/** Plain text with `inline code` spans. */
function renderCode(text: string, keyBase: number): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of Array.from(text.matchAll(CODE_PATTERN))) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <code key={`${keyBase}-c${start}`} className={styles.inlineCode}>
        {match[1]}
      </code>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Supports [label](/internal-path), [label](https://external) and `code` inside text; other hrefs render as plain text.
export function renderInline(text: string): ReactNode {
  if (!text.includes("[") && !text.includes("`")) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of Array.from(text.matchAll(LINK_PATTERN))) {
    const [whole, label, href] = match;
    const start = match.index ?? 0;
    if (start > last) parts.push(...renderCode(text.slice(last, start), last));
    if (href.startsWith("/") && !href.startsWith("//")) {
      parts.push(
        <Link key={start} href={href} className={styles.inlineLink}>
          {label}
        </Link>,
      );
    } else if (href.startsWith("https://")) {
      parts.push(
        <a key={start} href={href} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
          {label}
        </a>,
      );
    } else {
      parts.push(label);
    }
    last = start + whole.length;
  }
  if (last < text.length) parts.push(...renderCode(text.slice(last), last));
  return parts;
}

type CalloutVariant = "info" | "tip" | "warning" | "danger";

const CALLOUT_ICONS: Record<CalloutVariant, string> = {
  info: "info",
  tip: "check_circle",
  warning: "warning",
  danger: "error",
};

function Callout({ variant, title, children }: { variant: CalloutVariant; title?: string; children: ReactNode }) {
  return (
    <aside className={`${styles.callout} ${styles.calloutWithIcon} ${styles[`callout_${variant}`]}`}>
      <MaterialIcon name={CALLOUT_ICONS[variant]} className={styles.calloutIcon} />
      <div className={styles.calloutBody}>
        {title && <p className={styles.calloutTitle}>{title}</p>}
        <div className={styles.calloutText}>{children}</div>
      </div>
    </aside>
  );
}

export default function ArticleContent({ blocks, hoistEndMatter = false }: ArticleContentProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={styles.articleBody}>
      {blocks.map((block, idx) => {
        if (hoistEndMatter && HOISTED_TYPES.has(block.type)) return null;
        switch (block.type) {
          case "paragraph":
            return (
              <p key={idx} className={styles.paragraph}>
                {renderInline(block.text)}
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
              <figure key={idx} className={styles.quote}>
                <blockquote>
                  <p>{renderInline(block.text)}</p>
                </blockquote>
                {block.author && <figcaption>{block.author}</figcaption>}
              </figure>
            );

          case "list":
            return block.ordered ? (
              <ol key={idx} className={styles.orderedList}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className={styles.unorderedList}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ul>
            );

          case "callout":
            return (
              <Callout key={idx} variant={block.variant || "info"} title={block.title}>
                {renderInline(block.text)}
              </Callout>
            );

          case "summary":
          case "tip":
          case "warning":
            return (
              <Callout
                key={idx}
                variant={block.type === "warning" ? "warning" : block.type === "tip" ? "tip" : "info"}
                title={block.title}
              >
                {renderInline(block.text)}
              </Callout>
            );

          case "table":
            return (
              <figure key={idx} className={styles.tableFigure}>
                <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label={block.caption || "Table"}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {block.headers.map((h, i) => (
                          <th key={i} scope="col">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{renderInline(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.caption && <figcaption className={styles.tableCaption}>{block.caption}</figcaption>}
              </figure>
            );

          case "comparison":
            return (
              <figure key={idx} className={styles.tableFigure}>
                {block.title && <h3 className={styles.heading3}>{block.title}</h3>}
                <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label={block.title || "Comparison"}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {block.headers.map((h, i) => (
                          <th key={i} scope="col">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{renderInline(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            );

          case "checklist":
            return (
              <div key={idx} className={styles.checklistBlock}>
                {block.title && <p className={styles.checklistTitle}>{block.title}</p>}
                <ul className={styles.checkList}>
                  {block.items.map((item, i) => (
                    <li key={i} className={styles.checkItem}>
                      <span
                        className={`${styles.checkBox} ${item.done ? styles.checkBoxDone : ""}`}
                        role="img"
                        aria-label={item.done ? "Done" : "To do"}
                      >
                        {item.done && <MaterialIcon name="check" size="xs" />}
                      </span>
                      <span className={styles.checkText}>
                        <strong>{renderInline(item.text)}</strong>
                        {item.detail && <span className={styles.checkDetail}>{renderInline(item.detail)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );

          case "steps":
            return (
              <div key={idx} className={styles.stepsBlock}>
                {block.title && <h3 className={styles.heading3}>{block.title}</h3>}
                <ol className={styles.stepList}>
                  {block.steps.map((step, i) => (
                    <li key={i} className={styles.stepItem}>
                      <span className={styles.stepNumber} aria-hidden>
                        {i + 1}
                      </span>
                      <div className={styles.stepBody}>
                        <p className={styles.stepTitle}>{step.title}</p>
                        <p className={styles.stepText}>{renderInline(step.description)}</p>
                        {step.code && <ArticleCodeBlock language="yaml" code={step.code} />}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            );

          case "example":
          case "badExample":
          case "goodExample": {
            const verdict =
              block.type === "badExample"
                ? { label: "Avoid", cls: styles.exampleVerdictBad, icon: "cancel" }
                : block.type === "goodExample"
                  ? { label: "Prefer", cls: styles.exampleVerdictGood, icon: "check_circle" }
                  : null;
            return (
              <section key={idx} className={styles.exampleBlock} aria-label={block.title}>
                <p className={styles.exampleHead}>
                  {verdict && (
                    <span className={`${styles.exampleVerdict} ${verdict.cls}`}>
                      <MaterialIcon name={verdict.icon} size="sm" />
                      {verdict.label}
                    </span>
                  )}
                  <span className={styles.exampleTitle}>{block.title}</span>
                </p>
                <ArticleCodeBlock language={block.language} code={block.code} />
                <p className={styles.exampleExplain}>{renderInline(block.explanation)}</p>
              </section>
            );
          }

          case "decisionTree":
            return (
              <figure key={idx} className={styles.tableFigure}>
                <h3 className={styles.heading3}>{block.title}</h3>
                {block.description && <p className={styles.paragraph}>{renderInline(block.description)}</p>}
                <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label={block.title}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">Scenario</th>
                        <th scope="col">Recommendation</th>
                        <th scope="col">Alternative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.nodes.map((node, i) => (
                        <tr key={i}>
                          <td><strong>{renderInline(node.condition)}</strong></td>
                          <td>{renderInline(node.recommendation)}</td>
                          <td>{node.alternative ? renderInline(node.alternative) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            );

          case "image":
            return (
              <figure key={idx} className={styles.mediaFigure}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} className={styles.mediaImage} loading="lazy" decoding="async" />
                {block.caption && <figcaption className={styles.mediaCaption}>{block.caption}</figcaption>}
              </figure>
            );

          case "diagram": {
            const art = block.asciiArt || block.mermaidSyntax;
            return (
              <figure key={idx} className={styles.mediaFigure}>
                {art ? (
                  <ArticleCodeBlock language="text" code={art} filename={block.title} />
                ) : (
                  <p className={styles.exampleTitle}>{block.title}</p>
                )}
                {block.description && <figcaption className={styles.mediaCaption}>{block.description}</figcaption>}
              </figure>
            );
          }

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

          case "relatedContent": {
            const items = block.slugs
              .map((slug) => getKnowledgeItemBySlug(slug))
              .filter((item): item is NonNullable<typeof item> => Boolean(item));
            if (items.length === 0) return null;
            return (
              <div key={idx} className={styles.checklistBlock}>
                <p className={styles.checklistTitle}>Related reading</p>
                <ul className={styles.unorderedList}>
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link href={`${TYPE_PATHS[item.type]}/${item.slug}`} className={styles.inlineLink}>
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          case "externalReference":
            return (
              <p key={idx} className={styles.paragraph}>
                <strong>Reference:</strong>{" "}
                <a href={block.url} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
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
