"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import WorkspaceAiAssistant from "@/components/atomic/organisms/WorkspaceAiAssistant/WorkspaceAiAssistant";
import type { WorkspaceAssistantApiContext } from "@/lib/workspace-assistant-context";
import styles from "./WorkspaceAiChatDock.module.css";

interface WorkspaceAiChatDockProps {
  t: TranslateFn;
  apiContext: WorkspaceAssistantApiContext;
}

export default function WorkspaceAiChatDock({
  t,
  apiContext,
}: WorkspaceAiChatDockProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const dock = (
    <>
      {!open ? (
        <button
          type="button"
          className={`${styles.fab} focusRing`}
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-haspopup="dialog"
          aria-label={t("workspace.assistant.openFab")}
        >
          <MaterialIcon name="smart_toy" size="md" />
        </button>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label={t("workspace.assistant.closeBackdrop")}
            onClick={close}
          />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className={styles.sheetHeader}>
              <div className={styles.sheetTitleRow}>
                <MaterialIcon name="smart_toy" size="sm" className={styles.sheetTitleIcon} />
                <h2 id={titleId} className={styles.sheetTitle}>
                  {t("workspace.assistant.sheetTitle")}
                </h2>
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
