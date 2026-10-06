"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { useWorkspaceStore } from "@/store/workspaceStore";
import styles from "./SupportFab.module.css";

const DISMISS_KEY = "apiforge-support-fab-dismissed";
const COLLAPSE_SCROLL_Y = 600;

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Floating "Support APIForge" button, bottom-right on every page except the live workspace. */
export default function SupportFab() {
  const pathname = usePathname();
  const modalOpen = useWorkspaceStore((s) => s.supportModalOpen);
  const toggleSupportModal = useWorkspaceStore((s) => s.toggleSupportModal);
  // The workspace replaces the landing on "/" once a spec is parsed; its AI dock owns that corner.
  const workspaceVisible = useWorkspaceStore((s) => s.endpoints.length > 0) && pathname === "/";

  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setReady(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > COLLAPSE_SCROLL_Y);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage blocked: hidden until reload */
    }
  };

  if (!ready || dismissed || workspaceVisible) return null;

  // While the modal is open the button stays mounted (hidden) so the modal can return focus to it.

  return (
    <div className={`${styles.fab} ${collapsed ? styles.collapsed : ""} ${modalOpen ? styles.hidden : ""}`}>
      <button
        type="button"
        className={styles.button}
        onClick={toggleSupportModal}
        aria-haspopup="dialog"
        aria-label="Support APIForge"
      >
        <span className={styles.heart} aria-hidden>
          <MaterialIcon name="favorite" size="sm" />
        </span>
        <span className={styles.text} aria-hidden>
          <span className={styles.label}>Support APIForge</span>
          <span className={styles.sub}>Free &amp; open</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Hide support button for this session"
      >
        <MaterialIcon name="close" size="xs" />
      </button>
    </div>
  );
}
