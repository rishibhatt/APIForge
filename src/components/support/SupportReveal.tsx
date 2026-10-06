"use client";

import { useRef, type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/** Binds the shared scroll-reveal hook to a subtree of the server-rendered support page. */
export default function SupportReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
