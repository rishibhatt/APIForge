import styles from "./MethodBadge.module.css";

function variant(method: string): string {
  const x = method.toUpperCase();
  if (x === "GET") return styles.get;
  if (x === "POST") return styles.post;
  if (x === "PUT") return styles.put;
  if (x === "PATCH") return styles.patch;
  if (x === "DELETE") return styles.delete;
  return styles.default;
}

interface MethodBadgeProps {
  method: string;
}

export default function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span className={`${styles.badge} ${variant(method)}`}>{method}</span>
  );
}
