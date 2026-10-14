"use client";

import { reportAiHeaders } from "@/hooks/useAiUsage";
import { handleAiErrorResponse, handleAiThrown } from "@/components/ai/aiRequest";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslateFn } from "@/context/LanguageContext";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import MethodBadge from "@/components/atomic/atoms/MethodBadge/MethodBadge";
import btn from "@/components/atomic/atoms/Button/Button.module.css";
import HighlightedCode from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import type { HighlightLanguage } from "@/components/atomic/molecules/HighlightedCode/HighlightedCode";
import FormBodyEditor, {
  formRowFromSpec,
  type FormFieldRow,
} from "@/components/atomic/molecules/FormBodyEditor/FormBodyEditor";
import BinaryResponseView from "@/components/atomic/molecules/BinaryResponseView/BinaryResponseView";
import KeyValueEditor, {
  newKeyValueRow,
  type KeyValueRow,
} from "@/components/atomic/molecules/KeyValueEditor/KeyValueEditor";
import { executeTestRequestClient, joinBaseAndPath } from "@/lib/execute-test-request";
import {
  authHintSummary,
  authHintsForOperation,
} from "@/lib/openapi-auth-resolve";
import {
  parameterExampleString,
  parameterSpecValue,
  parameterType,
} from "@/lib/openapi-parameter-defaults";
import { parseUsageFromResponseHeaders } from "@/lib/groq-token-usage";
import {
  buildRequestBodyExample,
  checkJson,
  getRequestBodyInfo,
} from "@/lib/request-body-example";
import { bodyKindForMediaType, formFieldsFromBody } from "@/lib/request-body-mode";
import { queryString, serializeQueryRows } from "@/lib/query-params";
import { endpointToJsonSafe } from "@/lib/serialize-endpoint";
import type { SchemaValidationIssue } from "@/lib/validate-response-against-schema";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Endpoint } from "@/types/api";
import type {
  ApiExecutionRequest,
  ApiExecutionResult,
  ExecutionFormPart,
  ExecutionMode,
  ExecutionStatusStep,
} from "@/types/execution";
import styles from "./RunApiPanel.module.css";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

interface ParamRow {
  name: string;
  inn: string;
  spec: Record<string, unknown>;
}

function parseParamRows(endpoint: Endpoint): ParamRow[] {
  const p = endpoint.parameters;
  if (!Array.isArray(p)) return [];
  return p
    .map((item) => {
      if (!isObject(item)) return null;
      const name = typeof item.name === "string" ? item.name : "";
      const inn = typeof item.in === "string" ? item.in : "";
      if (!name || !inn) return null;
      return { name, inn, spec: item };
    })
    .filter((x): x is ParamRow => x !== null);
}

function specRow(row: ParamRow, forceEnabled = false): KeyValueRow {
  const required = row.spec.required === true;
  const suggested = parameterSpecValue(row.spec);
  return newKeyValueRow({
    key: row.name,
    value: row.inn === "path" ? parameterExampleString(row.spec) : suggested ?? "",
    enabled: forceEnabled || required || suggested !== null,
    fromSpec: true,
    required,
    hint: parameterType(row.spec),
    description: typeof row.spec.description === "string" ? row.spec.description : undefined,
  });
}

/** Enabled, non-empty rows as a plain object. */
function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (!r.enabled || !r.key.trim()) continue;
    out[r.key.trim()] = r.value;
  }
  return out;
}

/**
 * Content-Type row to prefill for a body media type. None for multipart (fetch adds the boundary)
 * and none for wildcards like image/* (the chosen file's own type is used).
 */
function contentTypeHeaderFor(mediaType: string): string | null {
  if (/^multipart\//i.test(mediaType) || mediaType.includes("*")) return null;
  return mediaType;
}

const HEADER_SUGGESTIONS = [
  "Accept",
  "Authorization",
  "Content-Type",
  "Cache-Control",
  "If-None-Match",
  "User-Agent",
  "X-Request-ID",
  "X-API-Key",
] as const;

const MIME_VALUES = [
  "application/json",
  "application/xml",
  "text/plain",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "*/*",
] as const;

const HEADER_VALUE_SUGGESTIONS: Record<string, readonly string[]> = {
  accept: MIME_VALUES,
  "content-type": MIME_VALUES,
  authorization: ["Bearer ", "Basic "],
  "cache-control": ["no-cache", "no-store", "max-age=0"],
};

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type RequestTab = "params" | "headers" | "body" | "auth";
type AuthType = "none" | "bearer" | "basic" | "apiKey";
type ResponseTab = "body" | "headers" | "schema";
type BodyView = "pretty" | "raw";
type SchemaState = "idle" | "checking" | "match" | "issues" | "noSchema" | "failed";

const AUTH_TYPES: { id: AuthType; labelKey: string }[] = [
  { id: "none", labelKey: "runApi.authNone" },
  { id: "bearer", labelKey: "runApi.authBearer" },
  { id: "basic", labelKey: "runApi.authBasic" },
  { id: "apiKey", labelKey: "runApi.authApiKey" },
];

export default function RunApiPanel({ t }: { t: TranslateFn }) {
  const endpoint = useWorkspaceStore((s) => s.activeEndpoint);
  const specServerUrls = useWorkspaceStore((s) => s.specServerUrls);
  const specSecuritySchemes = useWorkspaceStore((s) => s.specSecuritySchemes);
  const workspaceDefaultBearer = useWorkspaceStore((s) => s.workspaceDefaultBearer);
  const setWorkspaceDefaultBearer = useWorkspaceStore((s) => s.setWorkspaceDefaultBearer);
  const executionMode = useWorkspaceStore((s) => s.executionMode);
  const setExecutionMode = useWorkspaceStore((s) => s.setExecutionMode);
  const setLastGroqUsage = useWorkspaceStore((s) => s.setLastGroqUsage);
  const pendingRequestBody = useWorkspaceStore((s) => s.pendingRequestBody);
  const clearPendingRequestBody = useWorkspaceStore((s) => s.clearPendingRequestBody);

  const [baseUrl, setBaseUrl] = useState("");
  const [pathRows, setPathRows] = useState<KeyValueRow[]>([]);
  const [queryRows, setQueryRows] = useState<KeyValueRow[]>([]);
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>([]);
  const [headersBulk, setHeadersBulk] = useState(false);
  const [headersText, setHeadersText] = useState("{}");
  const [headersBulkError, setHeadersBulkError] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [bodyNote, setBodyNote] = useState<string | null>(null);
  /** Chosen request media type when the operation accepts several (JSON vs multipart, …). */
  const [bodyMediaType, setBodyMediaType] = useState<string | undefined>(undefined);
  const [formRows, setFormRows] = useState<FormFieldRow[]>([]);
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const binaryInputRef = useRef<HTMLInputElement>(null);
  const [requestTab, setRequestTab] = useState<RequestTab>("params");

  const [authType, setAuthType] = useState<AuthType>("none");
  const [bearer, setBearer] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");
  const [apiKeyValue, setApiKeyValue] = useState("");

  const [sending, setSending] = useState(false);
  const [statusStep, setStatusStep] = useState<ExecutionStatusStep>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [corsErrorResult, setCorsErrorResult] = useState<ApiExecutionResult | null>(null);
  const [securityBlockResult, setSecurityBlockResult] = useState<ApiExecutionResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ApiExecutionResult | null>(null);

  const [status, setStatus] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [parsedBody, setParsedBody] = useState<unknown>(null);
  const [binaryResponse, setBinaryResponse] = useState<Blob | null>(null);
  const [streamTruncated, setStreamTruncated] = useState(false);
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>([]);

  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("pretty");
  const [responseExpanded, setResponseExpanded] = useState(false);

  const [schemaState, setSchemaState] = useState<SchemaState>("idle");
  const [issues, setIssues] = useState<SchemaValidationIssue[] | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [responseCopied, setResponseCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const hints = useMemo(
    () => authHintsForOperation(specSecuritySchemes ?? undefined, endpoint?.security),
    [specSecuritySchemes, endpoint?.security],
  );
  const hintLine = useMemo(() => authHintSummary(hints), [hints]);

  const bodyInfo = useMemo(
    () => (endpoint ? getRequestBodyInfo(endpoint, bodyMediaType) : null),
    [endpoint, bodyMediaType],
  );
  const bodyKind = bodyKindForMediaType(bodyInfo?.mediaType);

  const wantsBody = useMemo(() => {
    if (!endpoint) return false;
    const m = endpoint.method.toUpperCase();
    if (m === "GET" || m === "HEAD") return false;
    return bodyInfo != null;
  }, [endpoint, bodyInfo]);

  // Reset the request whenever the endpoint changes; prefill from the spec.
  useEffect(() => {
    if (!endpoint) return;
    const rows = parseParamRows(endpoint);
    setPathRows(rows.filter((r) => r.inn === "path").map((r) => specRow(r, true)));
    setQueryRows(rows.filter((r) => r.inn === "query").map((r) => specRow(r)));
    const info = getRequestBodyInfo(endpoint);
    const m = endpoint.method.toUpperCase();
    const hasBody = info != null && m !== "GET" && m !== "HEAD";
    const hdrs = rows.filter((r) => r.inn === "header").map((r) => specRow(r));
    const contentTypeRow = hasBody ? contentTypeHeaderFor(info.mediaType) : null;
    if (contentTypeRow) hdrs.unshift(newKeyValueRow({ key: "Content-Type", value: contentTypeRow, enabled: true }));
    setHeaderRows(hdrs);
    setHeadersBulk(false);
    setHeadersText("{}");
    setHeadersBulkError(null);
    setBodyMediaType(undefined);
    setBinaryFile(null);
    setFormRows(hasBody ? formFieldsFromBody(info).map(formRowFromSpec) : []);
    // Prefill the body from the spec example (or a schema skeleton) so a request is sendable at once.
    const textBody = hasBody && ["json", "text"].includes(bodyKindForMediaType(info.mediaType));
    const prefill = textBody ? buildRequestBodyExample(endpoint) : null;
    setBodyText(textBody ? (prefill?.text ?? "{}") : "");
    setBodyNote(
      prefill
        ? prefill.source === "spec-example"
          ? t("runApi.bodyFromExample")
          : t("runApi.bodyFromSchema")
        : null,
    );
    setRequestTab(rows.some((r) => r.inn === "path" || r.inn === "query") || !hasBody ? "params" : "body");
    setSendError(null);
    setCorsErrorResult(null);
    setSecurityBlockResult(null);
    setExecutionResult(null);
    setStatus(null);
    setElapsedMs(null);
    setResponseText(null);
    setParsedBody(null);
    setBinaryResponse(null);
    setStreamTruncated(false);
    setResponseHeaders([]);
    setResponseTab("body");
    setBodyView("pretty");
    setResponseExpanded(false);
    setIssues(null);
    setSchemaState("idle");
    setExplanation(null);
    const first = specServerUrls[0]?.trim() ?? "";
    setBaseUrl((prev) => (prev.trim() ? prev : first));
    const ah = authHintsForOperation(specSecuritySchemes ?? undefined, endpoint.security);
    const ak = ah.find((x) => x.kind === "apiKey");
    if (ak?.apiKeyName) setApiKeyName(ak.apiKeyName);
    if (ak?.apiKeyIn === "query" || ak?.apiKeyIn === "header") {
      setApiKeyIn(ak.apiKeyIn === "query" ? "query" : "header");
    }
    // Suggest the auth type the spec asks for; keep the user's choice when the spec is silent.
    const kinds = ah.map((x) => String(x.kind).toLowerCase());
    if (kinds.some((k) => k === "apikey")) setAuthType("apiKey");
    else if (kinds.some((k) => k.includes("basic"))) setAuthType("basic");
    else if (kinds.some((k) => k.includes("bearer") || k.includes("oauth") || k.includes("openid") || k === "http"))
      setAuthType("bearer");
    // `t` is stable for a session; listing it would reset the form on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, specServerUrls, specSecuritySchemes]);

  // Body handed over from the AI payload generator.
  useEffect(() => {
    if (!pendingRequestBody || !endpoint) return;
    if (pendingRequestBody.endpointId !== endpoint.id) return;
    setBodyText(pendingRequestBody.text);
    setBodyNote(t("runApi.bodyFromAi"));
    setRequestTab("body");
    clearPendingRequestBody();
  }, [pendingRequestBody, endpoint, clearPendingRequestBody, t]);

  const pathValues = useMemo(() => rowsToRecord(pathRows), [pathRows]);

  const resolvedPath = useMemo(() => {
    if (!endpoint) return "";
    let p = endpoint.path;
    for (const [k, v] of Object.entries(pathValues)) {
      if (!v) continue;
      p = p.replace(new RegExp(`\\{${escapeRe(k)}\\}`, "g"), encodeURIComponent(v));
    }
    return p;
  }, [endpoint, pathValues]);

  const querySpecs = useMemo(() => {
    const out: Record<string, Record<string, unknown>> = {};
    if (endpoint) for (const r of parseParamRows(endpoint)) if (r.inn === "query") out[r.name] = r.spec;
    return out;
  }, [endpoint]);
  const cookieParams = useMemo(
    () => (endpoint ? parseParamRows(endpoint).filter((r) => r.inn === "cookie").map((r) => r.name) : []),
    [endpoint],
  );

  const queryValues = useMemo(() => serializeQueryRows(queryRows, querySpecs), [queryRows, querySpecs]);
  const queryPreview = useMemo(() => queryString(queryValues), [queryValues]);

  /** Switch between the media types an operation accepts; rebuilds the body editor for that type. */
  const onChangeBodyMediaType = useCallback(
    (mt: string) => {
      if (!endpoint) return;
      setBodyMediaType(mt);
      const info = getRequestBodyInfo(endpoint, mt);
      if (!info) return;
      const kind = bodyKindForMediaType(info.mediaType);
      setFormRows(formFieldsFromBody(info).map(formRowFromSpec));
      setBinaryFile(null);
      if (kind === "json" || kind === "text") {
        const ex = buildRequestBodyExample(endpoint, mt);
        setBodyText(ex?.text ?? "");
        setBodyNote(ex ? (ex.source === "spec-example" ? t("runApi.bodyFromExample") : t("runApi.bodyFromSchema")) : null);
      } else {
        setBodyNote(null);
      }
      const ct = contentTypeHeaderFor(info.mediaType);
      setHeaderRows((rows) => {
        const rest = rows.filter((r) => r.key.trim().toLowerCase() !== "content-type");
        return ct ? [newKeyValueRow({ key: "Content-Type", value: ct, enabled: true }), ...rest] : rest;
      });
    },
    [endpoint, t],
  );

  const bodyValidity = useMemo(() => checkJson(bodyText), [bodyText]);
  const bodyIsJson = bodyKind === "json";

  const enterBulkHeaders = useCallback(() => {
    setHeadersText(JSON.stringify(rowsToRecord(headerRows), null, 2));
    setHeadersBulkError(null);
    setHeadersBulk(true);
  }, [headerRows]);

  const leaveBulkHeaders = useCallback(() => {
    try {
      const obj = JSON.parse(headersText.trim() || "{}") as unknown;
      if (!isObject(obj)) throw new Error("bad");
      // Keep spec-declared rows (with their hints) and update their values; everything else becomes custom rows.
      const next: KeyValueRow[] = [];
      const used = new Set<string>();
      for (const r of headerRows) {
        if (!r.fromSpec) continue;
        const match = Object.keys(obj).find((k) => k.toLowerCase() === r.key.toLowerCase());
        if (match) {
          used.add(match);
          next.push({ ...r, value: String(obj[match] ?? ""), enabled: true });
        } else {
          next.push({ ...r, enabled: false });
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        if (used.has(k)) continue;
        next.push(newKeyValueRow({ key: k, value: String(v ?? ""), enabled: true }));
      }
      setHeaderRows(next);
      setHeadersBulkError(null);
      setHeadersBulk(false);
    } catch {
      setHeadersBulkError(t("runApi.badHeaders"));
    }
  }, [headersText, headerRows, t]);

  const onInsertExample = useCallback(() => {
    if (!endpoint) return;
    const ex = buildRequestBodyExample(endpoint);
    if (!ex) return;
    setBodyText(ex.text);
    setBodyNote(ex.source === "spec-example" ? t("runApi.bodyFromExample") : t("runApi.bodyFromSchema"));
    bodyRef.current?.focus();
  }, [endpoint, t]);

  const onFormatBody = useCallback(() => {
    try {
      setBodyText(JSON.stringify(JSON.parse(bodyText), null, 2));
    } catch {
      /* indicator already shows the error */
    }
  }, [bodyText]);

  const runValidation = useCallback(
    async (code: number, body: unknown) => {
      if (!endpoint) return;
      setSchemaState("checking");
      setExplanation(null);
      try {
        const res = await fetch("/api/validate-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: endpointToJsonSafe(endpoint),
            statusCode: code,
            body,
          }),
        });
        const data = (await res.json()) as { issues?: SchemaValidationIssue[]; error?: string };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const list = data.issues ?? [];
        setIssues(list);
        const onlySkip =
          list.length === 1 &&
          list[0]!.path === "$" &&
          /no json response schema|body is empty/i.test(list[0]!.message);
        setSchemaState(list.length === 0 ? "match" : onlySkip ? "noSchema" : "issues");
      } catch {
        setIssues(null);
        setSchemaState("failed");
      }
    },
    [endpoint],
  );

  const executeWithMode = useCallback(
    async (modeToUse: ExecutionMode) => {
      if (!endpoint || !baseUrl.trim()) return;

      let headers: Record<string, string>;
      if (headersBulk) {
        try {
          const obj = JSON.parse(headersText.trim() || "{}") as unknown;
          if (!isObject(obj)) throw new Error("bad");
          headers = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, String(v ?? "")]));
        } catch {
          setSendError(t("runApi.badHeaders"));
          setRequestTab("headers");
          return;
        }
      } else {
        headers = rowsToRecord(headerRows);
      }

      setSending(true);
      setStatusStep("preparing");
      setSendError(null);
      setCorsErrorResult(null);
      setSecurityBlockResult(null);
      setExecutionResult(null);
      setIssues(null);
      setSchemaState("idle");
      setExplanation(null);

      const fullUrl = joinBaseAndPath(baseUrl.trim(), resolvedPath);
      let parsedBodyReq: unknown = undefined;
      if (wantsBody && bodyKind === "json" && bodyText.trim()) {
        try {
          parsedBodyReq = JSON.parse(bodyText.trim());
        } catch {
          parsedBodyReq = bodyText.trim();
        }
      } else if (wantsBody && bodyKind === "text") {
        parsedBodyReq = bodyText;
      }

      // Form / multipart fields and files; files travel next to the request, parts point at them.
      const files: File[] = [];
      const formParts: ExecutionFormPart[] = [];
      let binaryFileIndex: number | undefined;
      if (wantsBody && (bodyKind === "form" || bodyKind === "multipart")) {
        for (const r of formRows) {
          const name = r.name.trim();
          if (!r.enabled || !name) continue;
          if (r.kind === "file" && bodyKind === "multipart") {
            if (r.files.length === 0 && r.required) {
              setSendError(`Choose a file for "${name}".`);
              setRequestTab("body");
              setSending(false);
              setStatusStep("idle");
              return;
            }
            for (const f of r.files) {
              const exactType = r.accept && !/[*,]/.test(r.accept) ? r.accept : undefined;
              formParts.push({ name, fileIndex: files.length, fileName: f.name, contentType: f.type ? undefined : exactType });
              files.push(f);
            }
          } else {
            formParts.push({ name, value: r.value, contentType: bodyKind === "multipart" ? r.contentType : undefined });
          }
        }
      } else if (wantsBody && bodyKind === "binary") {
        if (!binaryFile) {
          setSendError("Choose a file to send as the request body.");
          setRequestTab("body");
          setSending(false);
          setStatusStep("idle");
          return;
        }
        binaryFileIndex = 0;
        files.push(binaryFile);
      }

      const qValuesClean = queryValues;

      const wsBearer = workspaceDefaultBearer.trim();
      let auth: NonNullable<ApiExecutionRequest["auth"]> = { type: "none" };
      if (authType === "bearer" && (bearer.trim() || wsBearer)) {
        auth = { type: "bearer", bearerToken: bearer.trim() || wsBearer };
      } else if (authType === "basic" && (basicUser.trim() || basicPass)) {
        auth = { type: "basic", basicUser: basicUser.trim() || undefined, basicPass: basicPass || undefined };
      } else if (authType === "apiKey" && apiKeyName.trim() && apiKeyValue.trim()) {
        auth = { type: "apiKey", apiKeyName: apiKeyName.trim(), apiKeyValue: apiKeyValue.trim(), apiKeyIn };
      } else if (wsBearer) {
        auth = { type: "bearer", bearerToken: wsBearer };
      }

      const reqDef: ApiExecutionRequest = {
        url: fullUrl,
        method: endpoint.method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        queryParams: Object.keys(qValuesClean).length > 0 ? qValuesClean : undefined,
        body: wantsBody ? parsedBodyReq : undefined,
        ...(wantsBody && bodyKind !== "json" ? { bodyKind } : {}),
        ...(formParts.length ? { formParts } : {}),
        ...(binaryFileIndex !== undefined ? { binaryFileIndex } : {}),
        auth,
      };

      setStatusStep("validating_target");
      await new Promise((r) => setTimeout(r, 80));
      setStatusStep("executing");

      const result = await executeTestRequestClient(reqDef, modeToUse, files);
      setExecutionResult(result);

      if (result.success) {
        setStatusStep("receiving");
        const code = result.status ?? 200;
        setStatus(code);
        setElapsedMs(result.durationMs ?? 0);
        setResponseHeaders(result.headers ? Object.entries(result.headers) : []);
        setStreamTruncated(Boolean(result.streamTruncated));
        if (result.isBinary) {
          // Image, PDF, video, zip…: preview + download; no text body and no JSON schema check.
          setBinaryResponse(result.binaryBody ?? new Blob([], { type: result.contentType }));
          setResponseText(null);
          setParsedBody(null);
          setIssues(null);
          setSchemaState("idle");
          setStatusStep("complete");
          setSending(false);
          return;
        }
        setBinaryResponse(null);
        const rawText =
          result.rawBody ??
          (typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2));
        setResponseText(rawText.slice(0, 48_000));
        const pb = result.body !== undefined ? result.body : null;
        setParsedBody(pb);
        setStatusStep("complete");
        setSending(false);
        void runValidation(code, pb !== null ? pb : rawText);
        return;
      }

      setStatus(null);
      setElapsedMs(null);
      setResponseText(null);
      setParsedBody(null);
      setBinaryResponse(null);
      setStreamTruncated(false);
      setResponseHeaders([]);
      setStatusStep("blocked");

      const code = result.error?.code;
      if (code === "BROWSER_CORS_BLOCKED" || code === "BROWSER_NETWORK_ERROR") {
        setCorsErrorResult(result);
      } else if (
        code === "PRIVATE_NETWORK_BLOCKED" ||
        code === "LOOPBACK_BLOCKED" ||
        code === "METADATA_ENDPOINT_BLOCKED" ||
        code === "PORT_BLOCKED" ||
        code === "UNSUPPORTED_PROTOCOL" ||
        code === "REDIRECT_BLOCKED"
      ) {
        setSecurityBlockResult(result);
      } else {
        setSendError(result.error?.message || t("runApi.sendFailed"));
      }
      setSending(false);
    },
    [
      endpoint,
      baseUrl,
      resolvedPath,
      queryValues,
      headerRows,
      headersBulk,
      headersText,
      wantsBody,
      bodyText,
      bodyKind,
      formRows,
      binaryFile,
      authType,
      bearer,
      workspaceDefaultBearer,
      basicUser,
      basicPass,
      apiKeyName,
      apiKeyValue,
      apiKeyIn,
      runValidation,
      t,
    ],
  );

  const onSend = useCallback(async () => {
    await executeWithMode(executionMode);
  }, [executeWithMode, executionMode]);

  const onRunViaProxyClick = useCallback(async () => {
    await executeWithMode("APIFORGE_PROXY");
  }, [executeWithMode]);

  const responseDisplay = useMemo(() => {
    if (responseText == null) return "";
    if (parsedBody !== null) {
      return typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody, null, 2);
    }
    const trimmed = responseText.trim();
    if (
      (trimmed.startsWith("{") && trimmed.includes("}")) ||
      (trimmed.startsWith("[") && trimmed.includes("]"))
    ) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      } catch {
        return responseText;
      }
    }
    return responseText;
  }, [responseText, parsedBody]);

  const looksLikeJson =
    parsedBody !== null ||
    (responseText?.trim().startsWith("{") ?? false) ||
    (responseText?.trim().startsWith("[") ?? false);

  const onExplain = useCallback(async () => {
    if (!issues?.length || !endpoint || responseText == null) return;
    setExplainLoading(true);
    try {
      const res = await fetch("/api/groq/schema-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues,
          endpointLine: `${endpoint.method} ${endpoint.path}`,
          responsePreview: responseText.slice(0, 1500),
        }),
      });
      reportAiHeaders(res.headers);
      if (!res.ok) {
        // Toast + typed error: rate limit, off-topic, busy model, bad input.
        await handleAiErrorResponse(res, { onRetry: () => void onExplain() });
      }
      const data = (await res.json()) as { explanation?: string; error?: string };
      setExplanation(data.explanation ?? null);
      const usage = parseUsageFromResponseHeaders(res.headers);
      if (usage) setLastGroqUsage(usage);
    } catch (e) {
      setExplanation(null);
      handleAiThrown(e);
    } finally {
      setExplainLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, endpoint, responseText, setLastGroqUsage]);

  const responseBodyForView = useMemo(() => {
    if (responseText == null) return "";
    return bodyView === "raw" ? responseText : responseDisplay;
  }, [responseText, bodyView, responseDisplay]);

  const onCopyResponse = useCallback(async () => {
    let text = "";
    if (responseTab === "headers") {
      text = responseHeaders.map(([k, v]) => `${k}: ${v}`).join("\n");
    } else if (responseTab === "body") {
      text = responseBodyForView;
    } else if (issues) {
      text = issues.map((i) => `${i.severity}\t${i.path}\t${i.message}`).join("\n");
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      setResponseCopied(true);
      copyResetRef.current = setTimeout(() => {
        setResponseCopied(false);
        copyResetRef.current = null;
      }, 2000);
    } catch {
      /* ignore */
    }
  }, [responseTab, responseHeaders, responseBodyForView, issues]);

  const responseHighlightLang: HighlightLanguage = useMemo(() => {
    if (looksLikeJson && bodyView !== "raw") return "json";
    return "javascript";
  }, [looksLikeJson, bodyView]);

  useEffect(() => {
    setResponseCopied(false);
    if (copyResetRef.current) {
      clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [responseTab, bodyView, status]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  if (!endpoint) {
    return <p className={styles.placeholder}>{t("workspace.selectEndpoint")}</p>;
  }

  const fullUrlPreview =
    joinBaseAndPath(baseUrl.trim() || "{server}", resolvedPath || endpoint.path) + queryPreview;

  const statusOk = status != null && status >= 200 && status < 300;
  const statusWarn = status != null && status >= 300 && status < 400;
  const hasResponse = status != null || responseText != null;
  const hasOutcome = hasResponse || Boolean(corsErrorResult || securityBlockResult || sendError);

  const paramCount =
    pathRows.length + queryRows.filter((r) => r.enabled && r.key.trim()).length;
  const headerCount = headersBulk
    ? null
    : headerRows.filter((r) => r.enabled && r.key.trim()).length;
  const realIssues = (issues ?? []).filter((i) => schemaState === "issues" || i.path !== "$");

  const requestTabs: { id: RequestTab; label: string; count?: number | null }[] = [
    { id: "params", label: t("runApi.tabParams"), count: paramCount || null },
    { id: "headers", label: t("runApi.tabHeadersReq"), count: headerCount || null },
    ...(wantsBody ? [{ id: "body" as const, label: t("runApi.tabBodyReq") }] : []),
    { id: "auth", label: t("runApi.tabAuth") },
  ];

  const statusStepLabel =
    statusStep === "preparing"
      ? t("runApi.statusSteps.preparing")
      : statusStep === "validating_target"
        ? t("runApi.statusSteps.validating_target")
        : statusStep === "executing"
          ? t("runApi.statusSteps.executing")
          : statusStep === "receiving"
            ? t("runApi.statusSteps.receiving")
            : t("common.loading");

  return (
    <div
      className={styles.panel}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !sending && baseUrl.trim()) {
          e.preventDefault();
          void onSend();
        }
      }}
    >
      {/* Request line */}
      <div className={styles.requestLine}>
        <div className={styles.urlBox}>
          <span className={styles.urlMethod}>
            <MethodBadge method={endpoint.method.toUpperCase()} />
          </span>
          <output className={styles.urlText} aria-label={t("runApi.resolvedUrl")} title={fullUrlPreview}>
            {fullUrlPreview}
          </output>
        </div>
        <button
          type="button"
          className={`${btn.btn} ${btn.primary} ${btn.md} ${styles.sendBtn} focusRing`}
          onClick={() => void onSend()}
          disabled={sending || !baseUrl.trim()}
          aria-busy={sending}
          title={t("runApi.sendShortcut")}
        >
          {sending ? (
            <MaterialIcon name="progress_activity" size="xs" className={btn.spin} />
          ) : (
            <MaterialIcon name="send" size="xs" />
          )}
          {sending ? t("runApi.sending") : t("runApi.send")}
        </button>
      </div>

      <div className={styles.metaRow}>
        <div className={styles.metaField}>
          <label className={styles.metaLabel} htmlFor="run-base">
            {t("runApi.baseUrl")}
          </label>
          <input
            id="run-base"
            type="url"
            className={`${styles.input} ${styles.mono}`}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            list={specServerUrls.length ? "run-base-servers" : undefined}
            aria-invalid={!baseUrl.trim()}
            spellCheck={false}
          />
          {specServerUrls.length ? (
            <datalist id="run-base-servers">
              {specServerUrls.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          ) : null}
        </div>
        <div className={styles.metaFieldMode}>
          <label className={styles.metaLabel} htmlFor="run-exec-mode">
            {t("runApi.executionModeLabel")}
          </label>
          <select
            id="run-exec-mode"
            className={styles.select}
            value={executionMode}
            onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
          >
            <option value="AUTO">{t("runApi.modeAuto")}</option>
            <option value="BROWSER">{t("runApi.modeBrowser")}</option>
            <option value="APIFORGE_PROXY">{t("runApi.modeProxy")}</option>
          </select>
        </div>
      </div>
      {!baseUrl.trim() ? <p className={styles.fieldError}>{t("runApi.baseUrlMissing")}</p> : null}

      <div className={styles.split}>
        {/* ——— Request ——— */}
        <section className={styles.requestCol} aria-label={t("runApi.requestSection")}>
          <div className={styles.subTabs} role="tablist" aria-label={t("runApi.requestSection")}>
            {requestTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`run-tab-${tab.id}`}
                aria-selected={requestTab === tab.id}
                aria-controls={`run-panel-${tab.id}`}
                className={`${styles.subTab} focusRing ${requestTab === tab.id ? styles.subTabActive : ""}`}
                onClick={() => setRequestTab(tab.id)}
              >
                {tab.label}
                {tab.count ? <span className={styles.count}>{tab.count}</span> : null}
                {tab.id === "auth" && authType !== "none" ? (
                  <span className={styles.dot} aria-hidden />
                ) : null}
                {tab.id === "body" && bodyIsJson && bodyValidity.state === "invalid" ? (
                  <span className={`${styles.dot} ${styles.dotError}`} aria-label={t("runApi.jsonInvalidShort")} />
                ) : null}
              </button>
            ))}
          </div>

          <div
            className={styles.tabPanel}
            role="tabpanel"
            id={`run-panel-${requestTab}`}
            aria-labelledby={`run-tab-${requestTab}`}
          >
            {requestTab === "params" ? (
              <div className={styles.stack}>
                {pathRows.length > 0 ? (
                  <div className={styles.group}>
                    <h4 className={styles.groupTitle}>{t("runApi.pathParams")}</h4>
                    <KeyValueEditor
                      rows={pathRows}
                      onChange={setPathRows}
                      label={t("runApi.pathParams")}
                      addLabel=""
                      allowAdd={false}
                      allowToggle={false}
                    />
                  </div>
                ) : null}
                <div className={styles.group}>
                  <h4 className={styles.groupTitle}>{t("runApi.queryParams")}</h4>
                  {queryRows.length === 0 && pathRows.length === 0 ? (
                    <p className={styles.muted}>{t("runApi.noParams")}</p>
                  ) : null}
                  <KeyValueEditor
                    rows={queryRows}
                    onChange={setQueryRows}
                    label={t("runApi.queryParams")}
                    addLabel={t("runApi.addQueryParam")}
                    keyPlaceholder={t("runApi.keyPlaceholder")}
                    valuePlaceholder={t("runApi.valuePlaceholder")}
                  />
                  {Object.keys(querySpecs).some((k) => /array|object/.test(JSON.stringify(querySpecs[k]?.schema ?? querySpecs[k]?.type ?? ""))) ? (
                    <p className={styles.muted}>
                      Lists: type 1,2,3 or a JSON array. Objects: type JSON. They are sent the way the spec says
                      (repeated keys, comma list or key[field]).
                    </p>
                  ) : null}
                </div>
                {cookieParams.length ? (
                  <p className={styles.muted}>
                    Cookie parameters ({cookieParams.join(", ")}) cannot be set here: browsers block the Cookie
                    header and the proxy strips it. Sign in to the API in the same browser, or send the value
                    another way the API accepts.
                  </p>
                ) : null}
              </div>
            ) : null}

            {requestTab === "headers" ? (
              <div className={styles.stack}>
                <div className={styles.toolbarRow}>
                  <p className={styles.muted}>{t("runApi.headersHint")}</p>
                  <button
                    type="button"
                    className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
                    aria-pressed={headersBulk}
                    onClick={() => (headersBulk ? leaveBulkHeaders() : enterBulkHeaders())}
                  >
                    <MaterialIcon name={headersBulk ? "view_list" : "data_object"} size="xs" />
                    {headersBulk ? t("runApi.keyValueEdit") : t("runApi.bulkEdit")}
                  </button>
                </div>
                {headersBulk ? (
                  <>
                    <textarea
                      className={`${styles.textarea} ${styles.mono}`}
                      rows={8}
                      value={headersText}
                      onChange={(e) => setHeadersText(e.target.value)}
                      spellCheck={false}
                      aria-label={t("runApi.headersJson")}
                      aria-invalid={Boolean(headersBulkError)}
                    />
                    {headersBulkError ? <p className={styles.fieldError}>{headersBulkError}</p> : null}
                  </>
                ) : (
                  <KeyValueEditor
                    rows={headerRows}
                    onChange={setHeaderRows}
                    label={t("runApi.tabHeadersReq")}
                    addLabel={t("runApi.addHeader")}
                    keyPlaceholder={t("runApi.headerPlaceholder")}
                    valuePlaceholder={t("runApi.valuePlaceholder")}
                    keySuggestions={HEADER_SUGGESTIONS}
                    valueSuggestions={HEADER_VALUE_SUGGESTIONS}
                  />
                )}
              </div>
            ) : null}

            {requestTab === "body" && wantsBody ? (
              <div className={styles.stack}>
                {bodyInfo && bodyInfo.mediaTypes.length > 1 ? (
                  <label className={styles.mediaTypeRow}>
                    <span className={styles.muted}>Body type</span>
                    <select
                      className={`${styles.select} ${styles.mediaTypeSelect} focusRing`}
                      value={bodyInfo.mediaType}
                      onChange={(e) => onChangeBodyMediaType(e.target.value)}
                    >
                      {bodyInfo.mediaTypes.map((mt) => (
                        <option key={mt} value={mt}>
                          {mt}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {bodyKind === "form" || bodyKind === "multipart" ? (
                  <FormBodyEditor rows={formRows} onChange={setFormRows} allowFiles={bodyKind === "multipart"} />
                ) : null}

                {bodyKind === "binary" ? (
                  <div className={styles.binaryPick}>
                    <button
                      type="button"
                      className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
                      onClick={() => binaryInputRef.current?.click()}
                    >
                      <MaterialIcon name="upload_file" size="xs" />
                      {binaryFile ? "Change file" : "Choose file"}
                    </button>
                    <span className={styles.binaryName}>
                      {binaryFile ? `${binaryFile.name} · ${formatBytes(binaryFile.size)}` : "The file is sent as the raw request body."}
                    </span>
                    <input
                      ref={binaryInputRef}
                      type="file"
                      hidden
                      accept={bodyInfo && bodyInfo.mediaType !== "application/octet-stream" ? bodyInfo.mediaType : undefined}
                      onChange={(e) => {
                        setBinaryFile(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : null}

                {bodyKind === "json" || bodyKind === "text" ? (
                <>
                <div className={styles.toolbarRow}>
                  <div className={styles.btnGroup}>
                    <button
                      type="button"
                      className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
                      onClick={onInsertExample}
                    >
                      <MaterialIcon name="data_object" size="xs" />
                      {t("runApi.insertExample")}
                    </button>
                    <button
                      type="button"
                      className={`${btn.btn} ${btn.ghost} ${btn.sm} focusRing`}
                      onClick={onFormatBody}
                      disabled={!bodyIsJson || bodyValidity.state !== "valid"}
                    >
                      <MaterialIcon name="format_align_left" size="xs" />
                      {t("runApi.formatJson")}
                    </button>
                  </div>
                  {bodyIsJson ? (
                    <span
                      className={`${styles.validity} ${
                        bodyValidity.state === "valid"
                          ? styles.validityOk
                          : bodyValidity.state === "invalid"
                            ? styles.validityErr
                            : ""
                      }`}
                      role="status"
                    >
                      <MaterialIcon
                        name={
                          bodyValidity.state === "valid"
                            ? "check_circle"
                            : bodyValidity.state === "invalid"
                              ? "error"
                              : "radio_button_unchecked"
                        }
                        size="xs"
                      />
                      {bodyValidity.state === "valid"
                        ? t("runApi.jsonValid")
                        : bodyValidity.state === "invalid"
                          ? bodyValidity.line
                            ? t("runApi.jsonInvalidLine", { line: bodyValidity.line })
                            : t("runApi.jsonInvalidShort")
                          : t("runApi.jsonEmpty")}
                    </span>
                  ) : null}
                </div>
                <textarea
                  ref={bodyRef}
                  className={`${styles.textarea} ${styles.mono} ${styles.bodyEditor} ${
                    bodyIsJson && bodyValidity.state === "invalid" ? styles.textareaInvalid : ""
                  }`}
                  rows={14}
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setBodyNote(null);
                  }}
                  spellCheck={false}
                  placeholder={bodyIsJson ? "{}" : bodyInfo?.mediaType ?? ""}
                  aria-label={t("runApi.body")}
                  aria-invalid={bodyIsJson && bodyValidity.state === "invalid"}
                  aria-describedby="run-body-meta"
                />
                </>
                ) : null}
                <p id="run-body-meta" className={styles.muted}>
                  {bodyIsJson && bodyValidity.state === "invalid" && bodyValidity.message
                    ? bodyValidity.message
                    : bodyNote ??
                      t("runApi.bodyMeta", {
                        type: bodyInfo?.mediaType ?? "application/json",
                        required: bodyInfo?.required ? t("runApi.required") : t("runApi.optional"),
                      })}
                </p>
              </div>
            ) : null}

            {requestTab === "auth" ? (
              <div className={styles.stack}>
                <p className={styles.muted}>
                  {hintLine ? t("runApi.specAuth", { hint: hintLine }) : t("runApi.noSpecAuth")}
                </p>
                <div className={styles.segment} role="radiogroup" aria-label={t("runApi.authType")}>
                  {AUTH_TYPES.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={authType === a.id}
                      className={`${styles.segBtn} focusRing ${authType === a.id ? styles.segBtnActive : ""}`}
                      onClick={() => setAuthType(a.id)}
                    >
                      {t(a.labelKey)}
                    </button>
                  ))}
                </div>

                {authType === "none" ? (
                  <p className={styles.muted}>{t("runApi.authNoneHint")}</p>
                ) : null}

                {authType === "bearer" ? (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="run-bearer">
                      {t("runApi.bearerToken")}
                    </label>
                    <input
                      id="run-bearer"
                      type="password"
                      autoComplete="off"
                      className={`${styles.input} ${styles.mono}`}
                      value={bearer}
                      onChange={(e) => setBearer(e.target.value)}
                      placeholder={workspaceDefaultBearer ? t("runApi.bearerUsesDefault") : "eyJhbGciOi…"}
                    />
                  </div>
                ) : null}

                {authType === "basic" ? (
                  <div className={styles.twoCol}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="run-basic-u">
                        {t("runApi.username")}
                      </label>
                      <input
                        id="run-basic-u"
                        className={styles.input}
                        value={basicUser}
                        onChange={(e) => setBasicUser(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="run-basic-p">
                        {t("runApi.password")}
                      </label>
                      <input
                        id="run-basic-p"
                        type="password"
                        className={styles.input}
                        value={basicPass}
                        onChange={(e) => setBasicPass(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                ) : null}

                {authType === "apiKey" ? (
                  <>
                    <div className={styles.apiKeyRow}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="run-ak-name">
                          {t("runApi.apiKeyName")}
                        </label>
                        <input
                          id="run-ak-name"
                          className={`${styles.input} ${styles.mono}`}
                          value={apiKeyName}
                          onChange={(e) => setApiKeyName(e.target.value)}
                          placeholder="X-API-Key"
                          spellCheck={false}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="run-ak-in">
                          {t("runApi.apiKeyIn")}
                        </label>
                        <select
                          id="run-ak-in"
                          className={styles.select}
                          value={apiKeyIn}
                          onChange={(e) => setApiKeyIn(e.target.value === "query" ? "query" : "header")}
                        >
                          <option value="header">{t("runApi.inHeader")}</option>
                          <option value="query">{t("runApi.inQuery")}</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="run-ak-val">
                        {t("runApi.apiKeyValue")}
                      </label>
                      <input
                        id="run-ak-val"
                        type="password"
                        className={`${styles.input} ${styles.mono}`}
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </>
                ) : null}

                <div className={`${styles.field} ${styles.divided}`}>
                  <label className={styles.label} htmlFor="workspace-default-bearer">
                    {t("runApi.workspaceBearerLabel")}
                  </label>
                  <input
                    id="workspace-default-bearer"
                    type="password"
                    autoComplete="off"
                    className={`${styles.input} ${styles.mono}`}
                    value={workspaceDefaultBearer}
                    onChange={(e) => setWorkspaceDefaultBearer(e.target.value)}
                    placeholder={t("runApi.workspaceBearerPlaceholder")}
                  />
                  <p className={styles.muted}>{t("runApi.workspaceBearerHint")}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ——— Response ——— */}
        <section
          className={`${styles.responseCol} ${responseExpanded ? styles.responseExpanded : ""}`}
          aria-label={t("runApi.responseSection")}
          aria-live="polite"
          aria-busy={sending}
        >
          <div className={styles.responseHead}>
            <div className={styles.responseHeadLeft}>
              <h3 className={styles.responseTitle}>{t("runApi.responseSection")}</h3>
              {hasResponse && status != null ? (
                <>
                  <span
                    className={`${styles.statusBadge} ${
                      statusOk ? styles.statusOk : statusWarn ? styles.statusWarn : styles.statusErr
                    }`}
                  >
                    {status} {STATUS_TEXT[status] ?? ""}
                  </span>
                  <span className={styles.metric}>
                    {elapsedMs != null ? t("runApi.elapsed", { ms: elapsedMs }) : null}
                  </span>
                  {executionResult?.responseSizeBytes != null ? (
                    <span className={styles.metric}>{formatBytes(executionResult.responseSizeBytes)}</span>
                  ) : null}
                  {executionResult ? (
                    <span className={styles.metric}>
                      {executionResult.executionMode === "apiforge-proxy"
                        ? t("runApi.modeProxyShort")
                        : t("runApi.modeBrowserShort")}
                      {executionResult.redirectCount
                        ? ` · ${t("runApi.redirectsLabel", { count: executionResult.redirectCount })}`
                        : ""}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
            {hasResponse ? (
              <div className={styles.responseHeadRight}>
                <button
                  type="button"
                  className={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly} focusRing`}
                  onClick={() => void onCopyResponse()}
                  title={t("runApi.copyResponse")}
                  aria-label={responseCopied ? t("workspace.copied") : t("runApi.copyResponse")}
                >
                  <MaterialIcon
                    name={responseCopied ? "check" : "content_copy"}
                    size="xs"
                    className={responseCopied ? styles.copied : ""}
                  />
                </button>
                <button
                  type="button"
                  className={`${btn.btn} ${btn.ghost} ${btn.sm} ${btn.iconOnly} focusRing`}
                  aria-label={responseExpanded ? t("runApi.collapse") : t("runApi.expand")}
                  aria-pressed={responseExpanded}
                  onClick={() => setResponseExpanded((prev) => !prev)}
                  title={responseExpanded ? t("runApi.collapse") : t("runApi.expand")}
                >
                  <MaterialIcon name={responseExpanded ? "fullscreen_exit" : "fullscreen"} size="xs" />
                </button>
              </div>
            ) : null}
          </div>

          {sending ? (
            <div className={styles.pending}>
              <p className={styles.pendingLine}>
                <MaterialIcon name="progress_activity" size="xs" className={btn.spin} />
                {statusStepLabel}
              </p>
              <div className={styles.skeleton} aria-hidden>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}

          {!sending && corsErrorResult ? (
            <div className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
              <h4 className={styles.noticeTitle}>
                <MaterialIcon name="shield" size="sm" />
                {t("runApi.corsBlockedTitle")}
              </h4>
              <p className={styles.noticeText}>{t("runApi.corsBlockedSub")}</p>
              <button
                type="button"
                className={`${btn.btn} ${btn.secondary} ${btn.sm} focusRing`}
                onClick={() => void onRunViaProxyClick()}
                disabled={sending}
              >
                {t("runApi.runViaProxyCta")}
              </button>
            </div>
          ) : null}

          {!sending && securityBlockResult ? (
            <div className={`${styles.notice} ${styles.noticeErr}`} role="alert">
              <h4 className={styles.noticeTitle}>
                <MaterialIcon name="gpp_bad" size="sm" />
                {t("runApi.securityBlockedTitle")}
              </h4>
              <p className={styles.noticeText}>{securityBlockResult.error?.message}</p>
              <span className={styles.requestId}>
                {t("runApi.requestIdLabel", { id: securityBlockResult.requestId })}
              </span>
            </div>
          ) : null}

          {!sending && sendError ? (
            <div className={`${styles.notice} ${styles.noticeErr}`} role="alert">
              <h4 className={styles.noticeTitle}>
                <MaterialIcon name="error" size="sm" />
                {t("runApi.sendFailed")}
              </h4>
              <p className={styles.noticeText}>{sendError}</p>
            </div>
          ) : null}

          {!sending && !hasOutcome ? (
            <div className={styles.emptyResponse}>
              <MaterialIcon name="send" size="md" className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{t("runApi.emptyTitle")}</p>
              <p className={styles.emptyText}>{t("runApi.emptyText")}</p>
            </div>
          ) : null}

          {!sending && hasResponse ? (
            <>
              <div className={styles.schemaStrip} role="status">
                {schemaState === "checking" ? (
                  <span className={styles.schemaChip}>
                    <MaterialIcon name="progress_activity" size="xs" className={btn.spin} />
                    {t("runApi.schemaChecking")}
                  </span>
                ) : schemaState === "match" ? (
                  <span className={`${styles.schemaChip} ${styles.schemaOk}`}>
                    <MaterialIcon name="check_circle" size="xs" />
                    {t("runApi.schemaMatch")}
                  </span>
                ) : schemaState === "issues" ? (
                  <button
                    type="button"
                    className={`${styles.schemaChip} ${styles.schemaWarn} focusRing`}
                    onClick={() => setResponseTab("schema")}
                  >
                    <MaterialIcon name="warning" size="xs" />
                    {t("runApi.schemaIssues", { count: realIssues.length })}
                  </button>
                ) : schemaState === "noSchema" ? (
                  <span className={styles.schemaChip}>
                    <MaterialIcon name="info" size="xs" />
                    {t("runApi.schemaNone", { code: status ?? "" })}
                  </span>
                ) : schemaState === "failed" ? (
                  <button
                    type="button"
                    className={`${styles.schemaChip} focusRing`}
                    onClick={() => status != null && void runValidation(status, parsedBody ?? responseText)}
                  >
                    <MaterialIcon name="refresh" size="xs" />
                    {t("runApi.schemaRetry")}
                  </button>
                ) : null}
              </div>

              <div className={styles.respTabsRow}>
                <div className={styles.subTabs} role="tablist" aria-label={t("runApi.responseSection")}>
                  {(
                    [
                      ["body", t("runApi.tabBody")],
                      ["headers", t("runApi.tabHeaders", { count: responseHeaders.length })],
                      ["schema", t("runApi.tabSchema")],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={responseTab === id}
                      className={`${styles.subTab} focusRing ${responseTab === id ? styles.subTabActive : ""}`}
                      onClick={() => setResponseTab(id)}
                    >
                      {label}
                      {id === "schema" && schemaState === "issues" ? (
                        <span className={`${styles.dot} ${styles.dotWarn}`} aria-hidden />
                      ) : null}
                    </button>
                  ))}
                </div>
                {responseTab === "body" ? (
                  <div className={styles.segment} role="group" aria-label={t("runApi.bodyViewAria")}>
                    {(["pretty", "raw"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={bodyView === v}
                        className={`${styles.segBtn} ${styles.segBtnSm} focusRing ${bodyView === v ? styles.segBtnActive : ""}`}
                        onClick={() => setBodyView(v)}
                      >
                        {v === "pretty" ? t("runApi.viewPretty") : t("runApi.viewRaw")}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {responseTab === "body" && streamTruncated ? (
                <p className={styles.muted}>
                  Streaming response: showing what arrived in the first 5 seconds, then the connection was closed.
                </p>
              ) : null}
              {responseTab === "body" && binaryResponse ? (
                <div className={styles.codeBox}>
                  <BinaryResponseView
                    blob={binaryResponse}
                    contentType={responseHeaders.find(([k]) => k.toLowerCase() === "content-type")?.[1]}
                    contentDisposition={responseHeaders.find(([k]) => k.toLowerCase() === "content-disposition")?.[1]}
                  />
                </div>
              ) : responseTab === "body" ? (
                <div className={styles.codeBox}>
                  {responseBodyForView ? (
                    <HighlightedCode
                      code={responseBodyForView}
                      language={responseHighlightLang}
                      className={styles.responseHl}
                    />
                  ) : (
                    <p className={styles.codeEmpty}>{t("runApi.emptyBody")}</p>
                  )}
                </div>
              ) : null}

              {responseTab === "headers" ? (
                <div className={styles.codeBox}>
                  {responseHeaders.length ? (
                    <table className={styles.headerTable}>
                      <tbody>
                        {responseHeaders.map(([k, v]) => (
                          <tr key={k}>
                            <th scope="row">{k}</th>
                            <td>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className={styles.codeEmpty}>{t("runApi.noHeaders")}</p>
                  )}
                </div>
              ) : null}

              {responseTab === "schema" ? (
                <div className={styles.stack}>
                  {schemaState === "checking" ? (
                    <p className={styles.muted}>{t("runApi.schemaChecking")}</p>
                  ) : schemaState === "match" ? (
                    <p className={styles.validOk}>
                      <MaterialIcon name="check_circle" size="xs" />
                      {t("runApi.schemaMatchLong", { code: status ?? "" })}
                    </p>
                  ) : schemaState === "noSchema" ? (
                    <p className={styles.muted}>{issues?.[0]?.message}</p>
                  ) : schemaState === "failed" ? (
                    <p className={styles.muted}>{t("runApi.schemaFailed")}</p>
                  ) : realIssues.length ? (
                    <>
                      <ul className={styles.issueList}>
                        {realIssues.map((iss, i) => (
                          <li key={i} className={styles.issue}>
                            <span
                              className={`${styles.sev} ${iss.severity === "error" ? styles.sevErr : styles.sevWarn}`}
                            >
                              {iss.severity}
                            </span>
                            <code className={styles.issuePath}>{iss.path}</code>
                            <span className={styles.issueMsg}>{iss.message}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className={`${btn.btn} ${btn.secondary} ${btn.sm} ${styles.alignStart} focusRing`}
                        onClick={() => void onExplain()}
                        disabled={explainLoading}
                        aria-busy={explainLoading}
                      >
                        <MaterialIcon
                          name={explainLoading ? "progress_activity" : "auto_awesome"}
                          size="xs"
                          className={explainLoading ? btn.spin : ""}
                        />
                        {explainLoading ? t("runApi.explaining") : t("runApi.explain")}
                      </button>
                      {explanation ? <div className={styles.explain}>{explanation}</div> : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
