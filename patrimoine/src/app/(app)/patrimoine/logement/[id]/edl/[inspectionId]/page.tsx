import { InspectionEditor } from "@/components/tenancy/inspection-editor";

export default async function Page({ params }: { params: Promise<{ id: string; inspectionId: string }> }) {
  const { id, inspectionId } = await params;
  return <InspectionEditor unitId={id} inspectionId={inspectionId} />;
}
