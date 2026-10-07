"use client";

import { useId } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import styles from "./KeyValueEditor.module.css";

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  /** Declared by the spec: key is fixed, row cannot be removed. */
  fromSpec?: boolean;
  required?: boolean;
  /** Type / location hint shown under the key (e.g. "integer · header"). */
  hint?: string;
  description?: string;
}

let rowSeq = 0;
export function newKeyValueRow(partial: Partial<KeyValueRow> = {}): KeyValueRow {
  rowSeq += 1;
  return { id: `kv-${Date.now().toString(36)}-${rowSeq}`, key: "", value: "", enabled: true, ...partial };
}

export interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  /** Accessible name of the whole table, e.g. "Headers". */
  label: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel: string;
  keySuggestions?: readonly string[];
  /** Value suggestions keyed by lower-cased key. */
  valueSuggestions?: Record<string, readonly string[]>;
  /** Show the per-row send checkbox (off for path parameters, which are always sent). */
  allowToggle?: boolean;
  /** Show "add row". */
  allowAdd?: boolean;
  /** Monospace values (headers, params). */
  mono?: boolean;
}

export default function KeyValueEditor({
  rows,
  onChange,
  label,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  addLabel,
  keySuggestions,
  valueSuggestions,
  mono = true,
  allowToggle = true,
  allowAdd = true,
}: KeyValueEditorProps) {
  const uid = useId().replace(/:/g, "");
  const keyListId = `${uid}-keys`;

  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      {keySuggestions?.length ? (
        <datalist id={keyListId}>
          {keySuggestions.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      ) : null}

      {rows.length > 0 ? (
        <ul className={styles.list}>
          {rows.map((row) => {
            const valueListId = `${uid}-${row.id}-vals`;
            const vs = valueSuggestions?.[row.key.trim().toLowerCase()];
            return (
              <li
                key={row.id}
                className={`${styles.row} ${allowToggle ? "" : styles.rowFixed} ${row.enabled ? "" : styles.rowOff}`}
              >
                {allowToggle ? (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => update(row.id, { enabled: e.target.checked })}
                      aria-label={`Send ${row.key || "this row"}`}
                    />
                  </label>
                ) : null}
                <div className={styles.keyCell}>
                  {row.fromSpec ? (
                    <div className={styles.specKey}>
                      <code className={styles.keyText}>
                        {row.key}
                        {row.required ? (
                          <span className={styles.req} title="Required">
                            *
                          </span>
                        ) : null}
                      </code>
                      {row.hint ? <span className={styles.hint}>{row.hint}</span> : null}
                    </div>
                  ) : (
                    <input
                      className={`${styles.input} ${mono ? styles.mono : ""}`}
                      value={row.key}
                      placeholder={keyPlaceholder}
                      list={keySuggestions?.length ? keyListId : undefined}
                      onChange={(e) => update(row.id, { key: e.target.value })}
                      aria-label={`${label} key`}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  )}
                </div>
                <div className={styles.valueCell}>
                  {vs?.length ? (
                    <datalist id={valueListId}>
                      {vs.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  ) : null}
                  <input
                    className={`${styles.input} ${mono ? styles.mono : ""}`}
                    value={row.value}
                    placeholder={row.description ? row.description.slice(0, 80) : valuePlaceholder}
                    list={vs?.length ? valueListId : undefined}
                    onChange={(e) =>
                      update(row.id, {
                        value: e.target.value,
                        enabled: row.enabled || e.target.value.length > 0,
                      })
                    }
                    aria-label={`${row.key || label} value`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                {row.fromSpec ? (
                  <span className={styles.removeSpacer} aria-hidden />
                ) : (
                  <button
                    type="button"
                    className={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly} focusRing`}
                    onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                    aria-label={`Remove ${row.key || "row"}`}
                    title="Remove row"
                  >
                    <MaterialIcon name="close" size="xs" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {allowAdd ? (
        <button
          type="button"
          className={`${btn.btn} ${btn.ghost} ${btn.sm} ${styles.add} focusRing`}
          onClick={() => onChange([...rows, newKeyValueRow()])}
        >
          <MaterialIcon name="add" size="xs" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}
