import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/server/guard";
import { isConfigured } from "@/lib/server/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function ConnexionPage() {
  if (await isAuthenticated()) redirect("/");
  return <LoginForm configured={isConfigured()} />;
}
