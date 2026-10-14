"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import { binaryPreviewKind, downloadFileName } from "@/lib/http/response-body";
import styles from "./BinaryResponseView.module.css";

export interface BinaryResponseViewProps {
  blob: Blob;
  contentType?: string;
  contentDisposition?: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Image / audio / video / PDF response preview, with a download for every binary type. */
export default function BinaryResponseView({ blob, contentType, contentDisposition }: BinaryResponseViewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    setFailed(false);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const kind = binaryPreviewKind(contentType ?? blob.type);
  const name = useMemo(() => downloadFileName(contentDisposition, contentType ?? blob.type), [contentDisposition, contentType, blob.type]);

  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>
        <MaterialIcon name="draft" size="xs" />
        <span className={styles.metaText}>
          {(contentType ?? blob.type) || "binary"} · {formatBytes(blob.size)}
        </span>
        {url ? (
          <a className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`} href={url} download={name}>
            <MaterialIcon name="download" size="xs" />
            Download
          </a>
        ) : null}
      </div>
      {url && !failed ? (
        kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL from the API response
          <img className={styles.image} src={url} alt="Response image" onError={() => setFailed(true)} />
        ) : kind === "video" ? (
          <video className={styles.media} src={url} controls onError={() => setFailed(true)} />
        ) : kind === "audio" ? (
          <audio className={styles.audio} src={url} controls onError={() => setFailed(true)} />
        ) : kind === "pdf" ? (
          <iframe className={styles.pdf} src={url} title="PDF response" />
        ) : (
          <p className={styles.note}>No inline preview for this type. Download it to open.</p>
        )
      ) : failed ? (
        <p className={styles.note}>The browser could not preview this file. Download it to open.</p>
      ) : null}
    </div>
  );
}
