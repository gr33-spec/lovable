import { de } from "../shared/elision.js";
import { NOM_APP } from "./marque.js";
import { referenceStricte, type ReferenceStricte } from "./reference-stricte.js";
import { SEUIL_ANONYMAT_DEFAUT, SEUIL_VOLUME_MIN_DEFAUT } from "./regroupements.js";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026 : « l'achat groupé devient le cœur de l'app, en automatique ») :
 * du code pur, sans base ni IA. Un achat groupé = une référence stricte, un département, une date de besoin ; les
 * participants y ajoutent leur quantité et leurs négoces ; à la clôture, chaque négoce reçoit UNE demande, de la part de
 * ses propres clients ; à l'échéance, le code compare les offres sur une base identique.
 */

const JOUR = 86_400_000;

/** Les réglages par défaut (variables d'environnement du même nom). */
export const DELAI_REPONSE_NEGOCE_JOURS_DEFAUT = 3;
export const ALERTES_ACHATS_GROUPES_JOUR_DEFAUT = 2;
/** Au-delà, un compte qui rejoint sans jamais commander est signalé à l'admin (anti-fraude, point 9). */
export const PARTICIPATIONS_SANS_COMMANDE_MAX = 3;
/** L'admin voit les achats groupés sans aucune réponse 48 h après l'envoi aux négoces (plan B, point 7). */
export const SANS_REPONSE_HEURES = 48;

/* ------------------------------------------------------------------------------------------------ les dates */

const midiUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0, 0));

/**
 * Clôture des inscriptions = date de besoin − délai de livraison − délai de réponse des négoces, à midi (heure de Paris
 * en hiver). L'échéance des offres = clôture + délai de réponse. Au-delà de l'échéance, le négoce livre en `delaiLivraison`.
 */
export function datesAchatGroupe(dateBesoin: Date, delaiLivraisonJours: number, delaiReponseJours = DELAI_REPONSE_NEGOCE_JOURS_DEFAUT): { clotureLe: Date; reponseAvantLe: Date } {
  const besoin = midiUtc(dateBesoin).getTime();
  const clotureLe = new Date(besoin - (delaiLivraisonJours + delaiReponseJours) * JOUR);
  return { clotureLe, reponseAvantLe: new Date(clotureLe.getTime() + delaiReponseJours * JOUR) };
}

/** Une date de besoin trop proche (clôture déjà passée) ne peut pas lancer d'achat groupé : il reste la demande perso. */
export const dateBesoinPossible = (dateBesoin: Date, maintenant: Date, delaiLivraisonJours: number, delaiReponseJours = DELAI_REPONSE_NEGOCE_JOURS_DEFAUT) =>
  datesAchatGroupe(dateBesoin, delaiLivraisonJours, delaiReponseJours).clotureLe.getTime() > maintenant.getTime();

export const PHRASE_DATE_TROP_PROCHE = "Ta date de besoin est trop proche pour un achat groupé : les négoces n'auraient pas le temps de répondre et de livrer. Envoie plutôt ta demande à tes négoces.";
export const PHRASE_NEGOCE_OBLIGATOIRE = "Ajoute au moins un négoce à qui envoyer la demande.";

/* ----------------------------------------------------------------------------------- le catalogue (point 1) */

export interface EntreeCatalogue {
  /** La désignation complète, lue par la référence stricte (elle doit donner une clé). */
  designation: string;
  unite: string;
  /** Mots de recherche en plus de la désignation. */
  mots: string;
}

/**
 * Les références les plus commandées, pour lancer un achat groupé sans rien taper de précis. Chaque désignation passe la
 * référence stricte (test permanent) : le catalogue ne propose jamais une ligne qui ne se regroupe pas. Une référence
 * absente se tape (« Ardoise 40×24 Espagne 1er choix ») et passe par la même règle.
 */
export const CATALOGUE_ACHATS_GROUPES: readonly EntreeCatalogue[] = [
  { designation: "Ardoise naturelle 32×22 Espagne 1er choix", unite: "pièces", mots: "ardoise couverture" },
  { designation: "Ardoise naturelle 40×22 Espagne 1er choix", unite: "pièces", mots: "ardoise couverture" },
  { designation: "Ardoise naturelle 40×25 Espagne 1er choix", unite: "pièces", mots: "ardoise couverture" },
  { designation: "Ardoise naturelle 30×20 Espagne 1er choix", unite: "pièces", mots: "ardoise couverture" },
  { designation: "Ardoise naturelle 32×22 Angers 1er choix", unite: "pièces", mots: "ardoise couverture france trelaze" },
  { designation: "Ardoise fibres-ciment 60×30", unite: "pièces", mots: "ardoise synthetique couverture" },
  { designation: "Zinc naturel 0,65 mm", unite: "m²", mots: "zinc feuille bobine couverture" },
  { designation: "Zinc prépatiné quartz 0,65 mm", unite: "m²", mots: "zinc quartz anthra couverture" },
  { designation: "Zinc naturel 0,80 mm", unite: "m²", mots: "zinc feuille bobine couverture" },
  { designation: "Liteaux 27×38", unite: "m", mots: "liteau bois couverture" },
  { designation: "Liteaux 25×38", unite: "m", mots: "liteau bois couverture" },
  { designation: "Voliges 18×100", unite: "m²", mots: "volige bois couverture" },
  { designation: "Chevrons 63×75", unite: "m", mots: "chevron bois charpente" },
  { designation: "Chevrons 75×100", unite: "m", mots: "chevron bois charpente" },
  { designation: "Bastaings 63×175", unite: "m", mots: "bastaing bois charpente" },
  { designation: "OSB 3 12 mm 2500×1250", unite: "pièces", mots: "panneau osb charpente" },
  { designation: "OSB 3 18 mm 2500×1250", unite: "pièces", mots: "panneau osb plancher" },
  { designation: "Laine de verre 100 mm", unite: "m²", mots: "isolant isolation laine" },
  { designation: "Laine de verre 200 mm", unite: "m²", mots: "isolant isolation laine combles" },
  { designation: "Laine de roche 100 mm", unite: "m²", mots: "isolant isolation laine" },
  { designation: "Plaque de plâtre BA13 2500×1200", unite: "pièces", mots: "placo plaque platre cloison" },
  { designation: "Peinture blanc mat 15 L", unite: "pots", mots: "peinture blanc mat pot" },
  { designation: "Peinture blanc satin 15 L", unite: "pots", mots: "peinture blanc satin pot" },
  { designation: "Sous-couche 15 L", unite: "pots", mots: "sous couche impression peinture" },
];

const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[×*]/g, "x");

/** La recherche dans le catalogue : tous les mots tapés doivent se trouver dans la désignation ou ses mots-clés. */
export function rechercherCatalogue(q: string, max = 12): EntreeCatalogue[] {
  const mots = plat(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return CATALOGUE_ACHATS_GROUPES.slice(0, max);
  return CATALOGUE_ACHATS_GROUPES.filter((e) => {
    const t = plat(`${e.designation} ${e.mots}`);
    return mots.every((m) => t.includes(m));
  }).slice(0, max);
}

/* ------------------------------------------------- le rattachement d'une ligne de liste (précision 2) */

const ARTICLE: Readonly<Record<string, string>> = {
  ardoise: "de l'",
  "ardoise-fibres-ciment": "de l'",
  zinc: "du ",
  "ecran-sous-toiture": "de l'",
  liteau: "des ",
  volige: "des ",
  "bois-charpente": "du ",
  osb: "de l'",
  isolant: "de l'",
  "sous-couche": "de la ",
  peinture: "de la ",
  "plaque-platre": "de la ",
};

/** La question posée sur une ligne de liste avant qu'elle puisse rejoindre un achat groupé : « C'est bien de l'ardoise 32×22 ? » */
export function questionRattachement(ref: Pick<ReferenceStricte, "type" | "libelle">): string {
  const libelle = ref.libelle.replace(/^[A-ZÀ-Ý]/, (c) => c.toLowerCase()).replace(/^osb/, "OSB");
  return `C'est bien ${ARTICLE[ref.type] ?? "de "}${libelle} ?`;
}

/**
 * Le rattachement proposé pour une ligne de liste : la référence du catalogue (ou lue par la règle stricte) et la question.
 * Sans référence, la ligne reste en demande perso. La confirmation de l'artisan fait foi ; elle se garde avec la ligne.
 */
export function rattachementPropose(designation: string): { cle: string; libelle: string; famille: string; question: string } | null {
  const r = referenceStricte(designation);
  if (!r.ok) return null;
  return { cle: r.reference.cle, libelle: r.reference.libelle, famille: r.reference.famille, question: questionRattachement(r.reference) };
}

/* -------------------------------------------------------------------------------------- le volume (précision 3) */

/** Le volume minimum d'une famille en € HT estimés (réglage par famille ; valeurs du 25 octobre 2026 par défaut). */
export const volumeMinimum = (famille: string, seuils: Readonly<Partial<Record<string, number>>> = SEUIL_VOLUME_MIN_DEFAUT): number => seuils[famille] ?? 0;

export interface JaugeVolume {
  /** La jauge, par quart (0, 25, 50, 75, 100) : elle ne révèle pas le total. */
  pourcent: 0 | 25 | 50 | 75 | 100;
  atteint: boolean;
  /** « Il faut encore environ 1 200 € HT pour lancer la consultation », seulement à partir du seuil d'anonymat. */
  phrase: string | null;
}

/**
 * La jauge du volume : sans estimation (aucun prix repère), pas de jauge. Le reste à atteindre n'est dit qu'à partir du
 * seuil d'anonymat, arrondi à la centaine : en dessous, la jauge seule (Greg, 27 octobre 2026, précision 3).
 */
export function jaugeVolume(estimeHt: number | null, minimumHt: number, entreprises: number, seuilAnonymat = SEUIL_ANONYMAT_DEFAUT): JaugeVolume | null {
  if (estimeHt === null || minimumHt <= 0) return null;
  const ratio = Math.min(1, estimeHt / minimumHt);
  const pourcent = (Math.floor(ratio * 4) * 25) as JaugeVolume["pourcent"];
  const atteint = estimeHt >= minimumHt;
  const reste = Math.max(100, Math.ceil((minimumHt - estimeHt) / 100) * 100);
  const phrase = atteint ? "Volume suffisant pour lancer la consultation." : entreprises >= seuilAnonymat ? `Il faut encore environ ${reste.toLocaleString("fr-FR").replace(/ /g, " ")} € HT pour lancer la consultation.` : null;
  return { pourcent, atteint, phrase };
}

/* ------------------------------------------------------------------------------- la carte (point 8) */

export const ETATS_ACHAT_GROUPE = ["seul", "regroupe", "regroupe_total", "consultation", "validation", "offre", "pas_assez", "commande", "desiste", "sorti", "non_commande", "retire"] as const;
export type EtatAchatGroupe = (typeof ETATS_ACHAT_GROUPE)[number];

export interface EtatCarte {
  etat: EtatAchatGroupe;
  /** La phrase de l'état, en clair (une seule à la fois). */
  titre: string;
  /** La date clé affichée. */
  dateCle: string | null;
  /** « On te prévient dès qu'il y a du nouveau. » tant que rien n'est à faire. */
  sousTitre: string | null;
}

const jourFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(d);
const PREVIENT = "On te prévient dès qu'il y a du nouveau.";

/**
 * L'état d'une participation, tel que l'artisan le lit : jamais un nom, jamais une commune ; le nombre d'entreprises sans
 * chiffre sous le seuil ; le total seulement à partir du seuil d'anonymat.
 */
export function etatCarte(
  a: { statut: string; clotureLe: Date | null; reponseAvantLe: Date | null; entreprises: number; total: string | null },
  b: { statut: string },
  seuilAnonymat = SEUIL_ANONYMAT_DEFAUT,
): EtatCarte {
  if (b.statut === "retire") return { etat: "retire", titre: "Tu t'es retiré de cet achat groupé", dateCle: null, sousTitre: null };
  if (b.statut === "desiste") return { etat: "desiste", titre: "Tu t'es désisté de cet achat groupé", dateCle: null, sousTitre: null };
  if (b.statut === "sorti") return { etat: "sorti", titre: "Tu es sorti de cet achat groupé", dateCle: null, sousTitre: null };
  if (b.statut === "non_commande") return { etat: "non_commande", titre: "Commande pas passée à temps", dateCle: null, sousTitre: null };
  if (b.statut === "accepte") return { etat: "commande", titre: "Commandé", dateCle: null, sousTitre: "Ton bon de commande est parti chez le négoce." };
  if (a.statut === "pas_assez") return { etat: "pas_assez", titre: "Pas assez de volume cette fois", dateCle: null, sousTitre: "Envoie ta demande à tes négoces en un clic : rien n'est perdu." };
  if (a.statut === "offre_recue" || a.statut === "publie") return { etat: "offre", titre: "Offre reçue", dateCle: null, sousTitre: "Compare et commande si ça te va." };
  // Achat groupé par métier (27 octobre 2026) : à l'échéance, l'admin vérifie les offres avant de les publier.
  if (a.statut === "validation") return { etat: "validation", titre: "Offres reçues, vérification en cours", dateCle: null, sousTitre: PREVIENT };
  if (a.statut === "consultation")
    return { etat: "consultation", titre: `Négoces consultés, réponse le ${a.reponseAvantLe ? jourFr(a.reponseAvantLe) : "bientôt"}`, dateCle: a.reponseAvantLe ? jourFr(a.reponseAvantLe) : null, sousTitre: PREVIENT };
  const cloture = a.clotureLe ? jourFr(a.clotureLe) : null;
  if (a.entreprises <= 1) return { etat: "seul", titre: `Seul jusqu'au ${cloture ?? "…"}`, dateCle: cloture, sousTitre: PREVIENT };
  if (a.entreprises >= seuilAnonymat && a.total) return { etat: "regroupe_total", titre: `Regroupé ${seuilAnonymat}+ : ${a.total}`, dateCle: cloture, sousTitre: PREVIENT };
  return { etat: "regroupe", titre: "Regroupé avec d'autres entreprises", dateCle: cloture, sousTitre: PREVIENT };
}

/** Les étapes de la frise du détail. */
export const ETAPES_ACHAT_GROUPE = ["Inscriptions", "Négoces consultés", "Offres", "Commande"] as const;
export function etapeCourante(statutAchat: string, statutBesoin: string): number {
  if (statutBesoin === "accepte") return 3;
  if (statutAchat === "offre_recue" || statutAchat === "validation" || statutAchat === "publie") return 2;
  if (statutAchat === "consultation") return 1;
  return 0;
}

/* -------------------------------------------------------------------------------------- les alertes (point 2) */

export const REGLAGES_ALERTES = ["toutes", "resume", "aucune"] as const;
export type ReglageAlertes = (typeof REGLAGES_ALERTES)[number];
export const LIBELLES_REGLAGES_ALERTES: Readonly<Record<ReglageAlertes, string>> = {
  toutes: "Toutes les alertes",
  resume: "Un résumé par jour",
  aucune: "Aucune",
};
export const lireReglageAlertes = (v: unknown): ReglageAlertes => (REGLAGES_ALERTES.includes(v as ReglageAlertes) ? (v as ReglageAlertes) : "toutes");

/** La phrase de l'alerte (mot pour mot, Greg, 27 octobre 2026). */
export function phraseAlerte(a: { libelle: string; dateBesoin: Date; zone: string; clotureLe: Date }): string {
  return `Nouvel achat groupé : ${a.libelle}, livraison avant le ${jourFr(a.dateBesoin)}, secteur ${a.zone}. Rejoins-le avant le ${jourFr(a.clotureLe)}.`;
}

/** Plusieurs alertes du même jour en une seule (au-delà du maximum, et pour le résumé quotidien). */
export function phraseResumeAlertes(alertes: readonly { libelle: string; zone: string; clotureLe: Date }[]): string {
  if (alertes.length === 1) return `Nouvel achat groupé : ${alertes[0]!.libelle}, secteur ${alertes[0]!.zone}. Rejoins-le avant le ${jourFr(alertes[0]!.clotureLe)}.`;
  return `${alertes.length} nouveaux achats groupés près de chez toi : ${alertes.map((a) => a.libelle).join(", ")}.`;
}

/**
 * Que faire d'une alerte pour une entreprise : l'envoyer tout de suite, la garder pour le résumé du jour, ou rien.
 * Au plus `max` alertes envoyées dans la journée ; au-delà, elles attendent le résumé.
 */
export function decisionAlerte(reglage: ReglageAlertes, envoyeesAujourdhui: number, max = ALERTES_ACHATS_GROUPES_JOUR_DEFAUT): "maintenant" | "resume" | "rien" {
  if (reglage === "aucune") return "rien";
  if (reglage === "resume") return "resume";
  return envoyeesAujourdhui < max ? "maintenant" : "resume";
}

/* --------------------------------------------------------------- l'envoi aux négoces (point 3) */

/** « De la part de vos clients Bati Invest et Le Goff, via Mobiiz » : seulement SES clients. */
export function deLaPartDe(clients: readonly string[]): string {
  const noms = [...new Set(clients.map((c) => c.trim()).filter(Boolean))];
  const liste = noms.length <= 1 ? (noms[0] ?? "") : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
  return noms.length <= 1 ? `De la part de votre client ${liste}, via ${NOM_APP}` : `De la part de vos clients ${liste}, via ${NOM_APP}`;
}

export interface DemandeNegoceAchatGroupe {
  clients: readonly string[];
  libelle: string;
  quantiteTotale: string;
  unite: string;
  livraisons: readonly { commune: string; date: Date; quantite: string }[];
  reponseAvantLe: Date;
  commandeAvantLe: Date;
  lien: string;
  commissionPct: number;
}

/** L'objet et le corps de LA demande envoyée à un négoce : volume total, référence exacte, lieux et dates, règles claires. */
export function demandeNegoce(d: DemandeNegoceAchatGroupe): { objet: string; texte: string } {
  const objet = `Demande de prix groupée : ${d.quantiteTotale} ${d.unite} ${de(d.libelle)} (réponse avant le ${jourFr(d.reponseAvantLe)})`;
  const texte = [
    "Bonjour,",
    "",
    `${deLaPartDe(d.clients)}.`,
    "",
    `Achat groupé : ${d.quantiteTotale} ${d.unite} ${de(d.libelle)}.`,
    "Référence exacte : " + d.libelle + ".",
    "",
    "Livraisons :",
    ...d.livraisons.map((l) => `- ${l.quantite} ${d.unite} à ${l.commune}, avant le ${jourFr(l.date)}`),
    "",
    "À savoir avant de répondre :",
    "- Vous n'êtes pas le seul négoce consulté.",
    "- Une seule offre possible, sans deuxième tour : faites votre meilleur prix.",
    `- Prix HT livraison comprise, ferme jusqu'au ${jourFr(d.commandeAvantLe)} (date de commande), même si le volume final est un peu inférieur.`,
    "- Le bon de commande vous arrive directement ; le client vous paie sur son compte habituel.",
    d.commissionPct > 0 ? `- Une commission ${NOM_APP} de ${String(d.commissionPct).replace(".", ",")} % s'applique aux commandes passées (conditions à accepter avant de déposer l'offre).` : `- Aucune commission ${NOM_APP} sur cet achat groupé (lancement).`,
    "",
    `Répondre avant le ${jourFr(d.reponseAvantLe)}, sans inscription : ${d.lien}`,
    "Vous pouvez saisir un prix ou déposer votre devis PDF.",
    "",
    NOM_APP,
  ].join("\n");
  return { objet, texte };
}

/** La commission d'un achat groupé : celle du lancement pour les N premiers, sinon la commission par défaut. */
export function commissionAchatGroupe(numero: number, o: { defaut: number; lancement: number | null; premiers: number }): number {
  return o.lancement !== null && numero <= o.premiers ? o.lancement : o.defaut;
}

/* ------------------------------------------------------------------ l'analyse des offres (point 4) */

export interface OffreACompare {
  id: string;
  /** Le prix unitaire HT livré, lu ou saisi ; null si illisible. */
  prixUnitaireHt: number | null;
  /** La référence telle que lue dans l'offre (null : saisie sur le lien, donc celle de la demande). */
  designationLue: string | null;
  /** La quantité couverte par l'offre (null : toute la demande). */
  quantiteCouverte: number | null;
  delaiJours: number | null;
  /** Les doutes de la lecture (IA) : un seul suffit à écarter l'offre de la mise en avant. */
  doutes: readonly string[];
  /** Livraison non comprise, d'après l'offre. */
  livraisonEnSus: boolean;
}

export type RaisonDoute = "reference" | "ligne_manquante" | "delai" | "lecture" | "prix_illisible" | "livraison";
export const PHRASES_DOUTE: Readonly<Record<RaisonDoute, string>> = {
  reference: "La référence de l'offre n'est pas celle demandée.",
  ligne_manquante: "L'offre ne couvre pas toute la quantité demandée.",
  delai: "Le délai de livraison dépasse la date de besoin.",
  lecture: "La lecture du devis a un doute.",
  prix_illisible: "Le prix n'a pas pu être lu.",
  livraison: "La livraison n'est pas comprise.",
};

export interface OffreJugee {
  id: string;
  valide: boolean;
  raisons: RaisonDoute[];
  prixUnitaireHt: number | null;
}

/**
 * Le code compare sur une base identique : même référence (clé stricte), toute la quantité, livraison comprise, délai
 * tenu. Une offre douteuse n'est jamais mise en avant ; elle va à l'admin. La meilleure est la moins chère des valides.
 */
export function jugerOffres(offres: readonly OffreACompare[], demande: { cle: string; quantiteTotale: number; delaiMaxJours: number }): { jugees: OffreJugee[]; meilleure: OffreJugee | null } {
  const jugees = offres.map((o) => {
    const raisons: RaisonDoute[] = [];
    if (o.prixUnitaireHt === null || !(o.prixUnitaireHt > 0)) raisons.push("prix_illisible");
    if (o.designationLue !== null) {
      const r = referenceStricte(o.designationLue);
      if (!r.ok || r.reference.cle !== demande.cle) raisons.push("reference");
    }
    if (o.quantiteCouverte !== null && o.quantiteCouverte + 1e-9 < demande.quantiteTotale) raisons.push("ligne_manquante");
    if (o.delaiJours !== null && o.delaiJours > demande.delaiMaxJours) raisons.push("delai");
    if (o.doutes.length) raisons.push("lecture");
    if (o.livraisonEnSus) raisons.push("livraison");
    return { id: o.id, valide: raisons.length === 0, raisons, prixUnitaireHt: o.prixUnitaireHt };
  });
  const valides = jugees.filter((j) => j.valide).sort((a, b) => a.prixUnitaireHt! - b.prixUnitaireHt!);
  return { jugees, meilleure: valides[0] ?? null };
}

const centimes = (n: number) => Math.round(n * 100) / 100;

/**
 * Ce que voit l'artisan (point 5) : l'offre de son ou ses négoces, la meilleure du groupe, l'économie en euros sur SA
 * quantité. Le nom du négoce de la meilleure offre seulement à un participant abonné avec une quantité réelle.
 */
export function vueOffresArtisan(
  a: { quantite: number; mesNegoces: readonly { nom: string; prixUnitaireHt: number | null; valide: boolean }[]; meilleure: { nom: string; prixUnitaireHt: number; estUnDesMiens: boolean } | null; abonne: boolean },
): { mien: { nom: string; totalHt: number } | null; meilleure: { nom: string | null; totalHt: number; prixUnitaireHt: number } | null; economieHt: number | null } {
  const miens = a.mesNegoces.filter((n) => n.valide && n.prixUnitaireHt !== null).sort((x, y) => x.prixUnitaireHt! - y.prixUnitaireHt!);
  const mien = miens[0] ? { nom: miens[0].nom, totalHt: centimes(miens[0].prixUnitaireHt! * a.quantite) } : null;
  if (!a.meilleure) return { mien, meilleure: null, economieHt: null };
  const totalMeilleure = centimes(a.meilleure.prixUnitaireHt * a.quantite);
  const nom = a.meilleure.estUnDesMiens || (a.abonne && a.quantite > 0) ? a.meilleure.nom : null;
  return { mien, meilleure: { nom, totalHt: totalMeilleure, prixUnitaireHt: a.meilleure.prixUnitaireHt }, economieHt: mien ? centimes(Math.max(0, mien.totalHt - totalMeilleure)) : null };
}

/* -------------------------------------------------------------------------- l'anti-fraude (point 9) */

/** Les codes d'activité du bâtiment (section F de la NAF : 41, 42, 43). */
export const estActiviteBatiment = (naf: string | null | undefined) => !!naf && /^4[123]\./.test(naf.trim());
/** Le commerce de gros de matériaux : un négoce ne s'inscrit pas comme artisan. */
export const estCommerceDeGros = (naf: string | null | undefined) => !!naf && /^(46\.|47\.52)/.test(naf.trim());
export const PHRASE_ACTIVITE_REFUSEE = "Les achats groupés sont réservés aux entreprises du bâtiment (code d'activité 41, 42 ou 43).";
/** Un compte à signaler : il rejoint souvent sans jamais commander. */
export const participantSuspect = (participations: number, commandes: number) => participations >= PARTICIPATIONS_SANS_COMMANDE_MAX && commandes === 0;

/* --------------------------------------------------------------------- prévenir son négoce (point 12) */

export function ecranPrevenir(a: { volumeTotal: string; libelle: string; clotureLe: Date }): string {
  return `Ton négoce va recevoir une grosse demande : ${a.volumeTotal} ${de(a.libelle)}, le ${jourFr(a.clotureLe)}, de la part de ${NOM_APP}. C'est une belle opportunité pour lui. Préviens-le pour qu'il ne passe pas à côté, et dis-lui qu'il n'aura qu'une seule offre à faire : son meilleur prix.`;
}

export function smsPrevenir(a: { libelle: string; clotureLe: Date; prenom: string; entreprise: string }): string {
  const article = a.libelle.replace(/^[A-ZÀ-Ý]/, (c) => c.toLowerCase());
  return `Bonjour, je participe à un achat groupé ${NOM_APP} pour ${article}. Vous allez recevoir la demande de prix le ${jourFr(a.clotureLe)}, avec le volume total. Une seule offre possible, merci de nous faire votre meilleur prix. ${a.prenom}, ${a.entreprise}`;
}

export const phraseDemandePartie = (negoce: string) => `Ta demande est partie chez ${negoce}. Assure-toi qu'il l'a bien reçue.`;
export const phraseRappelVeille = (negoce: string, libelle: string) => `Demain, ${negoce} reçoit la demande groupée ${de(libelle)}. Tu l'as prévenu ?`;
