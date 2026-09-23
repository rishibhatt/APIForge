import type { Metadata } from "next";
import AutoFixClient from "@/components/pages/AutoFix/AutoFixClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return {
    title: `AI Auto-Fix & Schema Remediation — ${params.id}`,
    description: `Automated AI remediation of OpenAPI violations, missing responses, parameters, and schema bugs for ${params.id}.`,
    openGraph: {
      title: `AI Auto-Fix & Schema Remediation — ${params.id}`,
      description: `Automated AI remediation of OpenAPI violations, missing responses, parameters, and schema bugs for ${params.id}.`,
    },
  };
}

export default function AutoFixPage({
  params,
}: {
  params: { id: string };
}) {
  return <AutoFixClient id={params.id} />;
}
