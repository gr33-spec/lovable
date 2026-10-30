import { OFFRES, prixDeLOffre } from "./offres.js";

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
