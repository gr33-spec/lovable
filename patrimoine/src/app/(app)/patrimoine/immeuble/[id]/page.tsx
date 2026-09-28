import { BuildingDetail } from "@/components/details/immeuble";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const { modifier } = await searchParams;
  // ?modifier=1 : ouvre directement la saisie (liens « à compléter »).
  return <BuildingDetail id={id} edit={modifier === "1"} />;
}
