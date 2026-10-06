import type { Metadata } from "next";
import { createToolMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbJsonLd, generateFaqJsonLd } from "@/lib/seo/jsonld";
import LandingHeader from "@/components/sections/LandingHeader/LandingHeader";
import LandingFooter from "@/components/sections/LandingFooter/LandingFooter";
import SupportReveal from "@/components/support/SupportReveal";
import UpiCard from "@/components/support/UpiCard";
import FaqAccordion from "@/components/support/FaqAccordion";
import Contributors from "@/components/support/Contributors";
import { SUPPORT_FAQS } from "@/lib/support/faq";
import { BUY_ME_A_COFFEE_URL, GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "@/lib/support/links";
import styles from "@/components/support/Support.module.css";

export const metadata: Metadata = createToolMetadata(
  "Support",
  "Support APIForge: free AI limits and how to help",
  "APIForge is free and runs its AI tools on free-tier models. See why each visitor gets 40 AI requests per 5 hours and how funding buys better, faster models.",
  "/support",
  ["support APIForge", "APIForge AI limit", "free AI API tools"],
);

const PAYS_FOR = [
  {
    title: "More accurate models",
    body: "Frontier-class models miss fewer edge cases in schemas and invent fewer details, so generated types and tests need less checking.",
  },
  {
    title: "Higher limits",
    body: "Paid model access comes with higher request limits, which is what allows the 40 requests per 5 hours rule to be raised.",
  },
  {
    title: "Faster responses",
    body: "Paid capacity is not shared with every free-tier user, so answers arrive sooner when traffic is high.",
  },
];

export default function SupportPage() {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Support", url: "/support" },
  ]);
  const faqJsonLd = generateFaqJsonLd(SUPPORT_FAQS);

  return (
    <div className={styles.pageWrap}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <LandingHeader minimal />
      <main className={styles.main}>
        <SupportReveal className={styles.container}>
          <header className={styles.hero}>
            <h1 className={styles.h1}>Support APIForge</h1>
            <p className={styles.lede}>
              APIForge is free and built by one person. Its AI tools run on free-tier models, which come with a request
              limit and answers you should check. Funding pays for better models, higher limits and faster responses.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.btnPrimary} href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">
                Buy me a coffee
              </a>
              <a className={styles.btnSecondary} href="#ways-to-help">
                Pay with UPI
              </a>
              <a className={styles.btnSecondary} href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                Star on GitHub
              </a>
            </div>
          </header>

          <section className={styles.section} aria-labelledby="limit-title">
            <h2 id="limit-title" className={styles.h2} data-reveal>
              Why there is an AI limit
            </h2>
            <div className={styles.limitPanel} data-reveal>
              <div className={styles.limitCopy}>
                <p>
                  The assistant, payload generator, test cases, TypeScript generation and AI-prompt generation run on
                  free-tier language models (Groq-hosted open models today). Free tiers cap how many requests a service
                  can send, so each visitor gets 40 AI requests per rolling 5 hours, counted across all of those tools.
                </p>
                <p>
                  The rule-based quality score, the parser, the proxy and Roast My API&apos;s scoring are not AI and do
                  not count toward the 40. Roast text uses AI optionally and falls back to a deterministic version.
                </p>
                <p>
                  Free models are slower under load and less accurate than frontier models. They can miss edge cases in
                  a schema, invent details that look plausible but are wrong, or refuse. Check generated types and tests
                  before you ship them.
                </p>
              </div>

              <div className={styles.mock} aria-label="Illustration of the AI usage banner">
                <span className={styles.mockTag}>Illustration</span>
                <div className={styles.mockRow}>
                  <span className={styles.mockLabel}>AI requests left</span>
                  <span className={styles.mockValue}>34 / 40</span>
                </div>
                <div className={styles.meter} aria-hidden>
                  <span className={styles.meterFill} style={{ width: "85%" }} />
                </div>
                <hr className={styles.mockRule} />
                <div className={styles.mockRow}>
                  <span className={styles.mockLabel}>At the limit</span>
                  <span className={styles.mockValue}>0 / 40</span>
                </div>
                <p className={styles.mockText}>
                  AI buttons stop until older requests age out of the 5-hour window. Scoring, parsing and the request
                  proxy keep working.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="pays-title">
            <h2 id="pays-title" className={styles.h2} data-reveal>
              What support pays for
            </h2>
            <dl className={styles.parts} data-reveal-group>
              {PAYS_FOR.map((p) => (
                <div key={p.title} className={styles.part} data-reveal-item>
                  <dt>{p.title}</dt>
                  <dd>{p.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="ways-to-help" className={styles.section} aria-labelledby="ways-title">
            <h2 id="ways-title" className={styles.h2} data-reveal>
              Ways to help
            </h2>
            <div className={styles.cards} data-reveal-group>
              <article className={styles.card} data-reveal-item>
                <h3 className={styles.h3}>Buy Me a Coffee</h3>
                <p className={styles.cardText}>Card payment in any amount, one time or monthly.</p>
                <div className={styles.cardActions}>
                  <a className={styles.btnPrimary} href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">
                    Open Buy Me a Coffee
                  </a>
                </div>
              </article>

              <article className={styles.card} data-reveal-item>
                <h3 className={styles.h3}>UPI</h3>
                <p className={styles.cardText}>Scan the code or copy the ID into any UPI app.</p>
                <UpiCard />
              </article>

              <article className={styles.card} data-reveal-item>
                <h3 className={styles.h3}>Star the repo</h3>
                <p className={styles.cardText}>A star costs nothing and helps other developers find the project.</p>
                <div className={styles.cardActions}>
                  <a className={styles.btnSecondary} href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                    Star on GitHub
                  </a>
                </div>
              </article>

              <article className={styles.card} data-reveal-item>
                <h3 className={styles.h3}>Report a bug or suggest a rule</h3>
                <p className={styles.cardText}>
                  Wrong score, bad AI answer, or a check the quality score is missing. An issue with a small spec is
                  enough.
                </p>
                <div className={styles.cardActions}>
                  <a className={styles.btnSecondary} href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                    Open an issue
                  </a>
                </div>
              </article>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="contributors-title">
            <Contributors />
          </section>

          <section className={styles.section} aria-labelledby="faq-title">
            <h2 id="faq-title" className={styles.h2} data-reveal>
              Questions
            </h2>
            <div data-reveal>
              <FaqAccordion items={SUPPORT_FAQS} />
            </div>
          </section>
        </SupportReveal>
      </main>
      <LandingFooter />
    </div>
  );
}
