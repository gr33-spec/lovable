import { ResetForm } from "@/components/admin/auth-forms";

export const metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetForm token={token.slice(0, 100)} />;
}
