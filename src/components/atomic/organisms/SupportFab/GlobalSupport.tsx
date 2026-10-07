"use client";

import dynamic from "next/dynamic";
import { useLanguage } from "@/hooks/useLanguage";
import SupportFab from "./SupportFab";

const SupportModal = dynamic(() => import("@/components/atomic/organisms/SupportModal/SupportModal"));

/** The one site-wide support entry point: floating button + the support modal it opens. */
export default function GlobalSupport() {
  const { t } = useLanguage();
  return (
    <>
      <SupportFab />
      <SupportModal t={t} />
    </>
  );
}
