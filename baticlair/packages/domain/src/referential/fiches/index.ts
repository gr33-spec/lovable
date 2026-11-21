import { WITHOUT_SUPPLY_UNITS } from "../../takeoff/supply.js";
import type { Referential } from "../model.js";
import { fautesDeFiche, parseFicheMetier, type FicheMetier } from "./fiche.js";
import { FICHES_SOURCES } from "./sources.generated.js";

export * from "./fiche.js";

/**
 * Le registre des fiches métier, lu au build (`scripts/gen-fiches.mjs`) : ajouter un métier = ajouter un fichier dans
 * `referentiels/metiers/`. Une fiche fautive n'est jamais chargée en silence : le test `fiches-metier.test.ts` la refuse.
 */
export const FICHES: readonly FicheMetier[] = FICHES_SOURCES.map((s) => parseFicheMetier(s.texte, s.fichier));

/** La fiche d'un métier (son identifiant BatiClair), ou null. */
export function ficheDuMetier(metier: string | null | undefined): FicheMetier | null {
  if (!metier) return null;
  return FICHES.find((f) => f.metier === metier) ?? null;
}

/** La fiche qui CALCULE ce métier (moteur « fiche », sans faute), ou null : le métier garde alors son tiroir. */
export function ficheDeCalcul(metier: string | null | undefined): FicheMetier | null {
  const f = ficheDuMetier(metier);
  return f && f.moteur === "fiche" && fautesDeFiche(f).length === 0 ? f : null;
}

const cache = new Map<string, Referential>();

/**
 * Le référentiel d'un métier calculé par sa fiche : aucun ouvrage du moteur générique (toutes les lignes passent par la
 * fiche), la version de la fiche (figée avec chaque chantier), et les unités qui ne sont jamais une fourniture.
 */
export function referentielDeFiche(f: FicheMetier): Referential {
  const id = `fiche-${f.code}`;
  const deja = cache.get(id);
  if (deja && deja.version === `${id}-${f.version}`) return deja;
  const ref: Referential = {
    id,
    version: `${id}-${f.version}`,
    trade: f.metier,
    sources: f.sources.map((s) => ({ id: s.id, kind: "baticlair_rule", title: s.texte, retrievedAt: f.version })),
    families: [],
    products: [],
    workItems: [],
    wasteRules: [],
    withoutSupplyUnits: [...WITHOUT_SUPPLY_UNITS],
  };
  cache.set(id, ref);
  return ref;
}
