import { lireBase, lireCarte, type BaseMetier, type CarteRegions } from "./base.js";
import { BASES_SOURCES } from "./sources.generated.js";

export * from "./base.js";

const cache = new Map<string, { base: BaseMetier; carte: CarteRegions | null }>();

/** Les métiers qui ont une base de référence (`referentiels/<métier>/fiche-<métier>.json`). */
export const BASES_METIER: readonly string[] = BASES_SOURCES.map((b) => b.metier);

/** La base de référence d'un métier (« couverture »), lue et vérifiée une fois, ou null s'il n'en a pas. */
export function baseDuMetier(metier: string): { base: BaseMetier; carte: CarteRegions | null } | null {
  const deja = cache.get(metier);
  if (deja) return deja;
  const src = BASES_SOURCES.find((b) => b.metier === metier);
  if (!src) return null;
  const lue = { base: lireBase(src.fiche), carte: src.carte ? lireCarte(src.carte) : null };
  cache.set(metier, lue);
  return lue;
}
