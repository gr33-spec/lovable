import "server-only";
import { prisma } from "@/lib/db";

/**
 * Compte de démonstration utilisé en attendant la connexion par magic link
 * (étape 5). Toute la persistance passe déjà par cette fonction : il suffira
 * de la remplacer par la session Auth.js sans toucher au reste du code.
 */
const DEMO_USER_EMAIL = "demo@baticlair.fr";

export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL },
  });
  return user.id;
}
