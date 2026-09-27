import { StatementDetail } from "@/components/statement-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StatementDetail id={id} />;
}
