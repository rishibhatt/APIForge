import { renderInline } from "./ArticleContent";

export interface RichParagraphsProps {
  text: string;
  className?: string;
}

/** Splits text on blank lines into paragraphs and renders [label](/path) links and `code` spans. */
export default function RichParagraphs({ text, className }: RichParagraphsProps) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={className}>
          {renderInline(p)}
        </p>
      ))}
    </>
  );
}
