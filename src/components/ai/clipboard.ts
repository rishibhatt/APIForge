import { toast } from "@/components/providers/Toaster/toast";

/** Copy text; falls back to a hidden textarea when the async clipboard API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Copy and confirm with a toast. Returns whether it worked. */
export async function copyWithToast(text: string, label: string): Promise<boolean> {
  const ok = await copyText(text);
  if (ok) toast.success(`${label} copied`, { id: "ai-copy", duration: 2500 });
  else toast.error("Couldn't copy", { description: "Select the text and copy it manually.", id: "ai-copy" });
  return ok;
}

/** Save text as a file. Returns false when the browser blocks it. */
export function downloadText(filename: string, text: string, mime = "text/plain"): boolean {
  try {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
