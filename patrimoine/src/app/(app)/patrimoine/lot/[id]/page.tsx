import { LotSheet } from "@/components/details/lot";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LotSheet id={id} />;
}
