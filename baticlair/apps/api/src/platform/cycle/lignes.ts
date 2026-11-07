import { etatLigne, LIBELLES_ETAT_LIGNE, PARTICIPATION_ACTIVE, peut, type ActionLigne, type EtatLigne, type FaitsLigne, type Verdict } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";
import { DomainError } from "../errors/domain-error.js";


type Refus = Extract<Verdict, { permis: false }>;
/**
 * LE CYCLE DE VIE CÔTÉ SERVEUR (Greg, 6 novembre 2026, prompt maître §7, §9, §19) : les faits de chaque ligne d'une liste
 * (demande partie, offre acceptée, recherche, achat groupé), lus en base, puis le verdict du domaine (`peut`). Partagé par
 * la demande individuelle, la classification, le rapprochement et l'achat groupé : une seule règle, partout.
 */
export interface FaitsServeur extends FaitsLigne {
  /** Les lignes d'achat groupé actives qui tiennent cette ligne de liste. */
  lignesGroupe: { id: string; besoinId: string }[];
}

type Prisma = Pick<PrismaService, "priceRequest" | "ligneRapprochement" | "ligneAchatGroupe" | "besoin">;

/** La commande du mois (ancien regroupement, table `besoin`) : ces statuts tiennent encore la ligne. */
const MOIS_ACTIF = ["en_attente", "signe", "engage", "commande", "livre"];
const MOIS_COMMANDE = ["commande", "livre"];

/** Les faits de chaque ligne du chantier ; une demande sans `itemKeys` vaut pour toute la liste (`toutes`). */
export async function faitsDesLignes(prisma: Prisma, companyId: string, projectId: string, maintenant = new Date()) {
  const [demandes, recherches, groupes, mois] = await Promise.all([
    prisma.priceRequest.findMany({
      where: { companyId, projectId },
      select: { itemKeys: true, retainedSupplierIds: true, recipients: { select: { sentAt: true, commandeLe: true } } },
    }),
    prisma.ligneRapprochement.findMany({ where: { companyId, projectId, statut: { in: ["disponible", "proposee"] } }, select: { articleKey: true } }),
    prisma.ligneAchatGroupe.findMany({
      where: { companyId, projectId, articleKey: { not: null }, besoin: { statut: { in: [...PARTICIPATION_ACTIVE] } } },
      select: { id: true, besoinId: true, articleKey: true, besoin: { select: { statut: true, regroupement: { select: { libelle: true, statut: true, clotureLe: true } } } } },
    }),
    prisma.besoin.findMany({ where: { companyId, projectId, statut: { in: MOIS_ACTIF } }, select: { articleKey: true, statut: true } }),
  ]);
  const envoyees = demandes.filter((d) => d.recipients.some((r) => r.sentAt));
  const commandees = demandes.filter((d) => d.retainedSupplierIds.length > 0 || d.recipients.some((r) => r.commandeLe));
  const couvre = (ds: typeof demandes, key: string) => ds.some((d) => d.itemKeys.length === 0 || d.itemKeys.includes(key));
  const enRecherche = new Set(recherches.map((r) => r.articleKey));
  const parCle = new Map<string, { groupe: FaitsLigne["groupe"]; lignes: { id: string; besoinId: string }[] }>();
  for (const g of groupes) {
    const key = g.articleKey!;
    const a = g.besoin.regroupement;
    const avantCloture = !!a && a.statut === "en_collecte" && !!a.clotureLe && a.clotureLe > maintenant;
    const cur = parCle.get(key) ?? { groupe: null, lignes: [] };
    // Une ligne commandée en groupe l'emporte ; sinon la première participation active.
    if (!cur.groupe || g.besoin.statut === "accepte") cur.groupe = { titre: a?.libelle ?? "Achat groupé", statut: g.besoin.statut, avantCloture };
    cur.lignes.push({ id: g.id, besoinId: g.besoinId });
    parCle.set(key, cur);
  }
  // La commande du mois : la ligne y est tenue jusqu'à son retrait dans « Commande du mois » (pas de retrait d'ici).
  for (const m of mois) {
    const cur = parCle.get(m.articleKey) ?? { groupe: null, lignes: [] };
    const commandee = MOIS_COMMANDE.includes(m.statut);
    if (!cur.groupe || commandee) cur.groupe = { titre: "Commande du mois", statut: commandee ? "accepte" : "declare", avantCloture: false };
    parCle.set(m.articleKey, cur);
  }
  return (key: string): FaitsServeur => ({
    demandeEnvoyee: couvre(envoyees, key),
    commandeeSeule: couvre(commandees, key),
    enRecherche: enRecherche.has(key),
    groupe: parCle.get(key)?.groupe ?? null,
    lignesGroupe: parCle.get(key)?.lignes ?? [],
  });
}

/** Refuse le geste d'après le domaine, avec la phrase et, s'il existe, le geste explicite qui débloque. */
export function exiger(f: FaitsLigne, action: ActionLigne, designation: string): void {
  const v = peut(f, action, designation);
  if (v.permis) return;
  // `Refus` explicite : la compilation de Vercel (mode non strict) ne rétrécit pas l'union sur `permis`.
  const r = v as Refus;
  throw new DomainError("conflict", "Line state forbids this action", { reason: r.raison, message: r.message, ...(r.deblocage ? { deblocage: r.deblocage } : {}) });
}

/**
 * Avant une COMMANDE SEULE (« Je retiens ce négoce », « Commander » d'une demande perso) : aucune ligne commandée en
 * groupe ; une ligne tenue par un achat groupé encore ouvert n'en sort que sur le geste explicite de l'artisan
 * (`retirerDesGroupes`), jamais en silence ; après la clôture, il faut d'abord sortir de l'achat groupé.
 * `keys` null = toute la liste.
 */
export async function gardeCommandeSeule(
  prisma: PrismaService,
  companyId: string,
  projectId: string,
  keys: string[] | null,
  options: { retirerDesGroupes?: boolean; designations?: Map<string, string> } = {},
  maintenant = new Date(),
): Promise<{ retirees: number }> {
  const faits = await faitsDesLignes(prisma, companyId, projectId, maintenant);
  const [groupes, mois] = await Promise.all([
    prisma.ligneAchatGroupe.findMany({
      where: { companyId, projectId, articleKey: { not: null }, besoin: { statut: { in: [...PARTICIPATION_ACTIVE] } } },
      select: { articleKey: true, designationOrigine: true },
    }),
    prisma.besoin.findMany({ where: { companyId, projectId, statut: { in: MOIS_ACTIF } }, select: { articleKey: true, designation: true } }),
  ]);
  const concernees = [...new Set([...groupes.map((g) => g.articleKey!), ...mois.map((m) => m.articleKey)])].filter((k) => keys === null || keys.includes(k));
  const nom = (k: string) => options.designations?.get(k) ?? groupes.find((g) => g.articleKey === k)?.designationOrigine ?? mois.find((m) => m.articleKey === k)?.designation ?? k;
  const bloquees: { key: string; designation: string; achat: string }[] = [];
  const aRetirer: { id: string; besoinId: string }[] = [];
  for (const key of concernees) {
    const f = faits(key);
    // La commande seule elle-même ne compte pas ici : seule la tenue par un achat groupé est vérifiée.
    const sansCommande = { ...f, commandeeSeule: false };
    const verdict = peut(sansCommande, "commander_seul", nom(key));
    if (verdict.permis) continue;
    const v = verdict as Refus;
    if (v.raison === "dans_un_groupe" && options.retirerDesGroupes) {
      aRetirer.push(...f.lignesGroupe);
      continue;
    }
    if (v.raison !== "dans_un_groupe") throw new DomainError("conflict", "Line already committed", { reason: v.raison, message: v.message });
    bloquees.push({ key, designation: nom(key), achat: f.groupe!.titre });
  }
  if (bloquees.length)
    throw new DomainError("conflict", "Lines held by a group purchase", {
      reason: "dans_un_groupe",
      deblocage: "retirer_du_groupe",
      lignes: bloquees,
      message:
        bloquees.length === 1
          ? `« ${bloquees[0]!.designation} » est dans l'achat groupé « ${bloquees[0]!.achat} ». Pour la commander ici, retire-la d'abord de l'achat groupé.`
          : `${bloquees.length} lignes sont dans un achat groupé (${bloquees.map((b) => `« ${b.designation} »`).join(", ")}). Pour les commander ici, retire-les d'abord de l'achat groupé.`,
    });
  if (aRetirer.length) await retirerLignesDesGroupes(prisma, aRetirer);
  return { retirees: aRetirer.length };
}

/** Retire des lignes de leurs participations (avant la clôture) ; une participation vidée est retirée, comme « Retirer ma liste ». */
async function retirerLignesDesGroupes(prisma: PrismaService, lignes: { id: string; besoinId: string }[]) {
  await prisma.$transaction(async (tx) => {
    await tx.ligneAchatGroupe.deleteMany({ where: { id: { in: lignes.map((l) => l.id) } } });
    for (const besoinId of [...new Set(lignes.map((l) => l.besoinId))]) {
      const reste = await tx.ligneAchatGroupe.count({ where: { besoinId } });
      const b = await tx.besoinNegocie.update({ where: { id: besoinId }, data: reste === 0 ? { statut: "retire", quantite: 0 } : { quantite: reste } });
      if (reste === 0 && b.regroupementId)
        await tx.desistementAchatGroupe.create({ data: { besoinId, companyId: b.companyId, regroupementId: b.regroupementId, quantite: 0, apresCloture: false, raison: "commande_seule" } });
    }
  });
}

/** L'état de chaque ligne d'un chantier, pour les écrans (Suivi, carte de recherche). */
export async function etatsDuChantier(prisma: PrismaService, companyId: string, projectId: string, lignes: { key: string; designation: string }[], maintenant = new Date()) {
  const faits = await faitsDesLignes(prisma, companyId, projectId, maintenant);
  return lignes.map((l) => {
    const f = faits(l.key);
    const etat: EtatLigne = etatLigne(f);
    const actions = (["envoyer_demande", "chercher", "rejoindre_groupe", "commander_seul"] as const).filter((a) => peut(f, a).permis);
    return { key: l.key, designation: l.designation, etat, libelle: LIBELLES_ETAT_LIGNE[etat], groupe: f.groupe ? { titre: f.groupe.titre, avantCloture: f.groupe.avantCloture } : null, actions };
  });
}
