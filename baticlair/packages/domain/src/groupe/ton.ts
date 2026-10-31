/**
 * LE TON DE MOBIIZ, CÔTÉ ARTISAN (Greg, lot final : « esprit de solidarité entre artisans, très important ») : un collègue
 * qui te soutient, complice, chaleureux, direct, au tutoiement ; jamais un slogan, jamais contre les négoces (on compare,
 * on vérifie, on pèse ensemble). Les phrases des moments clés, mot pour mot ; le guide est dans docs/groupe/TON.md.
 */
export const TON = {
  /** Avant l'envoi à ses négoces. */
  avantEnvoiNegoces: "Mets tes négoces en concurrence. Un négoce sérieux répond, et tu sauras vite qui tient la route.",
  /** Avant un achat groupé. */
  avantAchatGroupe: "Seul, tu pèses une palette. À plusieurs, on pèse un camion.",
  /** À l'engagement dans un achat groupé. */
  engagement: "D'autres artisans du secteur comptent sur ta commande pour peser. Si tu t'engages, tu commandes.",
  /** Relance d'un artisan dans un achat groupé, pour ses propres négoces. */
  relanceGroupe: "Plus il y a de négoces qui répondent, meilleur est le prix pour tout le groupe.",
} as const;

/** La carte du groupe : « 7 artisans du secteur · 3 200 pièces au total » ; le nombre seulement à partir du seuil d'anonymat. */
export function phraseCarteGroupe(n: number, volume: string, seuilAnonymat: number): string {
  return n >= seuilAnonymat ? `${n} artisans du secteur · ${volume} au total` : `${volume} au total`;
}

/** Après la commande, seulement si l'économie est réelle et calculée (sinon, rien). */
export function phraseEconomieGroupe(economieHt: number | null): string | null {
  if (economieHt === null || !(economieHt >= 1)) return null;
  const m = Math.round(economieHt).toLocaleString("fr-FR").replace(/ | /g, " ");
  return `Ensemble, vous avez payé ${m} € HT de moins.`;
}

/** La relance de l'artisan quand un négoce n'a pas répondu (lot final, point 6). */
export function phraseRelanceArtisan(negoce: string): string {
  return `${negoce} n'a pas encore répondu. Appelle ton commercial : ta demande est peut-être dans ses spams.`;
}

/**
 * Le compte à rebours de la page du négoce (lot final, point 7, vouvoiement) : « Plus que 2 jours pour répondre »,
 * « Dernier jour pour répondre » ; rien une fois la date passée.
 */
export function phraseCompteARebours(limite: Date, maintenant: Date): string | null {
  const ms = limite.getTime() - maintenant.getTime();
  if (ms <= 0) return null;
  const jours = Math.floor(ms / 86_400_000);
  return jours < 1 ? "Dernier jour pour répondre" : `Plus que ${jours} jour${jours > 1 ? "s" : ""} pour répondre`;
}
