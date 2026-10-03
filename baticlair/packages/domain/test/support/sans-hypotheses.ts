import type { Referential } from "../../src/index.js";

/**
 * La même bibliothèque SANS ses hypothèses par défaut, produits par défaut ni
 * pertes : sert à prouver la mécanique du moteur (une question seulement si
 * elle change la commande, intervalles, préférences…) indépendamment des
 * valeurs que le référentiel du fondateur fournit.
 */
export function sansHypotheses(ref: Referential): Referential {
  return {
    ...ref,
    wasteRules: [],
    workItems: ref.workItems.map((w) => ({
      ...w,
      params: w.params.map(({ default: _d, ...p }) => p),
      slots: w.slots.map((s) => (s.usual?.productId ? { ...s, usual: { text: s.usual.text, source: s.usual.source, ...(s.usual.productShort ? { productShort: s.usual.productShort } : {}) } } : s)),
    })),
  };
}
