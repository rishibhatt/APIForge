import AutoFixClient from "@/components/pages/AutoFix/AutoFixClient";

export default function AutoFixPage({
  params,
}: {
  params: { id: string };
}) {
  return <AutoFixClient id={params.id} />;
}
