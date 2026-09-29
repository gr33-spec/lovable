import type { AppData, Tenancy, Unit } from "./types";
import { activeTenancy, tenantsName } from "./tenancy";

// Numérotation des lots : la liste est toujours dans l'ordre des numéros ;
// corriger un numéro ne touche ni au logement ni à son locataire.

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** Ordre des lots : numérique (Lot 2 avant Lot 10), puis par nom. */
export function byLot(a: Unit, b: Unit): number {
  return collator.compare(a.name.trim(), b.name.trim());
}

export function sortedUnits(units: Unit[]): Unit[] {
  return [...units].sort(byLot);
}

const LOT = /^(\s*lot\s*)(\d+)/i;

/** Retire la note « Lot N selon le bail. » devenue inutile quand le locataire est dans le lot N. */
export function cleanLotNote(t: Tenancy, name: string): Tenancy {
  const n = LOT.exec(name)?.[2];
  if (!n || !t.notes) return t;
  const notes = t.notes.replace(new RegExp(`\\s*Lot ${n} selon le bail(?: \\([^)]*\\))?\\.\\s*`, "i"), " ").trim();
  return notes === t.notes ? t : { ...t, notes: notes || undefined };
}

/** Nouveaux noms : seuls les numéros « Lot N » sont échangés ; sinon les noms entiers. */
export function swappedNames(a: Unit, b: Unit): [string, string] {
  const ma = LOT.exec(a.name);
  const mb = LOT.exec(b.name);
  if (ma && mb) return [a.name.replace(LOT, `$1${mb[2]}`), b.name.replace(LOT, `$1${ma[2]}`)];
  return [b.name, a.name];
}

/** Nom affiché du locataire d'un lot (vide si le lot est libre). */
export function tenantLabel(data: AppData, u: Unit): string {
  if (u.status === "vacant") return "";
  return tenantsName(activeTenancy(data, u.id)) || [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" ");
}

export type RenumberChange = { coll: "units"; item: Unit } | { coll: "tenancies"; item: Tenancy };

/**
 * Corrige une erreur de numérotation : le lot `from` prend le numéro de `to`
 * et inversement. Seul le numéro change ; logement, locataire, bail, loyer,
 * encaissements et documents restent ensemble. La liste, triée par numéro,
 * remet ensuite chaque lot à sa place.
 */
export function renumber(data: AppData, from: Unit, to: Unit): RenumberChange[] {
  if (from.id === to.id) return [];
  const [na, nb] = swappedNames(from, to);
  const changes: RenumberChange[] = [
    { coll: "units", item: { ...from, name: na } },
    { coll: "units", item: { ...to, name: nb } },
  ];
  for (const t of data.tenancies) {
    if (t.unitId !== from.id && t.unitId !== to.id) continue;
    const next = cleanLotNote(t, t.unitId === from.id ? na : nb);
    if (next !== t) changes.push({ coll: "tenancies", item: next });
  }
  return changes;
}
