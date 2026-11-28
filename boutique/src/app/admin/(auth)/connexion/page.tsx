import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/auth-forms";
import { adminExists, currentAdmin } from "@/lib/server/auth";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  if (!(await adminExists())) redirect("/admin/installation");
  return <LoginForm />;
}
