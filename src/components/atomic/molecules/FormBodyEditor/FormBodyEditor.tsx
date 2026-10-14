"use client";

import { useRef } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import type { FormFieldSpec } from "@/lib/request-body-mode";
import styles from "./FormBodyEditor.module.css";

/** One editable form / multipart field. Text fields carry `value`; file fields carry `files`. */
export interface FormFieldRow {
  id: string;
  enabled: boolean;
  name: string;
  kind: "text" | "file";
  value: string;
  files: File[];
  multiple: boolean;
  required: boolean;
  fromSpec: boolean;
  contentType?: string;
  accept?: string;
  hint?: string;
  description?: string;
}

let seq = 0;
const nextId = () => `ff_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function formRowFromSpec(f: FormFieldSpec): FormFieldRow {
  return {
    id: nextId(),
    enabled: f.required || f.kind === "file" || f.value !== "",
    name: f.name,
    kind: f.kind,
    value: f.value,
    files: [],
    multiple: f.multiple,
    required: f.required,
    fromSpec: true,
    contentType: f.contentType,
    accept: f.accept,
    hint: f.hint,
    description: f.description,
  };
}

function newFormRow(kind: "text" | "file" = "text"): FormFieldRow {
  return { id: nextId(), enabled: true, name: "", kind, value: "", files: [], multiple: false, required: false, fromSpec: false };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FormBodyEditorProps {
  rows: FormFieldRow[];
  onChange: (rows: FormFieldRow[]) => void;
  /** multipart allows file fields; urlencoded is text only. */
  allowFiles: boolean;
}

/** Key/value editor for urlencoded and multipart bodies, with a file picker per file field. */
export default function FormBodyEditor({ rows, onChange, allowFiles }: FormBodyEditorProps) {
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const update = (id: string, patch: Partial<FormFieldRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  return (
    <div className={styles.wrap}>
      {rows.length === 0 ? <p className={styles.empty}>No fields. Add one below.</p> : null}
      <ul className={styles.list}>
        {rows.map((r) => {
          const total = r.files.reduce((n, f) => n + f.size, 0);
          return (
            <li key={r.id} className={`${styles.row} ${r.enabled ? "" : styles.rowOff}`}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => update(r.id, { enabled: e.target.checked })}
                  aria-label={`Send ${r.name || "field"}`}
                />
              </label>

              <div className={styles.keyCell}>
                {r.fromSpec ? (
                  <span className={styles.specKey} title={r.description}>
                    <span className={styles.keyText}>
                      {r.name}
                      {r.required ? <span className={styles.req}>*</span> : null}
                    </span>
                    <span className={styles.hint}>
                      {r.hint}
                      {r.contentType ? ` · ${r.contentType}` : ""}
                    </span>
                  </span>
                ) : (
                  <input
                    className={`${styles.input} ${styles.mono}`}
                    value={r.name}
                    placeholder="field name"
                    spellCheck={false}
                    onChange={(e) => update(r.id, { name: e.target.value })}
                    aria-label="Field name"
                  />
                )}
              </div>

              <div className={styles.valueCell}>
                {r.kind === "file" ? (
                  <div className={styles.fileCell}>
                    <button
                      type="button"
                      className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
                      onClick={() => fileInputs.current[r.id]?.click()}
                    >
                      <MaterialIcon name="upload_file" size="xs" />
                      {r.files.length ? "Change" : r.multiple ? "Choose files" : "Choose file"}
                    </button>
                    <span className={styles.fileName} title={r.files.map((f) => f.name).join(", ")}>
                      {r.files.length === 0
                        ? r.accept
                          ? `Accepts ${r.accept}`
                          : "No file chosen"
                        : r.files.length === 1
                          ? `${r.files[0]!.name} · ${formatBytes(total)}`
                          : `${r.files.length} files · ${formatBytes(total)}`}
                    </span>
                    {r.files.length ? (
                      <button
                        type="button"
                        className={`${styles.iconBtn} focusRing`}
                        aria-label={`Clear ${r.name} file`}
                        onClick={() => update(r.id, { files: [] })}
                      >
                        <MaterialIcon name="close" size="xs" />
                      </button>
                    ) : null}
                    <input
                      ref={(el) => {
                        fileInputs.current[r.id] = el;
                      }}
                      type="file"
                      hidden
                      multiple={r.multiple}
                      accept={r.accept}
                      onChange={(e) => {
                        const list = Array.from(e.target.files ?? []);
                        update(r.id, { files: list, enabled: list.length > 0 || r.enabled });
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <input
                    className={`${styles.input} ${r.contentType?.includes("json") ? styles.mono : ""}`}
                    value={r.value}
                    placeholder="value"
                    spellCheck={false}
                    onChange={(e) => update(r.id, { value: e.target.value })}
                    aria-label={`${r.name || "Field"} value`}
                  />
                )}
              </div>

              <div className={styles.actions}>
                {allowFiles && !r.fromSpec ? (
                  <button
                    type="button"
                    className={`${styles.iconBtn} focusRing`}
                    title={r.kind === "file" ? "Switch to text" : "Switch to file"}
                    aria-label={r.kind === "file" ? "Switch to text" : "Switch to file"}
                    onClick={() => update(r.id, { kind: r.kind === "file" ? "text" : "file", files: [], value: "" })}
                  >
                    <MaterialIcon name={r.kind === "file" ? "text_fields" : "attach_file"} size="xs" />
                  </button>
                ) : null}
                {!r.fromSpec ? (
                  <button
                    type="button"
                    className={`${styles.iconBtn} focusRing`}
                    aria-label={`Remove ${r.name || "field"}`}
                    onClick={() => remove(r.id)}
                  >
                    <MaterialIcon name="delete" size="xs" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.addRow}>
        <button
          type="button"
          className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
          onClick={() => onChange([...rows, newFormRow("text")])}
        >
          <MaterialIcon name="add" size="xs" />
          Add field
        </button>
        {allowFiles ? (
          <button
            type="button"
            className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
            onClick={() => onChange([...rows, newFormRow("file")])}
          >
            <MaterialIcon name="attach_file" size="xs" />
            Add file
          </button>
        ) : null}
      </div>
    </div>
  );
}
