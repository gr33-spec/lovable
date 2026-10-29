import { NOM_APP } from "./marque.js";
import { TARIFS } from "./tarifs.js";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message : « Feu vert, avec des changements importants ») : du code
 * pur. Un achat groupé = un métier + une zone + une période ; il contient un panier de lignes (chaque ligne : une référence
 * du catalogue confirmée par l'artisan, sa quantité). L'artisan s'engage ; le négoce répond ligne par ligne ; chaque
 * artisan est comparé sur SES lignes ; l'admin valide avant de publier ; puis Mobiiz s'efface.
 */

const JOUR = 86_400_000;
const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ")} €`;

/* ----------------------------------------------------------------------------------------- les réglages */

export const EXCLUSION_MOIS_DEFAUT = 3;
export const DELAI_VALIDATION_ADMIN_HEURES_DEFAUT = 24;
export const DELAI_COMMANDE_JOURS_DEFAUT = 5;
export const LECTURES_IA_GRATUIT_TOTAL_DEFAUT = 3;
export const RAPPEL_VALIDATION_HEURES = 12;

/* --------------------------------------------------------------------------- le métier et le titre (A1) */

/** Le libellé court du métier d'un achat groupé (une famille groupable). */
export const LIBELLES_METIER_ACHAT: Readonly<Record<string, string>> = { couverture: "Couverture", charpente: "Charpente", second_oeuvre: "Second œuvre" };
export const libelleMetier = (famille: string) => LIBELLES_METIER_ACHAT[famille] ?? famille.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** « Couverture · secteur Paimpol · livraison avant le 30 novembre » */
export function titreAchatGroupe(a: { famille: string; secteur: string; dateBesoin: Date }): string {
  return `${libelleMetier(a.famille)} · secteur ${a.secteur} · livraison avant le ${jourFr(a.dateBesoin)}`;
}

/**
 * Les dates (point 15) : clôture = date de besoin − livraison − réponse des négoces − validation admin ; échéance des
 * offres = clôture + réponse ; la publication suit la validation ; la commande se passe dans `delaiCommande` jours.
 */
export function datesAchatGroupePanier(dateBesoin: Date, o: { delaiLivraisonJours: number; delaiReponseJours: number; validationAdminHeures: number }): { clotureLe: Date; reponseAvantLe: Date } {
  const besoin = Date.UTC(dateBesoin.getUTCFullYear(), dateBesoin.getUTCMonth(), dateBesoin.getUTCDate(), 10, 0, 0);
  const clotureLe = new Date(besoin - (o.delaiLivraisonJours + o.delaiReponseJours) * JOUR - o.validationAdminHeures * 3_600_000);
  return { clotureLe, reponseAvantLe: new Date(clotureLe.getTime() + o.delaiReponseJours * JOUR) };
}
export const commandeAvantLe = (publieLe: Date, delaiCommandeJours = DELAI_COMMANDE_JOURS_DEFAUT) => new Date(publieLe.getTime() + delaiCommandeJours * JOUR);

/* ------------------------------------------------------------------------------- le panier (A2 à A4) */

export interface LignePanier {
  cle: string;
  libelle: string;
  famille: string;
  unite: string;
  quantite: number;
}

/** La liste propre envoyée au négoce : chaque référence, la quantité cumulée de tous les participants (volume engagé). */
export function cumulerPanier(lignes: readonly LignePanier[]): LignePanier[] {
  const parCle = new Map<string, LignePanier>();
  for (const l of lignes) {
    const k = `${l.cle}#${l.unite}`;
    const deja = parCle.get(k);
    if (deja) deja.quantite = Math.round((deja.quantite + l.quantite) * 1000) / 1000;
    else parCle.set(k, { ...l });
  }
  return [...parCle.values()].sort((a, b) => a.famille.localeCompare(b.famille) || a.libelle.localeCompare(b.libelle));
}

/**
 * L'orientation (point 5) : un négoce spécialiste ne reçoit que les lignes de ses familles déclarées ; un négoce sans
 * familles connues (tapé par l'artisan) ou généraliste reçoit tout le panier. Les négoces consultés sont toujours ceux
 * qu'un participant a choisis : un généraliste n'est jamais consulté sans qu'on l'ait choisi.
 */
export function lignesPourNegoce(panier: readonly LignePanier[], negoce: { generaliste: boolean; familles: readonly string[] | null }): LignePanier[] {
  if (negoce.generaliste || !negoce.familles || negoce.familles.length === 0) return [...panier];
  return panier.filter((l) => negoce.familles!.includes(l.famille));
}

/* -------------------------------------------------------------------------- l'engagement (B6 à B10) */

export const PHRASE_ENGAGEMENT = "Je commande ces quantités, chez le moins cher entre la meilleure offre du groupe et mon négoce habituel.";

/** Les règles dites en clair au moment de rejoindre (point 9), au-dessus de la case obligatoire. */
export const REGLES_ENGAGEMENT: readonly string[] = [
  "Tes quantités sont annoncées aux négoces : seul le volume engagé compte.",
  "À la publication, tu commandes chez le moins cher : la meilleure offre du groupe ou ton négoce habituel, tel qu'il a répondu. Il n'y a pas de deuxième tour.",
  "Deux sorties seulement, en un clic avec le motif : chantier annulé par ton client, ou aucune offre livrable dans les délais.",
  "Plus d'une sortie par trimestre, ou une commande pas passée sans motif : pas d'achat groupé pendant 3 mois.",
];

export const MOTIFS_SORTIE = ["chantier_annule", "aucune_offre_livrable"] as const;
export type MotifSortie = (typeof MOTIFS_SORTIE)[number];
export const LIBELLES_MOTIFS_SORTIE: Readonly<Record<MotifSortie, string>> = {
  chantier_annule: "Mon client a annulé le chantier",
  aucune_offre_livrable: "Aucune offre livrable dans les délais",
};

/**
 * L'exclusion (point 8) : plus d'une sortie sur 3 mois glissants, ou une commande pas passée sans motif, exclut des achats
 * groupés pendant `mois` mois, à compter du dernier manquement. Rend la date de fin, ou null.
 */
export function exclusionJusquau(manquements: { sorties: readonly Date[]; nonCommandesSansMotif: readonly Date[] }, mois = EXCLUSION_MOIS_DEFAUT): Date | null {
  const plus = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()));
  const fins: Date[] = manquements.nonCommandesSansMotif.map(plus);
  const sorties = [...manquements.sorties].sort((a, b) => a.getTime() - b.getTime());
  for (let i = 1; i < sorties.length; i++) if (sorties[i]!.getTime() - sorties[i - 1]!.getTime() <= 92 * JOUR) fins.push(plus(sorties[i]!));
  return fins.length ? new Date(Math.max(...fins.map((d) => d.getTime()))) : null;
}
export const exclu = (fin: Date | null, maintenant: Date) => !!fin && fin.getTime() > maintenant.getTime();
export const phraseExclusion = (fin: Date) => `Tu ne peux pas rejoindre d'achat groupé avant le ${jourFr(fin)} (règle des sorties).`;

/* -------------------------------------------------------------------- la réponse du négoce (C11, C12) */

/** Une ligne de la réponse : un prix unitaire HT livré, ou « je ne fournis pas » (null). Rien ne manque en silence. */
export type ReponseLignes = Readonly<Record<string, number | null>>;

/** La réponse est-elle complète : chaque ligne a un prix ou « je ne fournis pas » ? (le lien ne laisse rien en blanc) */
export const reponseComplete = (lignes: readonly { cle: string }[], r: ReponseLignes) => lignes.every((l) => l.cle in r && (r[l.cle] === null || (typeof r[l.cle] === "number" && r[l.cle]! > 0)));

export const CONDITIONS_OUVERTURE = ["kbis", "rib", "piece_identite", "decennale"] as const;
export type ConditionOuverture = (typeof CONDITIONS_OUVERTURE)[number];
export const LIBELLES_CONDITIONS_OUVERTURE: Readonly<Record<ConditionOuverture, string>> = {
  kbis: "Kbis de moins de 3 mois",
  rib: "RIB",
  piece_identite: "Pièce d'identité du gérant",
  decennale: "Attestation décennale",
};
export const PAIEMENTS_DEPART = ["comptant", "30_jours_apres_etude"] as const;
export type PaiementDepart = (typeof PAIEMENTS_DEPART)[number];
export const LIBELLES_PAIEMENTS_DEPART: Readonly<Record<PaiementDepart, string>> = { comptant: "Paiement comptant au départ", "30_jours_apres_etude": "30 jours après étude du dossier" };

export interface ConditionsOuverture {
  pieces: readonly ConditionOuverture[];
  paiement: PaiementDepart | null;
  autre: string | null;
}
/** « Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB… » (point 19). */
export function phraseOuvertureCompte(c: ConditionsOuverture | null): string {
  if (!c) return "Pour commander, ouvre un compte chez ce négoce.";
  const morceaux = [...c.pieces.map((p) => LIBELLES_CONDITIONS_OUVERTURE[p]), ...(c.paiement ? [LIBELLES_PAIEMENTS_DEPART[c.paiement]] : []), ...(c.autre?.trim() ? [c.autre.trim()] : [])];
  return morceaux.length ? `Pour commander, ouvre un compte : ${morceaux.join(", ")}.` : "Pour commander, ouvre un compte chez ce négoce.";
}

/* --------------------------------------------------------------- la comparaison par artisan (D13, E17) */

export interface OffreNegocePanier {
  id: string;
  nom: string;
  prix: ReponseLignes;
  /** Écartée par l'admin : jamais comparée. */
  ecartee?: boolean;
}

export interface OffrePourArtisan {
  id: string;
  nom: string;
  totalHt: number;
  manquantes: number;
  complete: boolean;
}

/**
 * Chaque artisan est comparé sur SES lignes, livraison comprise (le prix est livré) : total chez chaque négoce ; les offres
 * complètes passent devant, puis la moins chère. Une ligne sans prix compte « non chiffrée ».
 */
export function comparerPourArtisan(mesLignes: readonly { cle: string; quantite: number }[], offres: readonly OffreNegocePanier[]): OffrePourArtisan[] {
  return offres
    .filter((o) => !o.ecartee)
    .map((o) => {
      let total = 0;
      let manquantes = 0;
      for (const l of mesLignes) {
        const p = o.prix[l.cle];
        if (typeof p === "number" && p > 0) total += p * l.quantite;
        else manquantes++;
      }
      return { id: o.id, nom: o.nom, totalHt: Math.round(total * 100) / 100, manquantes, complete: manquantes === 0 };
    })
    .filter((o) => o.manquantes < mesLignes.length)
    .sort((a, b) => Number(b.complete) - Number(a.complete) || a.manquantes - b.manquantes || a.totalHt - b.totalHt);
}

export const phraseManquantes = (n: number) => (n <= 0 ? null : `${n} ligne${n > 1 ? "s" : ""} non chiffrée${n > 1 ? "s" : ""} chez ce négoce`);

/** « Ta liste chez le meilleur négoce : 1 980,00 € au lieu de 2 160,00 €, livraison comprise. » (point 17) */
export function phrasePublication(meilleureHt: number, monNegoceHt: number | null): string {
  return monNegoceHt !== null && monNegoceHt > meilleureHt
    ? `Ta liste chez le meilleur négoce : ${euros(meilleureHt)} HT au lieu de ${euros(monNegoceHt)} HT, livraison comprise.`
    : `Ta liste chez le meilleur négoce : ${euros(meilleureHt)} HT, livraison comprise.`;
}

/* ------------------------------------------------------------------------ alertes et suggestion (F) */

/** L'alerte de zone par métier (point 21), mot pour mot. */
export function phraseAlerteMetier(a: { famille: string; dateBesoin: Date; clotureLe: Date }): string {
  return `Achat groupé ${libelleMetier(a.famille).toLowerCase()} ouvert dans ton secteur, livraison avant le ${jourFr(a.dateBesoin)}. Ajoute ta liste avant le ${jourFr(a.clotureLe)}.`;
}

/** La suggestion (point 22) : une ligne au-delà du seuil de sa famille (quantité, dans l'unité de la ligne). */
export const SEUIL_SUGGESTION_DEFAUT: Readonly<Record<string, number>> = { couverture: 300, charpente: 100, second_oeuvre: 30 };
export function lignesASuggerer<T extends { famille: string | null; quantite: number }>(lignes: readonly T[], seuils: Readonly<Record<string, number>> = SEUIL_SUGGESTION_DEFAUT): T[] {
  return lignes.filter((l) => l.famille && seuils[l.famille] !== undefined && l.quantite >= seuils[l.famille]!);
}
export function phraseSuggestion(l: { quantite: string; libelle: string }): string {
  return `Tu as ${l.quantite} de ${l.libelle.replace(/^[A-ZÀ-Ý]/, (c) => c.toLowerCase())}, mets-les en achat groupé pour payer moins cher.`;
}

/* ---------------------------------------------------------------------- l'accès gratuit / payant (G) */

export const PHRASE_PREMIER_OFFERT = "Ton premier achat groupé est offert.";
export const PHRASE_ABONNEMENT_ACHAT = "Pour rejoindre d'autres achats groupés, abonne-toi.";
// Greg, 29 octobre 2026 (« pas clair ») : la phrase dit ce qui reste gratuit (`TARIFS`, tarifs.ts).
export const PHRASE_LECTURES_EPUISEES = TARIFS.paywallListes;

/** S'engager dans un achat groupé : abonné, ou le tout premier (offert). */
export function droitAchatGroupe(a: { abonne: boolean; engagementsPasses: number }): { ok: boolean; offert: boolean; phrase: string | null } {
  if (a.abonne) return { ok: true, offert: false, phrase: null };
  if (a.engagementsPasses === 0) return { ok: true, offert: true, phrase: PHRASE_PREMIER_OFFERT };
  return { ok: false, offert: false, phrase: PHRASE_ABONNEMENT_ACHAT };
}

/** Les lectures IA (photo ou devis) offertes : un total, pas par mois. */
export const lecturesRestantes = (faites: number, total = LECTURES_IA_GRATUIT_TOTAL_DEFAUT) => Math.max(0, total - faites);

/* ------------------------------------------------------------------- la demande au négoce (A4, G27) */

export interface DemandeNegocePanier {
  clients: readonly string[];
  metier: string;
  lignes: readonly LignePanier[];
  livraisons: readonly { commune: string; date: Date }[];
  reponseAvantLe: Date;
  lien: string;
  commissionPct: number;
}

/** La demande : une liste propre (quantités cumulées), les lieux et dates, les règles ; la commission seulement si > 0. */
export function demandeNegocePanier(d: DemandeNegocePanier): { objet: string; texte: string } {
  const noms = [...new Set(d.clients.map((c) => c.trim()).filter(Boolean))];
  const liste = noms.length <= 1 ? (noms[0] ?? "") : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
  const dePart = noms.length <= 1 ? `De la part de votre client ${liste}, via ${NOM_APP}` : `De la part de vos clients ${liste}, via ${NOM_APP}`;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/ /g, " ");
  const objet = `Demande de prix groupée ${libelleMetier(d.metier).toLowerCase()} : ${d.lignes.length} référence${d.lignes.length > 1 ? "s" : ""} (réponse avant le ${jourFr(d.reponseAvantLe)})`;
  const texte = [
    "Bonjour,",
    "",
    `${dePart}.`,
    "",
    `Achat groupé ${libelleMetier(d.metier).toLowerCase()}, quantités cumulées et engagées :`,
    ...d.lignes.map((l) => `- ${l.libelle} : ${fmt(l.quantite)} ${l.unite}`),
    "",
    "Livraisons :",
    ...d.livraisons.map((l) => `- ${l.commune}, avant le ${jourFr(l.date)}`),
    "",
    "À savoir avant de répondre :",
    "- Vous n'êtes pas le seul négoce consulté.",
    "- Une seule offre, sans deuxième tour : faites votre meilleur prix.",
    "- Répondez ligne par ligne : un prix unitaire HT livraison comprise, ou « je ne fournis pas ».",
    "- Votre offre est ferme sur le volume engagé jusqu'à la date de commande.",
    "- Le bon de commande vous arrive directement ; le client vous paie sur son compte habituel.",
    ...(d.commissionPct > 0 ? [`- Une commission ${NOM_APP} de ${String(d.commissionPct).replace(".", ",")} % s'applique aux commandes passées (conditions à accepter avant de répondre).`] : []),
    "",
    `Répondre avant le ${jourFr(d.reponseAvantLe)}, sans inscription : ${d.lien}`,
    "",
    NOM_APP,
  ].join("\n");
  return { objet, texte };
}
