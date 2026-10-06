/**
 * Tiny toast store. No dependency, no React context: call `toast.error(...)` from anywhere
 * (components, hooks, event handlers). `<Toaster />` (mounted once in the root layout) renders them.
 */

export type ToastKind = "error" | "success" | "info" | "warning";

export interface ToastAction {
  label: string;
  /** Internal path or absolute URL. Rendered as a link. */
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  /** Second line: what to do next. Keep it short and concrete. */
  description?: string;
  action?: ToastAction;
  /** ms before auto-dismiss. 0 keeps it until dismissed. Defaults: error 7000, warning 7000, others 4500. */
  duration?: number;
  /** Same id replaces the existing toast instead of stacking (use for repeated errors). */
  id?: string;
}

export interface ToastItem extends Required<Pick<ToastOptions, "id">> {
  kind: ToastKind;
  title: string;
  description?: string;
  action?: ToastAction;
  duration: number;
  createdAt: number;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<Listener>();

const MAX_VISIBLE = 3;

function emit() {
  for (const l of Array.from(listeners)) l(items);
}

function defaultDuration(kind: ToastKind): number {
  return kind === "error" || kind === "warning" ? 7000 : 4500;
}

function push(kind: ToastKind, title: string, options: ToastOptions = {}): string {
  const id = options.id ?? `t${++counter}`;
  const item: ToastItem = {
    id,
    kind,
    title,
    description: options.description,
    action: options.action,
    duration: options.duration ?? defaultDuration(kind),
    createdAt: Date.now(),
  };
  const existing = items.findIndex((t) => t.id === id);
  items =
    existing >= 0
      ? items.map((t, i) => (i === existing ? item : t))
      : [...items, item].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export const toast = {
  error: (title: string, options?: ToastOptions) => push("error", title, options),
  warning: (title: string, options?: ToastOptions) => push("warning", title, options),
  success: (title: string, options?: ToastOptions) => push("success", title, options),
  info: (title: string, options?: ToastOptions) => push("info", title, options),
  dismiss(id: string) {
    items = items.filter((t) => t.id !== id);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
};

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}
