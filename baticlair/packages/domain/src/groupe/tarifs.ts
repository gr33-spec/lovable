/**
 * LES TROIS FORMULES (RÈGLE CHANGÉE, Greg, 15 novembre 2026 ; remplace Découverte, Essentiel et Pro du 30 octobre) :
 *  - GRATUIT : tout l'outil (listes à la main, envoi aux négoces, comparaison, publier et rejoindre des achats groupés),
 *    `ANALYSES_OFFERTES` analyses offertes EN TOUT (devis, photo ou liste), et la première commande groupée offerte ;
 *  - PRO, 29 € HT par mois ou 290 € HT par an : les analyses incluses, voir le négoce retenu et commander dans les
 *    achats groupés ;
 *  - PRO MAX, 49 € HT par mois ou 490 € HT par an : la même chose, avec un plafond bien plus haut.
 * Aucun compteur ni barre à l'écran : le plafond des abonnés est CACHÉ, en euros, par mois d'abonnement et par abonné
 * (`PLAFOND_IA_EUR_DEFAUT`, réglable dans l'admin) ; il ne se dit que lorsqu'il est atteint (`phrasePlafondAtteint`).
 *
 * Avant (30 octobre 2026) : achats groupés gratuits pour tous ; Découverte (1 analyse et 3 scans offerts), Essentiel
 * (19,90 € : 3 et 10 par mois), Pro (39,90 € : 8 et 30 par mois).
 *
 * LIMITE PAR DOCUMENT : `PAGES_MAX_PAR_DEVIS` pages au plus ; pour un compte gratuit, un devis de plus de
 * `LIGNES_PAR_ANALYSE` lignes compte pour deux analyses, et l'artisan le voit avant que l'analyse parte.
 */
export type FormuleOffre = "gratuit" | "pro" | "promax";

export interface Offre {
  formule: FormuleOffre;
  nom: string;
  /** Prix HT par mois, en euros. */
  prixHt: number;
}

export const OFFRES: Readonly<Record<FormuleOffre, Offre>> = {
  gratuit: { formule: "gratuit", nom: "Gratuit", prixHt: 0 },
  pro: { formule: "pro", nom: "Pro", prixHt: 29 },
  promax: { formule: "promax", nom: "Pro Max", prixHt: 49 },
};

export const FORMULES_PAYANTES = ["pro", "promax"] as const;
export type FormulePayante = (typeof FORMULES_PAYANTES)[number];

/** Les analyses offertes à un compte gratuit, en tout (devis, photo et liste confondus). */
export const ANALYSES_OFFERTES = 3;
/** Le plafond caché des abonnés, en euros de consommation par mois d'abonnement (valeurs de départ, réglables dans l'admin). */
export const PLAFOND_IA_EUR_DEFAUT: Readonly<Record<FormulePayante, number>> = { pro: 5, promax: 20 };
/** Un devis de plus de 20 pages n'est pas analysé (garde-fou). */
export const PAGES_MAX_PAR_DEVIS = 20;

export const LIGNES_PAR_ANALYSE = 150;

/**
 * Ce que l'artisan voit AVANT la lecture d'un gros devis (décision 3) : « Ce devis fait 212 lignes : il compte pour 2
 * analyses. Il t'en reste 3. »
 */
export function phraseGrosDevis(lignes: number, restantes: number | null): string {
  const reste = restantes === null ? "" : restantes >= 2 ? ` Il t'en reste ${restantes}.` : restantes === 1 ? " Il ne t'en reste qu'une : note ta liste à la main, c'est gratuit, ou passe à la formule au-dessus." : " Tu n'en as plus : note ta liste à la main, c'est gratuit, ou passe à la formule au-dessus.";
  return `Ce devis fait ${lignes} lignes : il compte pour 2 analyses.${reste}`;
}

/** Combien d'analyses un devis compte : 1 jusqu'à 150 lignes, 2 au-delà. */
export const poidsAnalyse = (lignes: number): 1 | 2 => (lignes > LIGNES_PAR_ANALYSE ? 2 : 1);

/**
 * La formule d'un compte : sans abonnement en cours, Gratuit ; un abonnement « promax » est Pro Max ; tout autre abonnement
 * en cours est Pro (les anciens « essentiel », « mensuel » et « annuel » de la prévisualisation compris).
 */
export function formuleDuCompte(abonnement: { actif: boolean; formule: string | null }): FormuleOffre {
  if (!abonnement.actif) return "gratuit";
  return abonnement.formule === "promax" ? "promax" : "pro";
}

/** À l'année, dix mois facturés pour douze (Greg, 13 novembre 2026) : la même règle que `abonnement.ts`. */
export const MOIS_FACTURES_A_L_ANNEE = 10;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
/** « 290 € HT par an » : le prix d'une offre payée à l'année. */
export function prixAnnuelDeLOffre(o: Offre): string {
  return `${euros(o.prixHt * MOIS_FACTURES_A_L_ANNEE)} HT par an`;
}

/** « 29 € HT par mois » ; « Gratuit » pour la formule gratuite. */
export function prixDeLOffre(o: Offre): string {
  if (o.prixHt === 0) return "Gratuit";
  return `${euros(o.prixHt)} HT par mois`;
}

/** La formule au-dessus (Pro Max n'en a pas). */
export const formuleAuDessus = (f: FormuleOffre): FormulePayante | null => (f === "gratuit" ? "pro" : f === "pro" ? "promax" : null);

/**
 * LE MOIS D'UN ABONNÉ, pour son plafond : il commence au jour anniversaire du début de sa période payée (le 12 de chaque
 * mois pour un abonnement pris un 12, à l'année comme au mois) et finit au suivant, le « renouvellement » dit à l'écran.
 * Sans date de début connue : le mois civil (UTC).
 */
export function moisDAbonnement(periodeDebut: Date | null, maintenant: Date): { debut: Date; fin: Date } {
  if (!periodeDebut || periodeDebut > maintenant) {
    const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
    return { debut, fin: new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1)) };
  }
  // Le n-ième anniversaire mensuel : le même jour, ramené au dernier jour du mois quand il n'existe pas (le 31).
  const anniversaire = (n: number) => {
    const d = new Date(periodeDebut);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(periodeDebut.getUTCDate(), dernier));
    return d;
  };
  let n = (maintenant.getUTCFullYear() - periodeDebut.getUTCFullYear()) * 12 + (maintenant.getUTCMonth() - periodeDebut.getUTCMonth());
  if (anniversaire(n) > maintenant) n -= 1;
  return { debut: anniversaire(n), fin: anniversaire(n + 1) };
}

const jourEtMois = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(d);

/**
 * Le SEUL message du plafond, dit quand il est atteint (Greg, 15 novembre 2026) : « Passe au Pro Max ou attends le
 * renouvellement le [date]. » ; en Pro Max, il n'y a rien au-dessus.
 */
export function phrasePlafondAtteint(formule: FormulePayante, renouvellement: Date): string {
  const le = jourEtMois(renouvellement);
  return formule === "pro"
    ? `Tu as atteint la limite d'analyses de ton mois. Passe au Pro Max ou attends le renouvellement le ${le}.`
    : `Tu as atteint la limite d'analyses de ton mois. Attends le renouvellement le ${le} ; d'ici là, note ta liste à la main.`;
}

/** Les analyses offertes d'un compte gratuit sont toutes utilisées : ce qui reste gratuit, et la formule au-dessus. */
export const PHRASE_ANALYSES_OFFERTES_UTILISEES = `Tes ${ANALYSES_OFFERTES} analyses offertes sont utilisées. Note ta liste à la main, c'est gratuit, ou passe à ${OFFRES.pro.nom} : les analyses sont incluses.`;

/** Achats groupés (Greg, 15 novembre 2026) : la première commande est offerte ; ensuite, voir le négoce retenu et commander demande Pro. */
export const PHRASE_ACHAT_GROUPE_PRO = `Ta première commande groupée était offerte. Pour voir le négoce retenu et commander, passe à ${OFFRES.pro.nom}.`;

/** Un compte gratuit peut-il voir le négoce retenu et commander ? Oui tant qu'il n'a encore passé aucune commande groupée. */
export function droitCommandeGroupee(a: { abonne: boolean; commandesPassees: number }): { ok: boolean; offerte: boolean; phrase: string | null } {
  if (a.abonne) return { ok: true, offerte: false, phrase: null };
  if (a.commandesPassees === 0) return { ok: true, offerte: true, phrase: null };
  return { ok: false, offerte: false, phrase: PHRASE_ACHAT_GROUPE_PRO };
}

/**
 * CE QUI EST GRATUIT, CE QUI EST PAYANT : UNE SEULE FAÇON DE LE DIRE (Greg, 29 octobre 2026 : « on dit que c'est gratuit
 * alors qu'il y a une partie payante »). La landing, la page Tarifs, « Mon abonnement » et les paywalls prennent leurs mots
 * ici, et ils disent ce que le code applique (`OFFRES`, `AnalysisMeter`, `droitAchatGroupe`).
 *
 * RÈGLE CHANGÉE (Greg, 15 novembre 2026) : Gratuit, Pro et Pro Max (voir en tête de fichier). Ce qui suit est l'historique.
 * RÈGLE CHANGÉE (Greg, 30 octobre 2026, réponses aux six décisions) : les ACHATS GROUPÉS SONT GRATUITS pour tous ; seuls
 * les outils IA (analyses de devis, scans de liste) ont des quotas : Découverte (gratuit, 1 analyse et 3 scans offerts,
 * une fois), Essentiel (19,90 € HT par mois : 3 et 10 par mois), Pro (39,90 € HT par mois : 8 et 30 par mois). Avant : un
 * seul abonnement (49 € par mois ou 348 € par an) pour rejoindre les achats groupés, le premier offert, et 3 listes
 * préparées offertes. L'engagement de l'artisan dans un achat groupé ne change pas.
 */
const G = OFFRES.gratuit;
const P = OFFRES.pro;
const M = OFFRES.promax;

/** Gardé pour les anciens appels : les analyses offertes à un compte gratuit. */
export const LISTES_PREPAREES_OFFERTES = ANALYSES_OFFERTES;

export const TARIFS = {
  /** Sous le bouton d'inscription, et en tête de la page Tarifs. */
  enUneLigne: `Gratuit : tes listes, tes négoces, la comparaison et les achats groupés. ${P.nom} ajoute l'analyse de tes devis et la commande en achat groupé.`,
  gratuit: {
    titre: G.nom,
    sous: "sans limite de temps",
    points: [
      "Tes listes notées à la main, sans limite",
      "L'envoi jusqu'à 5 négoces par demande, et la comparaison des réponses",
      "Publier et rejoindre des achats groupés",
      `${ANALYSES_OFFERTES} analyses offertes (devis, photo ou liste)`,
      "Ta première commande groupée offerte",
    ],
  },
  pro: {
    titre: P.nom,
    sous: prixDeLOffre(P),
    points: ["Tout le Gratuit", "L'analyse de tes devis, photos et listes incluse", "Achats groupés : tu vois le négoce retenu et tu commandes", "Sans engagement"],
  },
  promax: {
    titre: M.nom,
    sous: prixDeLOffre(M),
    points: [`Tout le ${P.nom}`, "Pour ceux qui font analyser beaucoup de documents : une limite d'usage bien plus haute", "Sans engagement"],
  },
  /** L'année se dit sur la page Tarifs comme dans « Mon abonnement ». */
  annee: {
    q: "Et si je paie à l'année ?",
    r: `Deux mois offerts : tu paies dix mois pour douze. ${P.nom} : ${prixAnnuelDeLOffre(P)} ; ${M.nom} : ${prixAnnuelDeLOffre(M)}. Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise.`,
  },
  /** L'usage normal : dit sans chiffre, et honnêtement (il y a bien une limite). */
  limite: {
    q: "Y a-t-il une limite d'analyses ?",
    r: `Oui, mais tu n'as rien à compter : les analyses sont incluses pour un usage normal de chantier, avec une limite par mois, bien plus haute en ${M.nom}. Si tu l'atteins un jour, on te le dit, avec la date à laquelle elle repart.`,
  },
  /** « C'est gratuit ? » : la réponse de la landing (aucun montant sur la landing : les prix sont sur la page Tarifs). */
  question: {
    q: "C'est gratuit ?",
    r: `Oui : tes listes, l'envoi à tes négoces, la comparaison et les achats groupés sont gratuits, sans limite de temps. On t'offre aussi ${ANALYSES_OFFERTES} analyses de documents et ta première commande groupée. Ensuite, l'abonnement ${P.nom} inclut les analyses et la commande en achat groupé ; sinon, tu notes ta liste à la main.`,
  },
  /** Publier et rejoindre restent gratuits ; la commande demande Pro après la première. */
  paywallAchatGroupe: PHRASE_ACHAT_GROUPE_PRO,
  /** Le paywall d'un compte gratuit quand ses analyses offertes sont utilisées. */
  paywallListes: PHRASE_ANALYSES_OFFERTES_UTILISEES,
} as const;
