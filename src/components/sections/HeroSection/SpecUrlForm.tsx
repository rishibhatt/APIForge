"use client";

import { useEffect, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import AuthHeaderFields from "@/components/atomic/molecules/AuthHeaderFields/AuthHeaderFields";
import { toast } from "@/components/providers/Toaster/toast";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./SpecUrlForm.module.css";

export interface SpecUrlFormProps {
  id: string;
  t: TranslateFn;
  isLoading: boolean;
  error: string | null;
  onForge: () => void;
  autoFocus?: boolean;
  /** "hero" is the 56px landing field; "default" (52px) suits secondary placements. */
  size?: "hero" | "default";
}

/** The one primary action on the marketing site: paste a spec URL, open the workspace. */
export default function SpecUrlForm({
  id,
  isLoading,
  error,
  onForge,
  autoFocus,
  size = "default",
}: SpecUrlFormProps) {
  const specUrlInput = useWorkspaceStore((s) => s.specUrlInput);
  const setSpecUrlInput = useWorkspaceStore((s) => s.setSpecUrlInput);
  const specAuthHeader = useWorkspaceStore((s) => s.specAuthHeader);
  const setSpecAuthHeader = useWorkspaceStore((s) => s.setSpecAuthHeader);
  const [authOpen, setAuthOpen] = useState(() => Boolean(specAuthHeader.value));
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  const progress = useWorkspaceStore((s) => s.parseProgress);
  const errorInfo = progress.phase === "error" ? progress.error : null;
  const phase = progress.phase;
    // The field itself is the progress: border fill, button label, one hidden status line.
  const busyPhase = phase === "fetching" || phase === "parsing" || phase === "done";
  const busy = isLoading || busyPhase;
  const fill = phase === "done" ? 100 : phase === "parsing" ? 68 : busy ? 28 : 0;
  const count = progress.endpointCount;
  const busyLabel =
    phase === "done"
      ? count != null
        ? `Found ${count} endpoints`
        : "Spec parsed"
      : phase === "parsing"
        ? "Reading endpoints…"
        : "Fetching spec…";
  const statusText = busy
    ? phase === "done"
      ? `${busyLabel}. Opening the workspace.`
      : busyLabel
    : "";

  // Parse failures surface as a toast with the fix; the field keeps a calm error frame.
  useEffect(() => {
    if (!error || busy) return;
    toast.error(errorInfo?.title ?? error, {
      description: errorInfo?.fix,
      id: "parse-error",
    });
  }, [error, errorInfo?.title, errorInfo?.fix, busy]);

  // A 401/403 from the docs page: open the header row so the fix is one paste away.
  const needsAuth = Boolean(errorInfo?.title.toLowerCase().includes("authentication"));
  useEffect(() => {
    if (needsAuth) setAuthOpen(true);
  }, [needsAuth]);

  const validateAndForge = () => {
    const value = specUrlInput.trim();
    if (!value) {
      setLocalError("Paste a spec URL first.");
      toast.error("Paste a spec URL first", {
        description: "Use a link to an OpenAPI or Swagger file, for example https://petstore.swagger.io/v2/swagger.json.",
        id: "parse-error",
      });
      inputRef.current?.focus();
      return;
    }
    let ok = false;
    try {
      const u = new URL(value);
      ok = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) {
      setLocalError("That is not a full http or https URL.");
      toast.error("That is not a full URL", {
        description: "Start the link with https:// and paste the whole address.",
        id: "parse-error",
      });
      inputRef.current?.focus();
      return;
    }
    setLocalError(null);
    onForge();
  };

  useEffect(() => {
    if (!autoFocus) return;
    // Focus when arriving via "Open workspace" links (/#parse-api); never steal focus on a plain load.
    const focusIfTargeted = () => {
      if (window.location.hash === "#parse-api") inputRef.current?.focus({ preventScroll: true });
    };
    focusIfTargeted();
    window.addEventListener("hashchange", focusIfTargeted);
    return () => window.removeEventListener("hashchange", focusIfTargeted);
  }, [autoFocus]);

  return (
    <div className={`${styles.wrap} ${size === "hero" ? styles.hero : ""}`}>
      <div
        className={`${styles.frame} ${(error || localError) && !busy ? styles.frameError : ""} ${busy ? styles.frameBusy : ""}`}
        style={{ ["--p" as string]: fill }}
      >
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) validateAndForge();
          }}
        >
          <MaterialIcon name="link" size="sm" className={styles.linkIcon} />
          <label htmlFor={id} className="srOnly">
            OpenAPI or Swagger URL
          </label>
          <input
            ref={inputRef}
            id={id}
            type="url"
            name="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="Paste your OpenAPI or Swagger URL"
            className={styles.input}
            value={specUrlInput}
            onChange={(e) => {
              setSpecUrlInput(e.target.value);
              if (localError) setLocalError(null);
            }}
            aria-invalid={error || localError ? true : undefined}
            aria-describedby={error || localError ? errorId : undefined}
          />
          <button type="submit" className={styles.submit} disabled={busy} aria-busy={busy || undefined}>
            {busy ? (
              <>
                {phase === "done" ? (
                  <MaterialIcon name="check" size="sm" />
                ) : (
                  <MaterialIcon name="progress_activity" size="sm" className={styles.spinner} />
                )}
                <span>{busyLabel}</span>
              </>
            ) : (
              <>
                <span>Parse spec</span>
                <kbd className={styles.kbd} aria-hidden>
                  ↵
                </kbd>
              </>
            )}
          </button>
        </form>
      </div>
      <p className="srOnly" role="status" aria-live="polite">
        {statusText}
      </p>
      {(localError || error) && !busy ? (
        <p id={errorId} className={styles.inlineError} role="alert">
          {localError ?? errorInfo?.title ?? error}
        </p>
      ) : busy ? null : (
        <p className={styles.hint}>
          Works with raw JSON or YAML links and hosted Swagger UI pages.
        </p>
      )}
      <AuthHeaderFields
        header={specAuthHeader}
        onChange={setSpecAuthHeader}
        open={authOpen}
        onOpenChange={setAuthOpen}
      />
    </div>
  );
}
