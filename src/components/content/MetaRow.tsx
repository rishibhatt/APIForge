import type { ReactNode } from "react";
import styles from "./content.module.css";

/** Mono uppercase metadata line for page headers (category, date, reading time). Falsy items are skipped. */
export default function MetaRow({ items, label = "Page details" }: { items: Array<ReactNode | null | undefined | false>; label?: string }) {
  const visible = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "");
  if (visible.length === 0) return null;
  return (
    <ul className={styles.metaRow} aria-label={label}>
      {visible.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
