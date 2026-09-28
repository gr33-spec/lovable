import { ProjectRealize } from "@/components/projects/realize";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectRealize id={id} />;
}
