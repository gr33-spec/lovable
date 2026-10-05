import type { Referential } from "./model.js";
import { CARRELAGE_REFERENTIAL } from "./data/carrelage.js";
import { MACONNERIE_REFERENTIAL } from "./data/maconnerie.js";
import { PEINTURE_REFERENTIAL } from "./data/peinture.js";
import { PLATRERIE_REFERENTIAL } from "./data/platrerie.js";
import { ROOFING_REFERENTIAL } from "./data/roofing.js";

/**
 * LES TIROIRS OUVERTS (§22 : un métier = un dossier de référentiel, moteur générique) : le référentiel de chaque
 * métier que BatiClair sait calculer. Un métier absent d'ici n'a pas de tiroir : on le dit, on ne calcule jamais
 * un devis d'électricien avec les règles du couvreur.
 */
export const REFERENTIALS: readonly Referential[] = [ROOFING_REFERENTIAL, PLATRERIE_REFERENTIAL, CARRELAGE_REFERENTIAL, PEINTURE_REFERENTIAL, MACONNERIE_REFERENTIAL];

/** Nom du métier tel que l'API le montre (« couverture », « platrerie ») ; les deux formes sont acceptées en entrée. */
export const METIER_NAMES: Readonly<Record<string, string>> = {
  roofing: "couverture",
  drywall: "platrerie",
  tiling: "carrelage",
  painting: "peinture",
  masonry: "maconnerie",
};

/** « couverture », « roofing », « Plâtrerie », « drywall » → l'identifiant du métier (« roofing », « drywall »). */
export function tradeIdOf(metier: string): string {
  const n = metier.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return Object.entries(METIER_NAMES).find(([id, name]) => id === n || name === n)?.[0] ?? n;
}

/**
 * Le référentiel d'un métier, ou null s'il n'a pas de tiroir. Un artisan multi-métiers (« roofing,drywall ») prend
 * le premier de ses métiers qui en a un.
 */
export function referentialFor(trade: string | null | undefined): Referential | null {
  for (const id of (trade ?? "").split(",").map((t) => tradeIdOf(t)).filter(Boolean)) {
    const ref = REFERENTIALS.find((r) => r.trade === id);
    if (ref) return ref;
  }
  return null;
}
