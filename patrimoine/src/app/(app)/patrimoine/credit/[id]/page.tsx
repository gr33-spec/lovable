import { LoanDetail } from "@/components/details/credit";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetail id={id} />;
}
