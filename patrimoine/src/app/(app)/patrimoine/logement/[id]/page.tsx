import { LogementDetail } from "@/components/tenancy/logement";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LogementDetail id={id} />;
}
