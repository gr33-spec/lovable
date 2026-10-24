import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * « NE PLUS RECEVOIR CES E-MAILS » (RGPD, opposition en un clic, 24 octobre 2026) : chaque e-mail de notification à
 * l'artisan porte un lien signé (HMAC du secret de l'application) qui coupe ces e-mails pour son entreprise, sans se
 * connecter. Les e-mails indispensables (compte, mot de passe, bons de commande) partent toujours.
 */
const signature = (secret: string, companyId: string) => createHmac("sha256", secret).update(`emails-stop:${companyId}`).digest("base64url").slice(0, 32);

export function jetonEmailsCoupes(secret: string, companyId: string): string {
  return `${Buffer.from(companyId).toString("base64url")}.${signature(secret, companyId)}`;
}

export function lireJetonEmailsCoupes(secret: string, jeton: string): string | null {
  if (typeof jeton !== "string" || jeton.length > 200) return null;
  const [corps, sig] = jeton.split(".");
  if (!corps || !sig) return null;
  const companyId = Buffer.from(corps, "base64url").toString();
  const attendue = Buffer.from(signature(secret, companyId));
  const recue = Buffer.from(sig);
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  return companyId;
}

export const lienEmailsCoupes = (webAppUrl: string, secret: string, companyId: string) => `${webAppUrl}/emails/stop/${jetonEmailsCoupes(secret, companyId)}`;
