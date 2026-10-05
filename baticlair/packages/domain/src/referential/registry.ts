import type { Referential } from "./model.js";
import { BARDAGE_REFERENTIAL } from "./data/bardage.js";
import { CARRELAGE_REFERENTIAL } from "./data/carrelage.js";
import { CHARPENTE_REFERENTIAL } from "./data/charpente.js";
import { CHAUFFAGE_VENTILATION_REFERENTIAL } from "./data/chauffage-ventilation.js";
import { ELECTRICITE_REFERENTIAL } from "./data/electricite.js";
import { ETANCHEITE_REFERENTIAL } from "./data/etancheite.js";
import { FACADE_REFERENTIAL } from "./data/facade.js";
import { MACONNERIE_REFERENTIAL } from "./data/maconnerie.js";
import { MENUISERIE_REFERENTIAL } from "./data/menuiserie.js";
import { PEINTURE_REFERENTIAL } from "./data/peinture.js";
import { PLATRERIE_REFERENTIAL } from "./data/platrerie.js";
import { PLOMBERIE_REFERENTIAL } from "./data/plomberie.js";
import { ROOFING_REFERENTIAL } from "./data/roofing.js";

/**
 * LES TIROIRS OUVERTS (§22 : un métier = un dossier de référentiel, moteur générique) : le référentiel de chaque
 * métier que BatiClair sait calculer. Un métier absent d'ici n'a pas de tiroir : on le dit, on ne calcule jamais
 * un devis d'électricien avec les règles du couvreur.
 */
export const REFERENTIALS: readonly Referential[] = [
  ROOFING_REFERENTIAL,
  PLATRERIE_REFERENTIAL,
  CARRELAGE_REFERENTIAL,
  PEINTURE_REFERENTIAL,
  MACONNERIE_REFERENTIAL,
  ELECTRICITE_REFERENTIAL,
  PLOMBERIE_REFERENTIAL,
  MENUISERIE_REFERENTIAL,
  CHAUFFAGE_VENTILATION_REFERENTIAL,
  CHARPENTE_REFERENTIAL,
  ETANCHEITE_REFERENTIAL,
  BARDAGE_REFERENTIAL,
  FACADE_REFERENTIAL,
];

/** Nom du métier tel que l'API le montre (« couverture », « platrerie ») ; les deux formes sont acceptées en entrée. */
export const METIER_NAMES: Readonly<Record<string, string>> = {
  roofing: "couverture",
  drywall: "platrerie",
  tiling: "carrelage",
  painting: "peinture",
  masonry: "maconnerie",
  electrical: "electricite",
  plumbing: "plomberie",
  joinery: "menuiserie",
  hvac: "chauffage-ventilation",
  carpentry: "charpente",
  waterproofing: "etancheite",
  cladding: "bardage",
  facade: "facade",
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
