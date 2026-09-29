import type { AppData, Building, Unit } from "./types";

// Fil d'Ariane : où se trouve l'écran dans la hiérarchie
// (Patrimoine › Société › Immeuble › Lot, ou Gestion › Locataires › Immeuble).

export interface Crumb {
  label: string;
  href?: string;
}

/** Patrimoine › holding › … › société (chaîne des sociétés mères comprises). */
export function companyCrumbs(data: AppData, companyId: string | null | undefined, includeSelf = true): Crumb[] {
  const chain: Crumb[] = [];
  const seen = new Set<string>();
  let c = data.companies.find((x) => x.id === companyId);
  if (c && !includeSelf) c = data.companies.find((x) => x.id === c!.parentId);
  while (c && !seen.has(c.id)) {
    seen.add(c.id);
    chain.unshift({ label: c.name, href: `/patrimoine/societe/${c.id}` });
    c = data.companies.find((x) => x.id === c!.parentId);
  }
  return [{ label: "Patrimoine", href: "/patrimoine" }, ...chain];
}

export function buildingCrumbs(data: AppData, b: Building | undefined, includeSelf = true): Crumb[] {
  const base = companyCrumbs(data, b?.companyId);
  return b && includeSelf ? [...base, { label: b.name, href: `/patrimoine/immeuble/${b.id}` }] : base;
}

/**
 * Parents d'un lot. Dans la gestion locative, la hiérarchie est celle de
 * l'onglet Locataires (l'espace d'Enora n'a pas accès aux fiches du patrimoine).
 */
export function unitCrumbs(data: AppData, unit: Unit, gestion: boolean, includeSelf = false): Crumb[] {
  const b = data.buildings.find((x) => x.id === unit.buildingId);
  const self = includeSelf ? [{ label: unit.name, href: `/patrimoine/logement/${unit.id}` }] : [];
  if (gestion) return [{ label: "Locataires", href: "/gestion?vue=locataires" }, ...(b ? [{ label: b.name }] : []), ...self];
  return [...buildingCrumbs(data, b), ...self];
}
