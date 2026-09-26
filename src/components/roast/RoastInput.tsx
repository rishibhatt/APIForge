"use client";

import type { DragEvent, FormEvent } from "react";
import { useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./RoastInput.module.css";

export interface RoastInputProps {
  initialUrl?: string;
  isLoading: boolean;
  error?: string | null;
  onSubmitUrl: (url: string) => void;
  onFileUpload?: (file: File) => void;
}

type InputMode = "url" | "paste" | "file";

export default function RoastInput({
  initialUrl = "",
  isLoading,
  error,
  onSubmitUrl,
  onFileUpload,
}: RoastInputProps) {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState(initialUrl);
  const [rawText, setRawText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === "url" && url.trim()) {
      onSubmitUrl(url.trim());
    } else if (mode === "paste" && rawText.trim()) {
      const blob = new Blob([rawText], { type: "application/json" });
      const file = new File([blob], "pasted-spec.json", { type: "application/json" });
      if (onFileUpload) onFileUpload(file);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading || !onFileUpload) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]!);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${mode === "url" ? styles.tabActive : ""}`}
          onClick={() => setMode("url")}
        >
          <MaterialIcon name="link" size="sm" />
          <span>Spec URL</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${mode === "paste" ? styles.tabActive : ""}`}
          onClick={() => setMode("paste")}
        >
          <MaterialIcon name="code" size="sm" />
          <span>Paste Spec</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${mode === "file" ? styles.tabActive : ""}`}
          onClick={() => setMode("file")}
        >
          <MaterialIcon name="upload_file" size="sm" />
          <span>Upload File</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "url" ? (
          <div className={styles.inputGroup}>
            <MaterialIcon name="link" className={styles.inputIcon} />
            <input
              type="url"
              className={styles.input}
              placeholder="Paste OpenAPI or Swagger URL (e.g., https://api.example.com/openapi.json)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        ) : null}

        {mode === "paste" ? (
          <textarea
            className={styles.textarea}
            placeholder="Paste raw OpenAPI / Swagger JSON or YAML content..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isLoading}
          />
        ) : null}

        {mode === "file" ? (
          <div
            className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const el = document.getElementById("roast-file-input");
              if (el) el.click();
            }}
          >
            <span style={{ color: "#ff6b4a" }}>
              <MaterialIcon name="cloud_upload" size="md" />
            </span>
            <p className={styles.dropText}>
              Drag & drop your <strong>.json</strong> or <strong>.yaml</strong> OpenAPI spec here, or click to browse.
            </p>
            <input
              id="roast-file-input"
              type="file"
              accept=".json,.yaml,.yml"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0] && onFileUpload) {
                  onFileUpload(e.target.files[0]);
                }
              }}
            />
          </div>
        ) : null}

        {mode !== "file" ? (
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={
              isLoading ||
              (mode === "url" && !url.trim()) ||
              (mode === "paste" && !rawText.trim())
            }
          >
            <span>{isLoading ? "AUDITING ENDPOINTS..." : "ROAST MY API"}</span>
          </button>
        ) : null}
      </form>

      {error ? (
        <div className={styles.errorMsg}>
          <MaterialIcon name="error_outline" size="sm" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
