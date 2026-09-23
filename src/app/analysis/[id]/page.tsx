import type { Metadata } from "next";
import AnalysisDetailClient from "@/components/pages/AnalysisDetail/AnalysisDetailClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return {
    title: `API Quality Audit & Analysis Report — ${params.id}`,
    description: `Deep automated OpenAPI quality assessment, security audit, and schema linting report for ${params.id}.`,
    openGraph: {
      title: `API Quality Audit & Analysis Report — ${params.id}`,
      description: `Deep automated OpenAPI quality assessment, security audit, and schema linting report for ${params.id}.`,
    },
  };
}

export default function AnalysisPage({
  params,
}: {
  params: { id: string };
}) {
  return <AnalysisDetailClient id={params.id} />;
}
