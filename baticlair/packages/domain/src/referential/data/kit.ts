import type { Fact, ParamDef, Product, Provenance, SellingUnit, Source } from "../model.js";

/**
 * LA BOÎTE À OUTILS DES TIROIRS (lot B, « tous les métiers calculent ») : de quoi écrire un tiroir métier comme la
 * couverture, en une page lisible. Trois statuts, ceux du §47.1 :
 *  - `ok(source)` : SOURCÉ (fiche fabricant, négoce, DTU), la valeur fait foi ;
 *  - `todo(note)` : À VÉRIFIER, la ligne qui l'emploie sort orange « Quantité à confirmer » jusqu'au « C'est bon » ;
 *  - `disputed(note)` : CONTRADICTION entre sources, même traitement, dit « sources en désaccord ».
 */
export const VERIFIED_AT = "2026-10-05";

/** Une donnée sourcée (fiche fabricant ou négoce relevée par la recherche du tiroir, date de relevé). */
export const ok = (note?: string): Provenance["verification"] => ({
  status: "verified",
  verifiedAt: VERIFIED_AT,
  verifiedBy: "Recherche tiroir (fiche fabricant ou négoce)",
  ...(note ? { note } : {}),
});
/** Une donnée à vérifier : chiffre d'usage du référentiel métier, sans source fiable trouvée. */
export const todo = (note?: string): Provenance["verification"] => ({ status: "draft", ...(note ? { note } : {}) });

const DEFINITION_CHECK: Provenance["verification"] = {
  status: "verified",
  verifiedAt: VERIFIED_AT,
  verifiedBy: "BatiClair (définition)",
};

/** Une constante de règle (« colle 4 kg/m² ») : `label` la nomme à l'écran, « {v} » y place la valeur. */
export function rule(value: string, unit: string, source: string, verification: Provenance["verification"], label: string, note?: string): Fact {
  return {
    kind: "installation_condition",
    value,
    unit,
    source,
    verification,
    version: 1,
    label,
    ...(note ? { note } : {}),
  };
}
/** Même chose, mais les sources se contredisent (§47.1, statut « contradiction » du tiroir). */
export function disputed(value: string, unit: string, source: string, label: string, conflict: string): Fact {
  return {
    kind: "installation_condition",
    value,
    unit,
    source,
    verification: todo(conflict),
    version: 1,
    label,
    conflict,
  };
}
/** Une caractéristique de produit (épaisseur, format). */
export function spec(value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact {
  return {
    kind: "manufacturer_spec",
    value,
    unit,
    source,
    verification,
    version: 1,
    ...(note ? { note } : {}),
  };
}
/** Un conditionnement (sac de 25 kg, rouleau de 10 m). */
export function packaging(value: string, unit: string, source: string, verification: Provenance["verification"], note?: string): Fact {
  return {
    kind: "packaging",
    value,
    unit,
    source,
    verification,
    version: 1,
    ...(note ? { note } : {}),
  };
}

export const ONE_PIECE: Fact = packaging("1", "u", "definition", DEFINITION_CHECK);
export const DEFINITION_SOURCE: Source = {
  id: "definition",
  kind: "definition",
  title: "Définitions (1 pièce = 1 pièce)",
  retrievedAt: VERIFIED_AT,
};

/** Vendu à la pièce. */
export const byPiece = (one = "pièce", many = "pièces"): SellingUnit[] => [{ id: "piece", label: { one, many }, contains: ONE_PIECE, primary: true }];
/** Vendu par conditionnement entier (sac, seau, rouleau, carton, barre) : c'est l'unité de commande. */
export function inPacks(id: string, one: string, many: string, contains: Fact): SellingUnit[] {
  return [{ id, label: { one, many }, contains, primary: true }];
}

/** Un produit générique (sans marque) : le comptoir met sa référence. */
export function generic(id: string, family: string, label: string, shortLabel: string, sellingUnits: SellingUnit[], extra: Partial<Product> = {}): Product {
  return {
    id,
    family,
    label,
    shortLabel,
    aliases: [],
    generic: true,
    attributes: {},
    sellingUnits,
    ...extra,
  };
}

/** La surface (ou la longueur) d'un ouvrage EST la quantité de sa ligne : jamais une question. */
export function lineQuantity(key: string, label: string, unit: string, question: string): ParamDef {
  return {
    key,
    label,
    unit,
    kind: "site_data",
    question,
    fromLineQuantity: true,
  };
}

/** Une hypothèse dite et modifiable (jamais une question, §47.8), avec des boutons pour la changer d'un tap. */
export function assumed(
  key: string,
  label: string,
  unit: string,
  value: string,
  source: string,
  verification: Provenance["verification"],
  note: string,
  choices?: { label: string; value: string }[],
  extra: Partial<ParamDef> = {},
): ParamDef {
  return {
    key,
    label,
    unit,
    kind: "site_data",
    question: `${label} ?`,
    default: { value, source, verification, version: 1, note },
    ...(choices ? { choices } : {}),
    ...extra,
  };
}
