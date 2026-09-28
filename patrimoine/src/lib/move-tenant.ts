import type { AppData, Inspection, Tenancy, Unit } from "./types";
import { activeTenancy, tenantsName } from "./tenancy";

// Les lots sont des logements fixes : leur numéro, leur description et leur
// ordre ne changent jamais. Seul le locataire (bail, loyer, encaissements,
// garants, documents) passe d'un lot à l'autre. Lot occupé = échange.

/** Champs du lot qui décrivent l'occupation (ils suivent le locataire). */
export const OCCUPANCY_FIELDS = [
  "status",
  "tenantFirstName",
  "tenantLastName",
  "entryDate",
  "rent",
  "charges",
  "leaseType",
  "leaseStart",
  "leaseDurationYears",
  "leaseEnd",
  "revision",
  "indexLabel",
  "indexValue",
  "lastRevisionDate",
  "rentHistory",
  "payments",
] as const satisfies readonly (keyof Unit)[];

type Occupancy = Pick<Unit, (typeof OCCUPANCY_FIELDS)[number]>;

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

/** Baux qui suivent le locataire (les dossiers clos restent l'historique du lot). */
function movingTenancies(data: AppData, unitId: string): Tenancy[] {
  return data.tenancies.filter((t) => t.unitId === unitId && t.status !== "clos");
}

/** Nom affiché du locataire d'un lot (vide si le lot est libre). */
export function tenantLabel(data: AppData, u: Unit): string {
  if (u.status === "vacant") return "";
  return tenantsName(activeTenancy(data, u.id) ?? movingTenancies(data, u.id)[0]) || [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" ");
}

/** Un locataire à déplacer est-il rattaché à ce lot ? */
export function hasTenant(data: AppData, u: Unit): boolean {
  if (u.status === "vacant") return false;
  return !!tenantLabel(data, u) || u.status === "occupe" || movingTenancies(data, u.id).length > 0;
}

function occupancy(u: Unit): Occupancy {
  const o: Record<string, unknown> = {};
  for (const k of OCCUPANCY_FIELDS) o[k] = u[k];
  return o as Occupancy;
}

function withOccupancy(u: Unit, o: Occupancy): Unit {
  const next: Record<string, unknown> = { ...u };
  for (const k of OCCUPANCY_FIELDS) {
    if (o[k] === undefined) delete next[k];
    else next[k] = o[k];
  }
  return next as unknown as Unit;
}

export type MoveChange = { coll: "units"; item: Unit } | { coll: "tenancies"; item: Tenancy } | { coll: "inspections"; item: Inspection };

/**
 * Déplace le locataire du lot `from` vers le lot `to`. Si `to` est occupé, les
 * deux locataires sont échangés ; sinon `from` devient vacant. Les lots gardent
 * leur identité (id, nom, description, surface, valeur…).
 */
export function moveTenant(data: AppData, from: Unit, to: Unit): { changes: MoveChange[]; swap: boolean } {
  if (from.id === to.id) return { changes: [], swap: false };
  const swap = hasTenant(data, to);
  const fromOcc = occupancy(from);
  const toOcc: Occupancy = swap ? occupancy(to) : { ...occupancy(to), status: "vacant", tenantFirstName: undefined, tenantLastName: undefined, entryDate: undefined };
  const changes: MoveChange[] = [
    { coll: "units", item: withOccupancy(from, toOcc) },
    { coll: "units", item: withOccupancy(to, fromOcc) },
  ];
  const moved = new Map<string, string>();
  const relink = (t: Tenancy, target: Unit) => {
    moved.set(t.id, target.id);
    changes.push({ coll: "tenancies", item: cleanLotNote({ ...t, unitId: target.id }, target.name) });
  };
  movingTenancies(data, from.id).forEach((t) => relink(t, to));
  if (swap) movingTenancies(data, to.id).forEach((t) => relink(t, from));
  for (const i of data.inspections) {
    const target = moved.get(i.tenancyId);
    if (target && i.unitId !== target) changes.push({ coll: "inspections", item: { ...i, unitId: target } });
  }
  return { changes, swap };
}
