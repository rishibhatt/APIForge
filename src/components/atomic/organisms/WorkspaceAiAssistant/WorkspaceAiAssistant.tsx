"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import type { WorkspaceAssistantApiContext } from "@/lib/workspace-assistant-context";
import type { AssistantPromptKind } from "@/lib/workspace-assistant-prompt";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./WorkspaceAiAssistant.module.css";

export type { WorkspaceAssistantApiContext } from "@/lib/workspace-assistant-context";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function id(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface WorkspaceAiAssistantProps {
  t: TranslateFn;
  apiContext: WorkspaceAssistantApiContext;
  variant?: "default" | "sheet";
}

const PRESETS: { kind: AssistantPromptKind; labelKey: string }[] = [
  { kind: "endpoint_explain", labelKey: "workspace.assistant.preEndpoint" },
  { kind: "example_response", labelKey: "workspace.assistant.preResponse" },
  { kind: "typescript_client", labelKey: "workspace.assistant.preTypescript" },
  { kind: "errors", labelKey: "workspace.assistant.preErrors" },
];

async function typewriterReveal(
  full: string,
  onTick: (slice: string) => void,
  signal: AbortSignal,
  speedMs = 12,
): Promise<void> {
  for (let i = 0; i <= full.length; i++) {
    if (signal.aborted) return;
    onTick(full.slice(0, i));
    if (i < full.length) {
      await new Promise<void>((r) => setTimeout(r, speedMs));
    }
  }
}

export default function WorkspaceAiAssistant({
  t,
  apiContext,
  variant = "default",
}: WorkspaceAiAssistantProps) {
  const [message, setMessage] = useState("");
  /** When the textarea still matches a chip label, we keep that intent for the next send. */
  const [presetPayload, setPresetPayload] = useState<{
    kind: AssistantPromptKind;
    label: string;
  } | null>(null);
  const [threads, setThreads] = useState<Record<string, ChatMsg[]>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendLockRef = useRef(false);

  const threadKey = apiContext.threadKey;
  const messages = useMemo(
    () => threads[threadKey] ?? [],
    [threads, threadKey],
  );

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setError(null);
  }, [threadKey]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const onPick = useCallback((kind: AssistantPromptKind, labelKey: string) => {
    const label = t(labelKey);
    setPresetPayload({ kind, label });
    setMessage(label);
  }, [t]);

  const versionSuffix =
    apiContext.specVersion && apiContext.specVersion.trim().length > 0
      ? t("workspace.assistant.contextVersionSuffix", {
          version: apiContext.specVersion.replace(/^v\s*/i, ""),
        })
      : "";

  const operationLine =
    apiContext.activeEndpointLine ?? t("workspace.assistant.contextNoOperation");

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const runAssistant = useCallback(
    async (userQuery: string, kind: AssistantPromptKind) => {
      if (!apiContext.aiContext.endpoint) {
        setError(t("workspace.assistant.noContext"));
        return;
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      sendLockRef.current = true;
      setGenerating(true);
      setError(null);

      const uid = id();
      const aid = id();
      setThreads((prev) => {
        const list = [...(prev[threadKey] ?? [])];
        list.push({ id: uid, role: "user", content: userQuery });
        list.push({ id: aid, role: "assistant", content: "" });
        return { ...prev, [threadKey]: list };
      });

      try {
        const res = await fetch("/api/groq/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuery,
            aiContext: apiContext.aiContext,
            promptKind: kind,
          }),
          signal: ctrl.signal,
        });

        const ct = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          let errText = t("workspace.assistant.aiFailed");
          try {
            const j = (await res.json()) as { error?: string };
            if (typeof j.error === "string" && j.error.trim()) errText = j.error.trim();
          } catch {
            /* ignore */
          }
          setError(errText);
          setThreads((prev) => {
            const list = [...(prev[threadKey] ?? [])];
            const last = list[list.length - 1];
            if (last?.role === "assistant") {
              list[list.length - 1] = { ...last, content: errText };
            }
            return { ...prev, [threadKey]: list };
          });
          return;
        }

        if (!res.body || !ct.includes("text/plain")) {
          const full = await res.text();
          if (!full.trim()) {
            setError(t("workspace.assistant.aiFailed"));
            return;
          }
          await typewriterReveal(
            full,
            (slice) => {
              setThreads((prev) => {
                const list = [...(prev[threadKey] ?? [])];
                const last = list[list.length - 1];
                if (last?.role === "assistant") {
                  list[list.length - 1] = { ...last, content: slice };
                }
                return { ...prev, [threadKey]: list };
              });
            },
            ctrl.signal,
          );
          return;
        }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setThreads((prev) => {
            const list = [...(prev[threadKey] ?? [])];
            const last = list[list.length - 1];
            if (last?.role === "assistant") {
              list[list.length - 1] = { ...last, content: acc };
            }
            return { ...prev, [threadKey]: list };
          });
        }
        acc += dec.decode();
        const finalText = acc.trim() ? acc : t("workspace.assistant.emptyReply");
        setThreads((prev) => {
          const list = [...(prev[threadKey] ?? [])];
          const last = list[list.length - 1];
          if (last?.role === "assistant") {
            list[list.length - 1] = { ...last, content: finalText };
          }
          return { ...prev, [threadKey]: list };
        });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          setThreads((prev) => {
            const list = [...(prev[threadKey] ?? [])];
            const last = list[list.length - 1];
            if (last?.role === "assistant" && last.content.length === 0) {
              list[list.length - 1] = {
                ...last,
                content: t("workspace.assistant.stopped"),
              };
            }
            return { ...prev, [threadKey]: list };
          });
        } else {
          const msg =
            e instanceof Error && e.message
              ? e.message
              : t("workspace.assistant.aiFailed");
          setError(msg);
          setThreads((prev) => {
            const list = [...(prev[threadKey] ?? [])];
            const last = list[list.length - 1];
            if (last?.role === "assistant") {
              list[list.length - 1] = {
                ...last,
                content: last.content || msg,
              };
            }
            return { ...prev, [threadKey]: list };
          });
        }
      } finally {
        abortRef.current = null;
        sendLockRef.current = false;
        setGenerating(false);
      }
    },
    [apiContext.aiContext, t, threadKey],
  );

  const onSend = useCallback(() => {
    const q = message.trim();
    if (!q || sendLockRef.current || generating) return;
    if (!apiContext.aiContext.endpoint) {
      setError(t("workspace.assistant.noContext"));
      return;
    }
    const kind =
      presetPayload && presetPayload.label.trim() === q
        ? presetPayload.kind
        : "general";
    setMessage("");
    setPresetPayload(null);
    void runAssistant(q, kind);
  }, [
    message,
    generating,
    apiContext.aiContext.endpoint,
    presetPayload,
    runAssistant,
    t,
  ]);

  const canSend =
    Boolean(apiContext.aiContext.endpoint) &&
    message.trim().length > 0 &&
    !generating;

  return (
    <section
      className={`${styles.wrap} ${variant === "sheet" ? styles.wrapSheet : ""}`}
      aria-label={t("workspace.assistant.aria")}
    >
      <div className={styles.context}>
        <p className={styles.contextKicker}>{t("workspace.assistant.contextHeading")}</p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextSpec")}</span>
          {apiContext.specTitle}
          {versionSuffix}
        </p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextEndpoints")}</span>
          {t("workspace.assistant.contextEndpointsValue", {
            count: apiContext.endpointCount,
          })}
        </p>
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextOperation")}</span>
          {operationLine}
        </p>
        {apiContext.activeSummary ? (
          <p className={styles.contextSummary}>{apiContext.activeSummary}</p>
        ) : null}
        <p className={styles.contextLine}>
          <span className={styles.contextLabel}>{t("workspace.assistant.contextWorkspace")}</span>
          {t("workspace.assistant.contextWorkspaceValue", {
            tab: apiContext.activeTabLabel,
            scope: apiContext.scopeLabel,
          })}
        </p>
      </div>

      <div className={styles.head}>
        <MaterialIcon name="auto_awesome" size="sm" className={styles.headIcon} />
        <h2 className={styles.title}>{t("workspace.assistant.title")}</h2>
        <span className={styles.beta}>{t("workspace.assistant.beta")}</span>
      </div>
      <p className={styles.lead}>{t("workspace.assistant.lead")}</p>

      <div className={styles.chat} ref={scrollRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className={styles.chatEmpty}>{t("workspace.assistant.chatEmpty")}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
              }
            >
              <span className={styles.bubbleRole}>
                {m.role === "user"
                  ? t("workspace.assistant.roleYou")
                  : t("workspace.assistant.roleAssistant")}
              </span>
              <div className={styles.bubbleBody}>{m.content}</div>
              {generating &&
              m.role === "assistant" &&
              m.id === messages[messages.length - 1]?.id ? (
                <span className={styles.caret} aria-hidden>
                  |
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.chips} role="group">
        {PRESETS.map(({ kind, labelKey }) => (
          <button
            key={labelKey}
            type="button"
            className={`${styles.chip} focusRing`}
            disabled={generating}
            onClick={() => onPick(kind, labelKey)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className={styles.inputRow}>
        {generating ? (
          <button
            type="button"
            className={`${styles.stopBtn} focusRing`}
            onClick={stopGeneration}
          >
            <MaterialIcon name="stop_circle" size="sm" />
            <span>{t("workspace.assistant.stop")}</span>
          </button>
        ) : null}
      </div>

      <div className={styles.inputWrap}>
        <label htmlFor="workspace-assistant-input" className="srOnly">
          {t("workspace.assistant.placeholder")}
        </label>
        <textarea
          id="workspace-assistant-input"
          className={styles.input}
          rows={2}
          value={message}
          onChange={(e) => {
            const v = e.target.value;
            setMessage(v);
            setPresetPayload((p) => {
              if (!p) return null;
              return v.trim() === p.label.trim() ? p : null;
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={t("workspace.assistant.placeholder")}
          spellCheck={false}
          disabled={generating}
        />
        <button
          type="button"
          className={`${styles.send} ${canSend ? styles.sendActive : ""} focusRing`}
          aria-label={t("workspace.assistant.sendAria")}
          disabled={!canSend}
          onClick={onSend}
        >
          <MaterialIcon name="send" size="sm" />
        </button>
      </div>
      <p className={styles.disclaimer}>{t("workspace.assistant.disclaimer")}</p>
    </section>
  );
}
