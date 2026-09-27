import { ChangeTenantWizard } from "@/components/tenancy/change-wizard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChangeTenantWizard unitId={id} />;
}
