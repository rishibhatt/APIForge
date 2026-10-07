import type { Metadata } from "next";
import { createBaseMetadata } from "@/lib/seo/metadata";
import AutoFixClient from "@/components/pages/AutoFix/AutoFixClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return createBaseMetadata({
    title: `Auto-Fix Preview: ${params.id}`,
    description: `Preview automated fixes for OpenAPI violations in ${params.id}: missing responses, parameters and schema issues, laid out for review before you apply.`,
    path: `/auto-fix/${params.id}`,
    ogLabel: "Report",
    noindex: true,
  });
}

export default function AutoFixPage({
  params,
}: {
  params: { id: string };
}) {
  return <AutoFixClient id={params.id} />;
}
