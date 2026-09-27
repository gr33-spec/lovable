import { ScenarioDetail } from "@/components/details/scenario";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScenarioDetail id={id} />;
}
