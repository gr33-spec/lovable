import { DomainError } from "../errors/domain-error.js";
import { currentRequestContext } from "../logging/request-context.js";

/**
 * LA DOUBLE AUTHENTIFICATION DE L'ADMIN (Greg, 26 octobre 2026 : « je dois être le seul à pouvoir entrer dans l'admin »).
 * Un code à 6 chiffres reçu par e-mail, lié à la session de connexion ; ouverte 2 heures au plus, fermée après 30 minutes
 * sans action. Toute route d'admin passe par ici, quel que soit son module (pilotage, commandes communes, corrections).
 */
export const VALIDITE_SESSION_ADMIN_MS = 2 * 3_600_000;
export const INACTIVITE_ADMIN_MS = 30 * 60_000;

interface CodesAdmin {
  codeAdmin: {
    findUnique(args: { where: { sessionId: string } }): Promise<{ userId: string; valideLe: Date | null; derniereActiviteLe: Date | null } | null>;
    update(args: { where: { sessionId: string }; data: { derniereActiviteLe: Date } }): Promise<unknown>;
  };
}

/** La session courante a-t-elle passé le code, depuis moins de 2 h, avec une action depuis moins de 30 min ? */
export async function deuxFacteursValides(prisma: CodesAdmin, userId: string, sessionId: string | undefined, maintenant = new Date(), noter = true): Promise<boolean> {
  if (!sessionId) return false;
  const c = await prisma.codeAdmin.findUnique({ where: { sessionId } });
  if (!c?.valideLe || c.userId !== userId) return false;
  const t = maintenant.getTime();
  if (t - c.valideLe.getTime() >= VALIDITE_SESSION_ADMIN_MS) return false;
  const derniere = (c.derniereActiviteLe ?? c.valideLe).getTime();
  if (t - derniere >= INACTIVITE_ADMIN_MS) return false;
  // L'activité se note au plus une fois par minute (pas une écriture par requête).
  if (noter && t - derniere > 60_000) await prisma.codeAdmin.update({ where: { sessionId }, data: { derniereActiviteLe: maintenant } });
  return true;
}

/** Pour les contrôleurs d'admin hors pilotage : la session de la requête en cours (posée par le garde de session). */
export async function exigerDeuxFacteurs(prisma: CodesAdmin, userId: string): Promise<void> {
  if (!(await deuxFacteursValides(prisma, userId, currentRequestContext()?.sessionId))) {
    throw new DomainError("forbidden", "Two-factor authentication required", { reason: "deux_facteurs_requis" });
  }
}
