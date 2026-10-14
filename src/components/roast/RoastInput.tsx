"use client";

import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import AuthHeaderFields from "@/components/atomic/molecules/AuthHeaderFields/AuthHeaderFields";
import { authHeaderToRecord, EMPTY_AUTH_HEADER, type AuthHeader } from "@/lib/spec-auth-header";
import { toast } from "@/components/providers/Toaster/toast";
import styles from "./RoastInput.module.css";

export interface RoastInputProps {
  initialUrl?: string;
  error?: string | null;
  /** HTTP status of the failed request, or 0 when it never got a response. */
  errorStatus?: number | null;
  /** `authHeaders` is set when the user added a header for docs behind auth. */
  onSubmitUrl: (url: string, authHeaders?: Record<string, string>) => void;
  onFileUpload: (file: File) => void;
}

type InputMode = "url" | "paste" | "file";

const MODES: { id: InputMode; label: string }[] = [
  { id: "url", label: "Spec URL" },
  { id: "paste", label: "Paste spec" },
  { id: "file", label: "Upload file" },
];

const SAMPLES = [
  { label: "Swagger Petstore", url: "https://petstore.swagger.io/" },
  { label: "Fake REST API", url: "https://fakerestapi.azurewebsites.net/index.html" },
];

export type RoastErrorKind =
  | "empty"
  | "invalid-url"
  | "unreachable"
  | "not-spec"
  | "too-large"
  | "rate-limit"
  | "server"
  | "offline"
  | "private"
  | "no-operations"
  | "auth"
  | "file-type"
  | "other";

export interface ExplainedRoastError {
  kind: RoastErrorKind;
  title: string;
  hint: string;
}

const MAX_SPEC_BYTES = 10 * 1024 * 1024;

/**
 * Turns an API error (or client-side failure) into a short title plus the step that fixes it.
 * `status` is the HTTP status when there was a response, or 0 when the request never got one.
 */
export function explainRoastError(raw: string, status?: number | null): ExplainedRoastError {
  const msg = raw.toLowerCase();
  if (status === 0) {
    return { kind: "offline", title: "You appear to be offline", hint: "Check your connection, then roast again." };
  }
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
    return { kind: "rate-limit", title: "You are roasting too fast", hint: "Try again in a minute." };
  }
  if (msg.includes("not permitted") || msg.includes("private") || msg.includes("localhost")) {
    return {
      kind: "private",
      title: "That address can't be fetched",
      hint: "Roasts only fetch public http(s) URLs. For a local or private API, paste the spec or upload the file instead.",
    };
  }
  if (msg.includes("10mb") || msg.includes("too large") || msg.includes("exceeds")) {
    return {
      kind: "too-large",
      title: "That spec is over 10 MB",
      hint: "Remove bundled examples or split the spec, then try again.",
    };
  }
  if (msg.includes("no valid operations") || msg.includes("no endpoints")) {
    return {
      kind: "no-operations",
      title: "No operations found in that spec",
      hint: "Check that the document has a paths section with at least one operation, then try again.",
    };
  }
  if (msg.includes("missing")) {
    return { kind: "empty", title: "Nothing to roast yet", hint: "Add a spec URL, paste the spec text, or choose a file." };
  }
  if (/\bhttp 40[13]\b|needs authentication|rejected the auth header/.test(msg)) {
    return {
      kind: "auth",
      title: msg.includes("rejected") ? "The server rejected your auth header" : "This spec needs authentication",
      hint: "Open \"Docs need auth? Add a header\" under the URL, paste your token or API key, then roast again. Or paste the spec instead.",
    };
  }
  if (msg.includes("found the swagger ui page") || msg.includes("found a swagger ui page")) {
    return {
      kind: "not-spec",
      title: "Found the Swagger UI page, but not its spec",
      hint: "Open the docs page, copy the openapi.json or swagger.json link it loads, and paste that URL.",
    };
  }
  if (/\bhttp (404|410|5\d\d)\b|enotfound|econn|etimedout|timed out|timeout|fetch failed|getaddrinfo|unreachable|could not (fetch|reach)|failed to fetch/.test(msg)) {
    return {
      kind: "unreachable",
      title: "We couldn't reach that host",
      hint: "Open the URL in a browser to confirm it is public and returns the spec. If it needs auth, add a header under the URL or paste the spec instead.",
    };
  }
  if (typeof status === "number" && status >= 500) {
    return { kind: "server", title: "Something broke on our side", hint: "Nothing you did. Wait a moment and try again." };
  }
  if (/openapi|swagger|invalid|parse|yaml|json|unsupported|document|spec/.test(msg)) {
    return {
      kind: "not-spec",
      title: "That isn't an OpenAPI or Swagger document",
      hint: "Use a link to OpenAPI 3 or Swagger 2 JSON or YAML (a Swagger UI page also works). If it needs auth, add a header under the URL or paste the spec instead.",
    };
  }
  return {
    kind: "other",
    title: "We couldn't read that spec",
    hint: "Open the URL in a browser to confirm it returns OpenAPI 3 or Swagger 2 JSON or YAML. If it needs auth, add a header under the URL or paste the spec instead.",
  };
}

/** Keeps raw server text short and free of markup or JSON blobs. */
function shortDetail(raw: string): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  if (!flat || flat.startsWith("{") || flat.startsWith("<")) return "";
  return flat.length > 140 ? `${flat.slice(0, 137)}...` : flat;
}

function checkUrl(raw: string): ExplainedRoastError | null {
  const value = raw.trim();
  if (!value) {
    return { kind: "empty", title: "Add a spec URL first", hint: "Paste a link to an OpenAPI or Swagger spec, or try a sample below." };
  }
  let parsed: URL | null = null;
  try {
    parsed = /\s/.test(value) ? null : new URL(value);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) {
    return {
      kind: "invalid-url",
      title: "That doesn't look like a valid URL",
      hint: "Start with https:// and use the full address, for example https://api.example.com/openapi.json.",
    };
  }
  return null;
}

function checkPaste(raw: string): ExplainedRoastError | null {
  const text = raw.trim();
  if (!text) {
    return { kind: "empty", title: "Paste your spec first", hint: "Paste OpenAPI or Swagger text in JSON or YAML." };
  }
  if (new Blob([text]).size > MAX_SPEC_BYTES) {
    return explainRoastError("File exceeds 10MB limit");
  }
  const notSpec: ExplainedRoastError = {
    kind: "not-spec",
    title: "That isn't an OpenAPI or Swagger document",
    hint: "The text needs an openapi or swagger version line and a paths section.",
  };
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const data: unknown = JSON.parse(text);
      const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!obj || !("paths" in obj || "openapi" in obj || "swagger" in obj)) return notSpec;
      return null;
    } catch {
      return {
        kind: "not-spec",
        title: "That JSON doesn't parse",
        hint: "Look for a trailing comma, a missing quote or a cut-off paste near the end.",
      };
    }
  }
  if (!/^\s*(openapi|swagger)\s*:/m.test(text) && !/^\s*paths\s*:/m.test(text)) return notSpec;
  return null;
}

function checkFile(file: File): ExplainedRoastError | null {
  if (!/\.(json|ya?ml)$/i.test(file.name)) {
    return { kind: "file-type", title: "Unsupported file type", hint: "Choose a .json, .yaml or .yml spec." };
  }
  if (file.size === 0) {
    return { kind: "empty", title: "That file is empty", hint: "Choose a spec file that has content." };
  }
  if (file.size > MAX_SPEC_BYTES) return explainRoastError("File exceeds 10MB limit");
  return null;
}

export default function RoastInput({ initialUrl = "", error, errorStatus, onSubmitUrl, onFileUpload }: RoastInputProps) {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState(initialUrl);
  const [rawText, setRawText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const errorId = `${baseId}-error`;

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const [fieldError, setFieldError] = useState<ExplainedRoastError | null>(null);
  const [authHeader, setAuthHeader] = useState<AuthHeader>(EMPTY_AUTH_HEADER);
  const [authOpen, setAuthOpen] = useState(false);

  const explained = fieldError ?? (error ? explainRoastError(error, errorStatus) : null);
  const detail = !fieldError && error ? shortDetail(error) : "";

  // A 401/403 from the docs page: open the header row so the fix is one paste away.
  const needsAuth = explained?.kind === "auth";
  useEffect(() => {
    if (needsAuth) setAuthOpen(true);
  }, [needsAuth]);

  const fail = (problem: ExplainedRoastError) => {
    setFieldError(problem);
    toast.error(problem.title, { description: problem.hint, id: "roast-input-error" });
  };

  const clearField = () => {
    if (fieldError) setFieldError(null);
  };

  const submitFile = (file: File) => {
    const problem = checkFile(file);
    if (problem) {
      fail(problem);
      return;
    }
    setFieldError(null);
    onFileUpload(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "url") {
      const problem = checkUrl(url);
      if (problem) return fail(problem);
      setFieldError(null);
      onSubmitUrl(url.trim(), authHeaderToRecord(authHeader));
    } else if (mode === "paste") {
      const problem = checkPaste(rawText);
      if (problem) return fail(problem);
      setFieldError(null);
      const text = rawText.trim();
      const isJson = text.startsWith("{") || text.startsWith("[");
      const name = isJson ? "pasted-spec.json" : "pasted-spec.yaml";
      const type = isJson ? "application/json" : "application/yaml";
      onFileUpload(new File([text], name, { type }));
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) submitFile(file);
  };

  const handleTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length;
    setMode(MODES[next]!.id);
    setFieldError(null);
    tabRefs.current[next]?.focus();
  };

  const frameCls = (extra = "") =>
    `${styles.frame} ${explained ? styles.frameError : ""} ${extra}`.trim();

  const submitBtn = () => (
    <button type="submit" className={styles.submit}>
      <span>Roast my API</span>
      <span className={styles.fire} aria-hidden>
        🔥
      </span>
    </button>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.segmented} role="tablist" aria-label="How to provide your spec">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls={`${baseId}-panel`}
            tabIndex={mode === m.id ? 0 : -1}
            className={styles.segment}
            onClick={() => {
              setMode(m.id);
              setFieldError(null);
            }}
            onKeyDown={(e) => handleTabKey(e, i)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${mode}`}
        className={styles.body}
        onSubmit={handleSubmit}
        noValidate
      >
        {mode === "url" ? (
          <div className={frameCls()}>
            <div className={styles.urlRow}>
              <MaterialIcon name="link" size="sm" className={styles.urlIcon} />
              <input
                type="url"
                inputMode="url"
                className={styles.urlInput}
                placeholder="Paste your OpenAPI or Swagger URL"
                aria-label="OpenAPI or Swagger spec URL"
                aria-describedby={explained ? errorId : undefined}
                aria-invalid={explained ? true : undefined}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  clearField();
                }}
                autoComplete="off"
                spellCheck={false}
              />
              {submitBtn()}
            </div>
          </div>
        ) : null}
        {mode === "url" ? (
          <AuthHeaderFields header={authHeader} onChange={setAuthHeader} open={authOpen} onOpenChange={setAuthOpen} />
        ) : null}

        {mode === "paste" ? (
          <div className={styles.pasteWrap}>
            <div className={frameCls()}>
              <textarea
                className={styles.textarea}
                placeholder={"openapi: 3.0.3\ninfo:\n  title: My API\npaths:\n  /users: …"}
                aria-label="OpenAPI or Swagger spec, JSON or YAML"
                aria-describedby={explained ? errorId : undefined}
                aria-invalid={explained ? true : undefined}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  clearField();
                }}
                spellCheck={false}
              />
            </div>
            <div className={styles.pasteFoot}>
              <span className={styles.note}>OpenAPI 3 or Swagger 2, JSON or YAML.</span>
              {submitBtn()}
            </div>
          </div>
        ) : null}

        {mode === "file" ? (
          <div className={frameCls(isDragOver ? styles.frameActive : "")}>
            <div
              className={styles.dropzone}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <MaterialIcon name="upload_file" className={styles.dropIcon} />
              <p className={styles.dropText}>Drop a .json, .yaml or .yml spec here</p>
              <p className={styles.note}>Up to 10 MB</p>
              <button type="button" className={styles.browse} onClick={() => fileRef.current?.click()}>
                Choose file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml"
                className={styles.hiddenInput}
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) submitFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        ) : null}
      </form>

      {explained ? (
        <div id={errorId} className={styles.error} role="alert" data-kind={explained.kind}>
          <MaterialIcon name="error" size="sm" className={styles.errorIcon} />
          <div>
            <p className={styles.errorTitle}>{explained.title}</p>
            <p className={styles.errorHint}>{explained.hint}</p>
            {detail ? <p className={styles.errorRaw}>Server said: {detail}</p> : null}
          </div>
        </div>
      ) : null}

      <div className={styles.samples}>
        <span className={styles.samplesLead}>No spec handy? Try</span>
        {SAMPLES.map((s) => (
          <button key={s.url} type="button" className={styles.chip} onClick={() => onSubmitUrl(s.url)}>
            <span className={styles.chipDot} aria-hidden />
            <span className={styles.chipLabel}>{s.label}</span>
            <MaterialIcon name="arrow_forward" size="xs" className={styles.chipArrow} />
          </button>
        ))}
      </div>
    </div>
  );
}
