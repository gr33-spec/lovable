/**
 * CE QUI EST GRATUIT, CE QUI EST PAYANT : UNE SEULE FAÇON DE LE DIRE (Greg, 29 octobre 2026 : « on dit que c'est gratuit
 * alors qu'il y a une partie payante »). La landing, la page Tarifs, « Mon abonnement » et le paywall prennent leurs mots
 * ici, et ils disent ce que le code applique (`DroitsService`, `droitAchatGroupe`, `LECTURES_IA_GRATUIT_TOTAL`) :
 * - gratuit, sans limite de temps : tes listes notées à la main, l'envoi à tes négoces, leurs réponses comparées, les achats
 *   groupés de ton secteur pour voir, et 3 listes préparées par l'app depuis un devis ou une photo ;
 * - abonnement : rejoindre les achats groupés (le premier est offert) et les listes préparées sans limite.
 * Aucun montant ici (Greg, 27 octobre 2026, point 34 : le prix est un réglage, montré dans « Mon abonnement »).
 */
export const LISTES_PREPAREES_OFFERTES = 3;

export const TARIFS = {
  /** Sous le bouton d'inscription de la landing, et en tête de la page Tarifs. */
  enUneLigne: "Gratuit pour tes listes et tes négoces. Les achats groupés sont sur abonnement : le premier est offert.",
  gratuit: {
    titre: "Gratuit",
    sous: "sans limite de temps",
    points: [
      "Tes listes, notées à la main",
      "Envoyées à tes négoces, leurs prix comparés",
      `${LISTES_PREPAREES_OFFERTES} listes préparées pour toi depuis un devis ou une photo`,
      "Les achats groupés de ton secteur, pour voir",
    ],
  },
  abonne: {
    titre: "Abonnement",
    sous: "pour les achats groupés",
    points: ["Rejoindre les achats groupés de ton métier", "Le premier achat groupé est offert", "Listes préparées depuis tes devis et tes photos, sans limite"],
  },
  /** « C'est gratuit ? » : la réponse de la landing. */
  question: {
    q: "C'est gratuit ?",
    r: `Oui pour tes listes et tes négoces, sans limite de temps. Les achats groupés sont sur abonnement, et le premier est offert. On te prépare aussi tes ${LISTES_PREPAREES_OFFERTES} premières listes depuis un devis ou une photo ; ensuite tu les notes à la main, ou tu t'abonnes.`,
  },
  /** Le paywall quand un achat groupé demande l'abonnement. */
  paywallAchatGroupe: "Les achats groupés sont sur abonnement. Tes listes et tes négoces restent gratuits.",
  /** Le paywall quand les listes préparées offertes sont utilisées. */
  paywallListes: `Tes ${LISTES_PREPAREES_OFFERTES} listes préparées offertes sont utilisées. Note ta liste à la main, c'est gratuit, ou abonne-toi pour qu'on te les prépare sans limite.`,
} as const;
