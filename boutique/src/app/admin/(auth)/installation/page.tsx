import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/auth-forms";
import { adminExists } from "@/lib/server/auth";

export const metadata = { title: "Installation" };

export default async function SetupPage() {
  if (await adminExists()) redirect("/admin/connexion");
  return <SetupForm />;
}
