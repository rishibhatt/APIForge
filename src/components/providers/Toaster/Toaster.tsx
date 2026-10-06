"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { subscribeToasts, toast, type ToastItem, type ToastKind } from "./toast";
import styles from "./Toaster.module.css";

const ICONS: Record<ToastKind, string> = {
  error: "error",
  warning: "warning",
  success: "check_circle",
  info: "info",
};

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(Date.now());

  // Auto-dismiss that pauses while hovered or focused, and restarts when the toast is replaced.
  useEffect(() => {
    remaining.current = item.duration;
    startedAt.current = Date.now();
  }, [item.createdAt, item.duration]);

  useEffect(() => {
    if (!item.duration || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [item.id, item.duration, item.createdAt, paused]);

  const action = item.action;
  return (
    <li
      className={`${styles.toast} ${styles[item.kind]}`}
      role={item.kind === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <MaterialIcon name={ICONS[item.kind]} size="sm" className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.title}>{item.title}</p>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}
        {action ? (
          action.href ? (
            <Link
              href={action.href}
              className={styles.action}
              onClick={() => {
                action.onClick?.();
                toast.dismiss(item.id);
              }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                action.onClick?.();
                toast.dismiss(item.id);
              }}
            >
              {action.label}
            </button>
          )
        ) : null}
      </div>
      <button type="button" className={styles.close} onClick={() => toast.dismiss(item.id)} aria-label="Dismiss notification">
        <MaterialIcon name="close" size="xs" />
      </button>
      {item.duration ? (
        <span
          key={`${item.createdAt}-${paused}`}
          className={styles.bar}
          style={{ animationDuration: `${item.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
          aria-hidden
        />
      ) : null}
    </li>
  );
}

/** Mount once in the root layout. Top-right on desktop, full-width under the header on phones. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <ol className={styles.region} aria-label="Notifications">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </ol>
  );
}
