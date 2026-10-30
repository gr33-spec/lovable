/**
 * LES TROIS OFFRES (Greg, 30 octobre 2026, réponses aux six décisions) : les achats groupés sont GRATUITS pour tous ; seuls
 * les outils IA ont des quotas. Prix hors taxes, mensuels, sans engagement. Les crédits de Découverte sont donnés une seule
 * fois ; ceux d'Essentiel et Pro se renouvellent chaque mois. Rien n'est facturé au-delà : le quota atteint, la saisie à la
 * main reste gratuite et l'app propose la formule au-dessus.
 *
 * LIMITE PAR DOCUMENT (décision 3) : jusqu'à `LIGNES_PAR_ANALYSE` lignes, un devis compte pour une analyse ; au-delà, pour
 * deux, et l'artisan le voit avant que l'analyse parte.
 */
export type FormuleOffre = "decouverte" | "essentiel" | "pro";

export interface Offre {
  formule: FormuleOffre;
  nom: string;
  /** Prix HT par mois, en euros. */
  prixHt: number;
  /** Analyses de devis : offertes une fois (Découverte), sinon par mois. */
  analyses: number;
  /** Scans de liste (photo ou PDF d'une liste) : idem. */
  scans: number;
  parMois: boolean;
}

export const OFFRES: Readonly<Record<FormuleOffre, Offre>> = {
  decouverte: { formule: "decouverte", nom: "Découverte", prixHt: 0, analyses: 1, scans: 3, parMois: false },
  essentiel: { formule: "essentiel", nom: "Essentiel", prixHt: 19.9, analyses: 3, scans: 10, parMois: true },
  pro: { formule: "pro", nom: "Pro", prixHt: 39.9, analyses: 8, scans: 30, parMois: true },
};

export const FORMULES_PAYANTES = ["essentiel", "pro"] as const;
export type FormulePayante = (typeof FORMULES_PAYANTES)[number];

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
 * La formule d'un compte : un abonnement actif « pro » est Pro ; tout autre abonnement actif est Essentiel (les anciens
 * « mensuel » et « annuel » de la prévisualisation compris) ; sans abonnement, Découverte.
 */
export function formuleDuCompte(abonnement: { actif: boolean; formule: string | null }): FormuleOffre {
  if (!abonnement.actif) return "decouverte";
  return abonnement.formule === "pro" ? "pro" : "essentiel";
}

/** « 19,90 € HT par mois » ; « Gratuit » pour Découverte. */
export function prixDeLOffre(o: Offre): string {
  if (o.prixHt === 0) return "Gratuit";
  return `${o.prixHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT par mois`;
}

/** La formule au-dessus (Pro n'en a pas). */
export const formuleAuDessus = (f: FormuleOffre): FormulePayante | null => (f === "decouverte" ? "essentiel" : f === "essentiel" ? "pro" : null);

export interface Quotas {
  formule: FormuleOffre;
  analyses: { limite: number; utilisees: number; restantes: number };
  scans: { limite: number; utilisees: number; restantes: number };
  parMois: boolean;
}

export function quotasDe(formule: FormuleOffre, utilisees: { analyses: number; scans: number }): Quotas {
  const o = OFFRES[formule];
  const q = (limite: number, u: number) => ({ limite, utilisees: u, restantes: Math.max(0, limite - u) });
  return { formule, analyses: q(o.analyses, utilisees.analyses), scans: q(o.scans, utilisees.scans), parMois: o.parMois };
}

/** Les mots d'un quota, accordés (« analyse » est féminin, « scan » masculin). */
const MOTS = {
  analyses: { un: "analyse de devis", plusieurs: "analyses de devis", offert: "offerte", offerts: "offertes", utilises: "utilisées" },
  scans: { un: "scan de liste", plusieurs: "scans de liste", offert: "offert", offerts: "offerts", utilises: "utilisés" },
} as const;

/** La jauge, en une phrase, sur l'écran de dépôt : « 2 analyses de devis sur 3 ce mois-ci. », « 1 analyse de devis offerte sur 1. » */
export function phraseQuota(q: Quotas, quoi: "analyses" | "scans"): string {
  const c = q[quoi];
  const m = MOTS[quoi];
  if (c.restantes <= 0) return `Plus ${/^[aeiou]/.test(m.plusieurs) ? "d'" : "de "}${m.plusieurs} ${q.parMois ? "ce mois-ci" : m.offerts}. La saisie à la main reste gratuite.`;
  const nom = c.restantes > 1 ? m.plusieurs : m.un;
  return q.parMois ? `${c.restantes} ${nom} sur ${c.limite} ce mois-ci.` : `${c.restantes} ${nom} ${c.restantes > 1 ? m.offerts : m.offert} sur ${c.limite}.`;
}

/** Le paywall d'un quota atteint : ce qui reste gratuit, et la formule au-dessus. */
export function phrasePaywallQuota(formule: FormuleOffre, quoi: "analyses" | "scans"): string {
  const m = MOTS[quoi];
  const debut = formule === "decouverte" ? `Tes ${m.plusieurs} ${m.offerts} sont ${m.utilises}.` : `Tes ${m.plusieurs} du mois sont ${m.utilises}.`;
  const au = formuleAuDessus(formule);
  const suite = au ? ` Passe à ${OFFRES[au].nom} pour en avoir plus, ou note ta liste à la main : c'est gratuit.` : " Elles reviennent le mois prochain ; d'ici là, note ta liste à la main : c'est gratuit.";
  return debut + (quoi === "scans" && !au ? suite.replace("Elles reviennent", "Ils reviennent") : suite);
}


/**
 * CE QUI EST GRATUIT, CE QUI EST PAYANT : UNE SEULE FAÇON DE LE DIRE (Greg, 29 octobre 2026 : « on dit que c'est gratuit
 * alors qu'il y a une partie payante »). La landing, la page Tarifs, « Mon abonnement » et les paywalls prennent leurs mots
 * ici, et ils disent ce que le code applique (`OFFRES`, `AnalysisMeter`, `droitAchatGroupe`).
 *
 * RÈGLE CHANGÉE (Greg, 30 octobre 2026, réponses aux six décisions) : les ACHATS GROUPÉS SONT GRATUITS pour tous ; seuls
 * les outils IA (analyses de devis, scans de liste) ont des quotas : Découverte (gratuit, 1 analyse et 3 scans offerts,
 * une fois), Essentiel (19,90 € HT par mois : 3 et 10 par mois), Pro (39,90 € HT par mois : 8 et 30 par mois). Avant : un
 * seul abonnement (49 € par mois ou 348 € par an) pour rejoindre les achats groupés, le premier offert, et 3 listes
 * préparées offertes. L'engagement de l'artisan dans un achat groupé ne change pas.
 */
const D = OFFRES.decouverte;
const E = OFFRES.essentiel;
const P = OFFRES.pro;

/** Gardé pour les anciens appels : les analyses de devis offertes à Découverte. */
export const LISTES_PREPAREES_OFFERTES = D.analyses;

const pointsPayants = (o: typeof E) => [`${o.analyses} analyses de devis par mois`, `${o.scans} scans de liste par mois`, "Tout le reste de Découverte", "Sans engagement"];

export const TARIFS = {
  /** Sous le bouton d'inscription, et en tête de la page Tarifs. */
  enUneLigne: "Gratuit : tes listes, tes négoces et les achats groupés. Les abonnements ajoutent des analyses de devis et des scans de liste chaque mois.",
  gratuit: {
    titre: D.nom,
    sous: "gratuit, sans limite de temps",
    points: [
      "Tes listes notées à la main, sans limite",
      "Le PDF et l'envoi à tous tes négoces",
      "Les achats groupés de ton secteur",
      `${D.analyses} analyse de devis et ${D.scans} scans de liste offerts`,
    ],
  },
  essentiel: { titre: E.nom, sous: prixDeLOffre(E), points: pointsPayants(E) },
  pro: { titre: P.nom, sous: prixDeLOffre(P), points: pointsPayants(P) },
  /** « C'est gratuit ? » : la réponse de la landing. */
  question: {
    q: "C'est gratuit ?",
    r: `Oui : tes listes, l'envoi à tes négoces et les achats groupés sont gratuits, sans limite de temps. On t'offre aussi ${D.analyses} analyse de devis et ${D.scans} scans de liste. Pour en avoir chaque mois, il y a les abonnements ${E.nom} et ${P.nom} ; sinon, tu notes ta liste à la main.`,
  },
  /** Plus de paywall pour les achats groupés : la phrase rappelle ce qui est gratuit. */
  paywallAchatGroupe: "Les achats groupés sont gratuits. Tes listes et tes négoces aussi.",
  /** Le paywall de Découverte quand l'analyse offerte est utilisée (voir `phrasePaywallQuota` pour les autres cas). */
  paywallListes: `Ton analyse de devis offerte est utilisée. Note ta liste à la main, c'est gratuit, ou passe à ${E.nom} pour ${E.analyses} analyses par mois.`,
} as const;
