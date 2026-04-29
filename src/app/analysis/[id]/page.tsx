import AnalysisDetailClient from "@/components/pages/AnalysisDetail/AnalysisDetailClient";

export default function AnalysisPage({
  params,
}: {
  params: { id: string };
}) {
  return <AnalysisDetailClient id={params.id} />;
}
