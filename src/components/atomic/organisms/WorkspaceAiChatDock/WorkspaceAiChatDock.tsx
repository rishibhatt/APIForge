"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import AssistantIcon from "@/components/ai/AssistantIcon";
import WorkspaceAiAssistant from "@/components/atomic/organisms/WorkspaceAiAssistant/WorkspaceAiAssistant";
import { SUPPORT_PATH } from "@/lib/ai/usage-types";
import type { WorkspaceAssistantApiContext } from "@/lib/workspace-assistant-context";
import styles from "./WorkspaceAiChatDock.module.css";

interface WorkspaceAiChatDockProps {
  t: TranslateFn;
  apiContext: WorkspaceAssistantApiContext;
}

const HINT_KEY = "apiforge:assistant-hint-seen";
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function readHintSeen(): boolean {
  try {
    return window.sessionStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true; // storage blocked: do not nag on every render
  }
}

function writeHintSeen() {
  try {
    window.sessionStorage.setItem(HINT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function WorkspaceAiChatDock({
  t,
  apiContext,
}: WorkspaceAiChatDockProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hint, setHint] = useState(false);
  const titleId = useId();
  const hintId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // One-time label on the first visit of the session.
  useEffect(() => {
    if (!mounted || readHintSeen()) return;
    writeHintSeen();
    setHint(true);
    const id = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(id);
  }, [mounted]);

  const close = useCallback(() => setOpen(false), []);

  const openDock = useCallback(() => {
    setHint(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Put the caret in the prompt as soon as the sheet opens; hand focus back to the button on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const id = window.setTimeout(() => {
        const el = document.getElementById("workspace-assistant-input");
        if (el instanceof HTMLTextAreaElement) el.focus();
      }, 0);
      return () => window.clearTimeout(id);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      const id = window.requestAnimationFrame(() => fabRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the sheet above the on-screen keyboard on phones.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const el = sheetRef.current;
    if (!vv || !el) return;
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.setProperty("--dock-kb", `${Math.round(kb)}px`);
      el.style.setProperty("--dock-vh", `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [open]);

  const dock = (
    <>
      {!open ? (
        <div className={styles.fabWrap}>
          {hint ? (
            <p id={hintId} className={styles.hint} role="status">
              Ask the API assistant about this operation
            </p>
          ) : null}
          <button
            ref={fabRef}
            type="button"
            className={`${styles.fab} focusRing`}
            onClick={openDock}
            aria-expanded={false}
            aria-haspopup="dialog"
            aria-label="Open API assistant"
            aria-describedby={hint ? hintId : undefined}
          >
            <AssistantIcon size={26} />
          </button>
        </div>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label={t("workspace.assistant.closeBackdrop")}
            onClick={close}
            tabIndex={-1}
          />
          <div
            ref={sheetRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className={styles.sheetHeader}>
              <div className={styles.sheetTitleRow}>
                <span className={styles.avatar} aria-hidden>
                  <AssistantIcon size={24} />
                </span>
                <div className={styles.titleStack}>
                  <h2 id={titleId} className={styles.sheetTitle}>
                    APIForge Assistant
                  </h2>
                  <Link href={SUPPORT_PATH} className={`${styles.modelChip} focusRing`}>
                    Free model
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className={`${styles.sheetClose} focusRing`}
                onClick={close}
                aria-label={t("workspace.assistant.closeFab")}
              >
                <MaterialIcon name="close" size="sm" />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <WorkspaceAiAssistant t={t} apiContext={apiContext} variant="sheet" />
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  if (!mounted) return null;
  return createPortal(dock, document.body);
}
