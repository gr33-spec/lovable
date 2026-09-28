import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Identifiant de l'artisan connecté. Le proxy protège déjà les écrans de
 * l'app (§5) ; cette redirection est une seconde ligne de défense.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  return session.user.id;
}
