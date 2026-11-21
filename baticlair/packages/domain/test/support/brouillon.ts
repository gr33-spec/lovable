import type { Referential, Verification } from "../../src/index.js";

/**
 * La même bibliothèque, toutes ses règles de calcul et caractéristiques
 * remises EN BROUILLON. Sert à garder prouvées les garanties « une donnée non
 * vérifiée ne donne jamais de chiffre ni de ✓ » maintenant que les règles de
 * couverture sont validées.
 */
export function drafted(ref: Referential): Referential {
  const draft: Verification = { status: "draft" };
  return {
    ...ref,
    workItems: ref.workItems.map((w) => ({ ...w, needs: w.needs.map((n) => ({ ...n, verification: draft })) })),
  };
}
