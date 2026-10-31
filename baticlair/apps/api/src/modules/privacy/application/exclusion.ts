import { createHash } from "node:crypto";
import type { PrismaService } from "../../../platform/database/prisma.service.js";

/**
 * LA LISTE D'EXCLUSION (RGPD, droit d'opposition, Greg, 24 octobre 2026) : un négoce, ou toute personne, qui a demandé à
 * ne plus jamais être contacté. Gardée hachée (SHA-256) : on reconnaît l'e-mail ou le SIRET quand un artisan le rajoute,
 * sans pouvoir le relire. Toutes les invitations la respectent (`EspaceNegoceService.inviter`).
 */
type Client = Pick<PrismaService, "exclusionContact">;

const normaliser = (sorte: "email" | "siret", valeur: string) => (sorte === "email" ? valeur.trim().toLowerCase() : valeur.replace(/\s+/g, ""));

/** L'empreinte d'un e-mail ou d'un SIRET : la seule forme gardée. */
export const empreinteContact = (sorte: "email" | "siret", valeur: string) => createHash("sha256").update(`${sorte}:${normaliser(sorte, valeur)}`).digest("hex");

/** L'e-mail haché, pour une preuve d'acceptation. */
export const empreinteEmail = (email: string) => empreinteContact("email", email);

export async function estExclu(prisma: Client, c: { email?: string | null; siret?: string | null }): Promise<boolean> {
  const cles = [...(c.email ? [{ sorte: "email", empreinte: empreinteContact("email", c.email) }] : []), ...(c.siret ? [{ sorte: "siret", empreinte: empreinteContact("siret", c.siret) }] : [])];
  if (cles.length === 0) return false;
  return (await prisma.exclusionContact.count({ where: { OR: cles } })) > 0;
}

export async function exclure(prisma: Client, c: { email?: string | null; siret?: string | null }, source: "opposition" | "suppression_compte"): Promise<void> {
  for (const [sorte, valeur] of [["email", c.email], ["siret", c.siret]] as const) {
    if (!valeur) continue;
    const empreinte = empreinteContact(sorte, valeur);
    await prisma.exclusionContact.upsert({ where: { sorte_empreinte: { sorte, empreinte } }, create: { sorte, empreinte, source }, update: {} });
  }
}
