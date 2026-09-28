import type { Tenancy, Unit } from "./types";

// Correction de numérotation : on échange le numéro de deux lots, tout le
// reste (locataire, bail, loyers, documents) reste attaché au logement.

const LOT = /^(\s*lot\s*)(\d+)/i;

/** Nouveaux noms : seuls les numéros « Lot N » sont échangés ; sinon les noms entiers. */
export function swappedNames(a: Unit, b: Unit): [string, string] {
  const ma = LOT.exec(a.name);
  const mb = LOT.exec(b.name);
  if (ma && mb) return [a.name.replace(LOT, `$1${mb[2]}`), b.name.replace(LOT, `$1${ma[2]}`)];
  return [b.name, a.name];
}

/** Retire la note « Lot N selon le bail. » devenue inutile quand le logement porte ce numéro. */
export function cleanLotNote(t: Tenancy, name: string): Tenancy {
  const n = LOT.exec(name)?.[2];
  if (!n || !t.notes) return t;
  const notes = t.notes.replace(new RegExp(`\\s*Lot ${n} selon le bail(?: \\([^)]*\\))?\\.\\s*`, "i"), " ").trim();
  return notes === t.notes ? t : { ...t, notes: notes || undefined };
}
