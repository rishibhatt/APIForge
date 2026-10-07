"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { toast } from "@/components/providers/Toaster/toast";
import { SAMPLE_SPECS } from "../HeroSection/HeroSection";
import field from "../HeroSection/SpecUrlForm.module.css";
import chips from "../HeroSection/HeroSection.module.css";
import styles from "./ToolSpecForm.module.css";

export interface ToolSpecFormProps {
  id: string;
  /** Submit label; names what happens next. */
  cta?: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The landing page's command-bar field, for the product pages. Visuals live in SpecUrlForm.module.css
 * so the two stay identical; this component only validates and hands the URL to the workspace (`/?spec=`).
 */
export default function ToolSpecForm({ id, cta = "Open workspace" }: ToolSpecFormProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const errorId = `${id}-error`;

  const open = (url: string) => {
    setBusy(true);
    router.push(`/?spec=${encodeURIComponent(url)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const url = value.trim();
    if (!url || !isHttpUrl(url)) {
      setInvalid(true);
      toast.error(url ? "That is not a URL" : "Paste a spec URL first", {
        description: "Paste the full link, starting with https://",
        id: "tool-url",
      });
      return;
    }
    setInvalid(false);
    open(url);
  };

  return (
    <div className={`${field.wrap} ${field.hero} ${styles.wrap}`}>
      <div
        className={`${field.frame} ${invalid && !busy ? field.frameError : ""} ${busy ? field.frameBusy : ""}`}
        style={{ ["--p" as string]: busy ? 68 : 0 }}
      >
        <form className={field.form} onSubmit={onSubmit} noValidate>
          <MaterialIcon name="link" size="sm" className={field.linkIcon} />
          <label htmlFor={id} className="srOnly">
            OpenAPI or Swagger URL
          </label>
          <input
            id={id}
            type="url"
            name="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="Paste your OpenAPI or Swagger URL"
            className={field.input}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (invalid) setInvalid(false);
            }}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
          />
          <button type="submit" className={field.submit} disabled={busy} aria-busy={busy || undefined}>
            {busy ? (
              <>
                <MaterialIcon name="progress_activity" size="sm" className={field.spinner} />
                <span>Opening workspace…</span>
              </>
            ) : (
              <>
                <span>{cta}</span>
                <kbd className={field.kbd} aria-hidden>
                  ↵
                </kbd>
              </>
            )}
          </button>
        </form>
      </div>
      <p id={errorId} className="srOnly" role="status" aria-live="polite">
        {busy ? "Opening the workspace." : invalid ? "Enter a full URL starting with https://" : ""}
      </p>

      <div className={styles.samples}>
        <span className="monoLabel">No spec handy?</span>
        <ul className={styles.chipList}>
          {SAMPLE_SPECS.map((s) => (
            <li key={s.url}>
              <Link
                className={`${chips.chip} ${chips[`chip_${s.tone}`]} ${styles.chip}`}
                href={`/?spec=${encodeURIComponent(s.url)}`}
                prefetch={false}
                aria-disabled={busy || undefined}
              >
                <span className={chips.chipDot} aria-hidden />
                <span className={chips.chipName}>{s.label}</span>
                <span className={chips.chipMeta}>{s.meta}</span>
                <MaterialIcon name="arrow_forward" size="xs" className={chips.chipArrow} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
