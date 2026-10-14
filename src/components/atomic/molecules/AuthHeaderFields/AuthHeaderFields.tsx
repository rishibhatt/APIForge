"use client";

import { useId } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import type { AuthHeader } from "@/lib/spec-auth-header";
import styles from "./AuthHeaderFields.module.css";

export interface AuthHeaderFieldsProps {
  header: AuthHeader;
  onChange: (h: AuthHeader) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Optional header sent with the spec fetch, for docs pages behind a token or API key.
 * Sent only to the host of the pasted URL. Kept in memory, never in the address bar.
 */
export default function AuthHeaderFields({ header, onChange, open, onOpenChange }: AuthHeaderFieldsProps) {
  const id = useId();
  const active = Boolean(header.value.trim());

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.toggle} focusRing`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => onOpenChange(!open)}
      >
        <MaterialIcon name={active ? "lock" : "lock_open"} size="xs" />
        <span>{active ? `Sending ${header.name.trim() || "header"}` : "Docs need auth? Add a header"}</span>
        <MaterialIcon name={open ? "expand_less" : "expand_more"} size="xs" />
      </button>
      {open ? (
        <div id={`${id}-panel`} className={styles.panel}>
          <div className={styles.row}>
            <label className="srOnly" htmlFor={`${id}-name`}>
              Header name
            </label>
            <input
              id={`${id}-name`}
              className={`${styles.input} ${styles.name}`}
              value={header.name}
              placeholder="Authorization"
              spellCheck={false}
              autoComplete="off"
              list={`${id}-names`}
              onChange={(e) => onChange({ ...header, name: e.target.value })}
            />
            <datalist id={`${id}-names`}>
              <option value="Authorization" />
              <option value="X-API-Key" />
              <option value="Cookie" />
            </datalist>
            <label className="srOnly" htmlFor={`${id}-value`}>
              Header value
            </label>
            <input
              id={`${id}-value`}
              type="password"
              className={`${styles.input} ${styles.value}`}
              value={header.value}
              placeholder="Bearer eyJhbGciOi…"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => onChange({ ...header, value: e.target.value })}
            />
            {active ? (
              <button
                type="button"
                className={`${styles.clear} focusRing`}
                aria-label="Remove auth header"
                onClick={() => onChange({ ...header, value: "" })}
              >
                <MaterialIcon name="close" size="xs" />
              </button>
            ) : null}
          </div>
          <p className={styles.note}>Sent only to the host in your URL. Not saved.</p>
        </div>
      ) : null}
    </div>
  );
}
