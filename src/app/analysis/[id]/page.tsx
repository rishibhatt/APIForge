import type { Metadata } from "next";
import { createBaseMetadata } from "@/lib/seo/metadata";
import AnalysisDetailClient from "@/components/pages/AnalysisDetail/AnalysisDetailClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return createBaseMetadata({
    title: `API Quality Analysis: ${params.id}`,
    description: `Automated OpenAPI quality analysis for ${params.id}: deterministic design-rule checks, schema linting and security findings, with suggested fixes.`,
    path: `/analysis/${params.id}`,
    ogLabel: "Report",
    noindex: true,
  });
}

export default function AnalysisPage({
  params,
}: {
  params: { id: string };
}) {
  return <AnalysisDetailClient id={params.id} />;
}
