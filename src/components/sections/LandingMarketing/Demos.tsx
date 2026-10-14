import type { ReactNode } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import styles from "./Demos.module.css";

/*
 * Small, static recreations of real workspace panels for marketing pages.
 * Values are illustrative and every frame is labeled "Example" in its chrome.
 * Server-safe: no hooks, no client state.
 */

interface DemoFrameProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function DemoFrame({ label, children, className = "" }: DemoFrameProps) {
  return (
    <div className={`${styles.frame} ${className}`.trim()} aria-hidden>
      <div className={styles.chrome}>
        <span className={styles.chromeLabel}>{label}</span>
        <span className={styles.example}>Example</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

export function RunDemo() {
  return (
    <DemoFrame label="Request">
      <div className={styles.urlBar}>
        <span className={`${styles.method} ${styles.methodGet}`}>GET</span>
        <span className={styles.url}>localhost:8080/v1/orders/42</span>
        <span className={styles.send}>
          Send
          <MaterialIcon name="send" size="xs" />
        </span>
      </div>
      <div className={styles.modes}>
        <span className={styles.modesLabel}>Mode</span>
        <span className={styles.segment}>
          <span className={styles.segmentOn}>Auto</span>
          <span>Browser</span>
          <span>Proxy</span>
        </span>
      </div>
      <div className={styles.response}>
        <div className={styles.responseHead}>
          <span className={styles.statusOk}>200 OK</span>
          <span className={styles.responseMeta}>142 ms · via proxy (CORS blocked in browser)</span>
        </div>
        <pre className={styles.code}>
          {"{\n"}
          {"  "}
          <span className={styles.codeKey}>&quot;id&quot;</span>
          {": "}
          <span className={styles.codeNum}>42</span>
          {",\n  "}
          <span className={styles.codeKey}>&quot;status&quot;</span>
          {": "}
          <span className={styles.codeStr}>&quot;shipped&quot;</span>
          {",\n  "}
          <span className={styles.codeKey}>&quot;total&quot;</span>
          {": "}
          <span className={styles.codeFlag}>&quot;19.90&quot;</span>
          {"\n}"}
        </pre>
        <div className={styles.issue}>
          <MaterialIcon name="error" size="xs" />
          <span>
            <code>total</code> is a string; the schema expects <code>number</code>
          </span>
        </div>
      </div>
    </DemoFrame>
  );
}

/* Pillar names match the real scoring engine (see /api-score). */
const EXAMPLE_PILLARS: [string, number][] = [
  ["Path naming", 92],
  ["HTTP verb usage", 81],
  ["Error handling", 58],
  ["Documentation", 74],
];

export function ScoreDemo() {
  return (
    <DemoFrame label="Quality score">
      <div className={styles.scoreHead}>
        <div className={styles.scoreValue}>
          76<span>/100</span>
        </div>
        <span className={styles.scoreNote}>7 pillars · rule-based</span>
      </div>
      <ul className={styles.pillars}>
        {EXAMPLE_PILLARS.map(([name, value]) => (
          <li key={name}>
            <span className={styles.pillarName}>{name}</span>
            <span className={styles.pillarTrack}>
              <span
                className={`${styles.pillarFill} ${value < 65 ? styles.pillarWarn : ""}`}
                style={{ width: `${value}%` }}
              />
            </span>
            <span className={styles.pillarValue}>{value}</span>
          </li>
        ))}
      </ul>
      <div className={styles.fixRow}>
        <span className={styles.fixLabel}>Fix preview</span>
        <span className={styles.fixFrom}>POST /getUserOrders</span>
        <MaterialIcon name="arrow_forward" size="xs" className={styles.fixArrow} />
        <span className={styles.fixTo}>GET /users/{"{id}"}/orders</span>
      </div>
    </DemoFrame>
  );
}

/* Mirrors what the parser reports for the public Swagger Petstore (v2). */
const PARSE_LOG: [string, string][] = [
  ["Fetched", "petstore.swagger.io/v2/swagger.json"],
  ["Detected", "Swagger 2.0 · JSON"],
  ["Resolved", "6 definitions via $ref"],
  ["Listed", "20 operations in 3 tags"],
];

export function ValidateDemo() {
  return (
    <DemoFrame label="Parse log">
      <ol className={styles.log}>
        {PARSE_LOG.map(([verb, detail]) => (
          <li key={verb}>
            <MaterialIcon name="check_circle" size="xs" className={styles.logIcon} />
            <span className={styles.logVerb}>{verb}</span>
            <span className={styles.logDetail}>{detail}</span>
          </li>
        ))}
      </ol>
      <div className={styles.endpoints}>
        <span className={styles.endpointsLabel}>pet</span>
        <div className={styles.endpoint}>
          <span className={`${styles.method} ${styles.methodPost}`}>POST</span>
          <span className={styles.path}>/pet</span>
        </div>
        <div className={styles.endpoint}>
          <span className={`${styles.method} ${styles.methodGet}`}>GET</span>
          <span className={styles.path}>/pet/findByStatus</span>
        </div>
        <div className={styles.endpoint}>
          <span className={`${styles.method} ${styles.methodDelete}`}>DELETE</span>
          <span className={styles.path}>/pet/{"{petId}"}</span>
        </div>
      </div>
    </DemoFrame>
  );
}
