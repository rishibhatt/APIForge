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
import AiLimitBanner from "@/components/ai/AiLimitBanner";
import AiMarkdown from "@/components/ai/AiMarkdown";
import AiShimmer from "@/components/ai/AiShimmer";
import AssistantIcon from "@/components/ai/AssistantIcon";
import {
  AiRequestError,
  handleAiErrorResponse,
  handleAiThrown,
  isAbortError,
} from "@/components/ai/aiRequest";
import { useProgressStatus } from "@/components/ai/useProgressStatus";
import { reportAiHeaders, useAiUsage } from "@/hooks/useAiUsage";
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
  for (let i = 0; i <= full.length; i += 3) {
    if (signal.aborted) return;
    onTick(full.slice(0, i));
    if (i < full.length) {
      await new Promise<void>((r) => setTimeout(r, speedMs));
    }
  }
  if (!signal.aborted) onTick(full);
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
  const runRef = useRef<(q: string, k: AssistantPromptKind) => Promise<void>>(async () => {});

  const { exhausted, resetIn } = useAiUsage();

  const threadKey = apiContext.threadKey;
  const messages = useMemo(
    () => threads[threadKey] ?? [],
    [threads, threadKey],
  );
  const lastId = messages[messages.length - 1]?.id;
  const lastIsEmptyAssistant =
    generating && messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.content.length === 0;

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

  const progress = useProgressStatus(lastIsEmptyAssistant, [
    apiContext.activeEndpointLine
      ? `Reading the ${apiContext.activeEndpointLine} contract…`
      : "Reading the API contract…",
    "Checking the schema…",
    "Writing the answer…",
  ]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const patchLast = useCallback(
    (fn: (m: ChatMsg) => ChatMsg) => {
      setThreads((prev) => {
        const list = [...(prev[threadKey] ?? [])];
        const last = list[list.length - 1];
        if (last?.role === "assistant") list[list.length - 1] = fn(last);
        return { ...prev, [threadKey]: list };
      });
    },
    [threadKey],
  );

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

      /** Remove the failed exchange and put the question back in the input. */
      const rollback = () => {
        setThreads((prev) => ({
          ...prev,
          [threadKey]: (prev[threadKey] ?? []).filter((m) => m.id !== uid && m.id !== aid),
        }));
        setMessage((cur) => (cur.trim() ? cur : userQuery));
      };

      const onRetry = () => void runRef.current(userQuery, kind);
      let gotText = false;

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
        reportAiHeaders(res.headers);

        const ct = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          throw await handleAiErrorResponse(res, { onRetry });
        }

        if (!res.body || !ct.includes("text/plain")) {
          const full = await res.text();
          if (!full.trim()) {
            setError(t("workspace.assistant.aiFailed"));
            rollback();
            return;
          }
          gotText = true;
          await typewriterReveal(
            full,
            (slice) => patchLast((m) => ({ ...m, content: slice })),
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
          if (acc) gotText = true;
          patchLast((m) => ({ ...m, content: acc }));
        }
        acc += dec.decode();
        const finalText = acc.trim() ? acc : t("workspace.assistant.emptyReply");
        patchLast((m) => ({ ...m, content: finalText }));
      } catch (e) {
        if (isAbortError(e)) {
          patchLast((m) =>
            m.content.length === 0 ? { ...m, content: t("workspace.assistant.stopped") } : m,
          );
        } else {
          const failure = e instanceof AiRequestError ? e : handleAiThrown(e, { onRetry });
          if (failure.kind === "off_topic") setError(null);
          else setError(failure.message);
          if (!gotText) rollback();
        }
      } finally {
        abortRef.current = null;
        sendLockRef.current = false;
        setGenerating(false);
      }
    },
    [apiContext.aiContext, patchLast, t, threadKey],
  );

  useEffect(() => {
    runRef.current = runAssistant;
  }, [runAssistant]);

  const onSend = useCallback(() => {
    const q = message.trim();
    if (!q || sendLockRef.current || generating || exhausted) return;
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
    exhausted,
    apiContext.aiContext.endpoint,
    presetPayload,
    runAssistant,
    t,
  ]);

  const canSend =
    Boolean(apiContext.aiContext.endpoint) &&
    message.trim().length > 0 &&
    !generating &&
    !exhausted;

  const placeholder = exhausted
    ? `AI limit reached${resetIn ? `. Resets in ${resetIn}` : ""}`
    : t("workspace.assistant.placeholder");

  return (
    <section
      className={`${styles.wrap} ${variant === "sheet" ? styles.wrapSheet : ""}`}
      aria-label={t("workspace.assistant.aria")}
    >
      <div className={styles.top}>
        <AiLimitBanner />
        <details className={styles.context}>
          <summary className={styles.contextSummaryRow}>
            <span className={styles.contextHeading}>Context</span>
            <span className={styles.contextOp}>{operationLine}</span>
          </summary>
          <div className={styles.contextBody}>
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
        </details>
      </div>

      {variant !== "sheet" ? (
        <div className={styles.head}>
          <AssistantIcon size={20} className={styles.headIcon} />
          <h2 className={styles.title}>APIForge Assistant</h2>
          <span className={styles.beta}>Free model</span>
        </div>
      ) : null}

      <div
        className={styles.chat}
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={generating}
        aria-label="Conversation"
        tabIndex={0}
      >
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <AssistantIcon size={32} className={styles.emptyIcon} animated />
            <p className={styles.chatEmpty}>{t("workspace.assistant.lead")}</p>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className={styles.bubbleUser}>
                <span className="srOnly">{t("workspace.assistant.roleYou")}: </span>
                <p className={styles.userText}>{m.content}</p>
              </div>
            ) : (
              <div key={m.id} className={styles.msgAssistant}>
                <span className={styles.msgAvatar} aria-hidden>
                  <AssistantIcon size={20} animated={false} />
                </span>
                <div className={styles.msgBody}>
                  <span className="srOnly">APIForge Assistant: </span>
                  {m.content.length === 0 && generating && m.id === lastId ? (
                    <div className={styles.waiting}>
                      <AiShimmer lines={4} />
                      <p className={styles.progress} role="status">
                        {progress}
                      </p>
                    </div>
                  ) : (
                    <AiMarkdown source={m.content} streaming={generating && m.id === lastId} />
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>

      {error ? (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.chips} role="group" aria-label="Suggested questions">
        {PRESETS.map(({ kind, labelKey }) => (
          <button
            key={labelKey}
            type="button"
            className={`${styles.chip} focusRing`}
            disabled={generating || exhausted}
            onClick={() => onPick(kind, labelKey)}
          >
            {t(labelKey)}
          </button>
        ))}
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
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          spellCheck={false}
          disabled={generating || exhausted}
          enterKeyHint="send"
        />
        {generating ? (
          <button
            type="button"
            className={`${styles.stopBtn} focusRing`}
            onClick={stopGeneration}
            aria-label={t("workspace.assistant.stop")}
          >
            <MaterialIcon name="stop_circle" size="sm" />
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.send} ${canSend ? styles.sendActive : ""} focusRing`}
            aria-label={t("workspace.assistant.sendAria")}
            disabled={!canSend}
            onClick={onSend}
          >
            <MaterialIcon name="send" size="sm" />
          </button>
        )}
      </div>
      <p className={styles.disclaimer}>{t("workspace.assistant.disclaimer")}</p>
    </section>
  );
}
