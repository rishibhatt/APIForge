import styles from "./RoastHero.module.css";

export default function RoastHero() {
  return (
    <header className={styles.hero}>
      <h1 className={styles.title}>
        <span>Ship it.</span>
        <span className={styles.heat}>We&apos;ll judge it.</span>
      </h1>
      <p className={styles.sub}>
        Paste an OpenAPI or Swagger spec. Get a score out of 100, a roast written about your actual
        endpoints, a reaction meme, and a fix for every crime. Free, no sign-up.
      </p>
    </header>
  );
}
