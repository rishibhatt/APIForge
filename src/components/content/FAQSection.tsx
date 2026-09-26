import type { FAQItem } from "@/content/types";
import styles from "./content.module.css";

export interface FAQSectionProps {
  faqs?: FAQItem[];
  title?: string;
}

export default function FAQSection({ faqs, title = "Frequently Asked Questions" }: FAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section className={styles.faqSection}>
      <h2 className={styles.faqHeading}>{title}</h2>
      <div className={styles.faqList}>
        {faqs.map((faq, idx) => (
          <details key={idx} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>{faq.question}</summary>
            <div className={styles.faqAnswer}>{faq.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
