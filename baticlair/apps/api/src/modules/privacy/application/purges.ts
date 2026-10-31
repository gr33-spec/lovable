import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { empreinteEmail, exclure } from "./exclusion.js";

/**
 * LES PURGES DU REGISTRE (RGPD, Greg, 24 octobre 2026), lancées chaque nuit par la tâche `purge-inactive` : chaque
 * durée de `docs/groupe/RGPD-REGISTRE.md` appliquée par le code, par paquets (une passe ne dépasse jamais la durée d'une
 * fonction). Les comptes artisans inactifs depuis 3 ans sont effacés à part (`AccountData.purgeInactive`).
 */
export const DUREES = {
  /** Comptes négoces sans connexion depuis 3 ans. */
  negoceInactifAns: 3,
  /** Négoces invités jamais inscrits : 3 rappels, puis un mois de délai ; ou 12 mois après l'invitation. */
  inviteMois: 12,
  /** Le fichier d'origine d'un devis client (le texte, anonymisé, reste) : 30 jours, le temps de le relire. */
  fichierDevisJours: 30,
  /** Les journaux techniques en base : 12 mois. */
  journauxMois: 12,
  /** Les commandes archivées sans nom : 10 ans. */
  archivesAns: 10,
  /** Les preuves d'acceptation : 5 ans après la fin du compte. */
  preuvesAns: 5,
} as const;

const PAQUET = 200;
const ilYa = (maintenant: Date, d: { ans?: number; mois?: number; jours?: number }) => {
  const x = new Date(maintenant);
  if (d.ans) x.setFullYear(x.getFullYear() - d.ans);
  if (d.mois) x.setMonth(x.getMonth() - d.mois);
  if (d.jours) x.setDate(x.getDate() - d.jours);
  return x;
};

/**
 * Supprimer un compte négoce (RGPD) : la preuve d'acceptation gardée 5 ans, le négoce mis sur la liste d'exclusion, ses
 * lignes arrêtées et leur e-mail effacé, le compte (dépôts, paliers) effacé. Les grilles et commandes restent sous l'enseigne.
 */
export async function supprimerCompteNegoce(prisma: PrismaService, compteId: string, maintenant: Date, source: "suppression_compte" | "opposition"): Promise<boolean> {
  const c = await prisma.compteNegoce.findUnique({ where: { id: compteId } });
  if (!c) return false;
  await exclure(prisma, { email: c.email, siret: c.siret }, source);
  await prisma.$transaction(async (tx) => {
    if (c.conditionsAccepteesLe && c.conditionsVersion) {
      await tx.preuveAcceptation.create({ data: { sorte: "conditions_negoce", version: c.conditionsVersion, accepteLe: c.conditionsAccepteesLe, email: empreinteEmail(c.email), finCompteLe: maintenant } });
    }
    const lignes = await tx.negoce.findMany({ where: { OR: [{ compteId }, { email: c.email }] }, select: { id: true } });
    for (const l of lignes) await tx.negoce.update({ where: { id: l.id }, data: { stopLe: maintenant, compteId: null, email: `efface-${l.id}@invalid.baticlair.fr` } });
    await tx.compteNegoce.delete({ where: { id: compteId } });
  });
  return true;
}

export interface BilanPurge {
  negocesInactifs: number;
  invitesEffaces: number;
  fichiersDevis: number;
  documentsAnciens: number;
  journaux: number;
  archives: number;
  preuves: number;
  reprises: number;
  evenementsWebhook: number;
}

export async function purgerSelonLeRegistre(prisma: PrismaService, maintenant = new Date()): Promise<BilanPurge> {
  // Négoces inscrits sans connexion depuis 3 ans : comme une suppression demandée.
  const inactifs = await prisma.compteNegoce.findMany({ where: { inscritLe: { not: null }, OR: [{ derniereConnexionLe: { lt: ilYa(maintenant, { ans: DUREES.negoceInactifAns }) } }, { derniereConnexionLe: null, inscritLe: { lt: ilYa(maintenant, { ans: DUREES.negoceInactifAns }) } }] }, select: { id: true }, take: PAQUET });
  for (const c of inactifs) await supprimerCompteNegoce(prisma, c.id, maintenant, "suppression_compte");

  // Négoces invités jamais inscrits : après 3 rappels (et un mois), ou 12 mois après l'invitation. Le compte (la trace de
  // la prospection) est effacé ; la ligne reste dans la liste de l'artisan qui l'a ajouté, arrêtée : plus aucun envoi.
  const invites = await prisma.compteNegoce.findMany({
    where: { inscritLe: null, OR: [{ rappels: { gte: 3 }, invitationLe: { lt: ilYa(maintenant, { jours: 30 }) } }, { createdAt: { lt: ilYa(maintenant, { mois: DUREES.inviteMois }) } }] },
    select: { id: true },
    take: PAQUET,
  });
  for (const c of invites) {
    await prisma.$transaction([prisma.negoce.updateMany({ where: { compteId: c.id }, data: { stopLe: maintenant, compteId: null } }), prisma.compteNegoce.delete({ where: { id: c.id } })]);
  }

  // Le fichier d'origine d'un devis client, après 30 jours : seul le texte anonymisé reste (RGPD, point 3).
  const fichiers = await prisma.documentBlob.deleteMany({ where: { document: { purpose: "client_quote", createdAt: { lt: ilYa(maintenant, { jours: DUREES.fichierDevisJours }) } } } });

  // Le texte anonymisé des devis et les e-mails reçus vivent autant que le compte (Greg, 26 octobre 2026 : « e-mails et
  // devis : durée du compte ») ; ils partent avec lui (suppression demandée, ou 3 ans sans connexion). Avant : 3 ans.

  // Journaux techniques en base : 12 mois.
  const limiteJournaux = ilYa(maintenant, { mois: DUREES.journauxMois });
  const j1 = await prisma.journalGroupe.deleteMany({ where: { createdAt: { lt: limiteJournaux } } });
  const j2 = await prisma.idempotencyRecord.deleteMany({ where: { createdAt: { lt: limiteJournaux } } });
  const j3 = await prisma.aiExecution.updateMany({ where: { createdAt: { lt: limiteJournaux }, userId: { not: null } }, data: { userId: null } });
  // Le journal du pilotage admin (24 octobre 2026) : 12 mois, comme les autres journaux.
  const j5 = await prisma.journalAdmin.deleteMany({ where: { createdAt: { lt: limiteJournaux } } });
  const j4 = await prisma.parametreGroupe.deleteMany({ where: { misAJourLe: { lt: limiteJournaux }, OR: ["ajouts:", "reponses:", "rappels-cloture:", "alerte:", "report:"].map((p) => ({ cle: { startsWith: p } })) } });

  // Les factures d'abonnement (obligation comptable) : 10 ans après leur émission.
  const factures = await prisma.factureAbonnement.deleteMany({ where: { emiseLe: { lt: ilYa(maintenant, { ans: DUREES.archivesAns }) } } });
  const archives = await prisma.archiveCommande.deleteMany({ where: { archiveLe: { lt: ilYa(maintenant, { ans: DUREES.archivesAns }) } } });
  // La file de reprise (30 jours après sa fin) et les événements de webhook déjà traités (90 jours), revue du 26 octobre.
  const reprises = await prisma.reprise.deleteMany({ where: { finiLe: { lt: ilYa(maintenant, { jours: 30 }) } } });
  const evenements = await prisma.evenementTraite.deleteMany({ where: { recuLe: { lt: ilYa(maintenant, { jours: 90 }) } } });
  const preuves = await prisma.preuveAcceptation.deleteMany({ where: { finCompteLe: { lt: ilYa(maintenant, { ans: DUREES.preuvesAns }) } } });

  return {
    negocesInactifs: inactifs.length,
    invitesEffaces: invites.length,
    fichiersDevis: fichiers.count,
    documentsAnciens: 0,
    reprises: reprises.count,
    evenementsWebhook: evenements.count,
    journaux: j1.count + j2.count + j3.count + j4.count + j5.count,
    archives: archives.count + factures.count,
    preuves: preuves.count,
  };
}
