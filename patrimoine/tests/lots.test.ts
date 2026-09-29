import { test } from "node:test";
import assert from "node:assert/strict";
import { renumber, sortedUnits } from "../src/lib/lots";
import { emptyData } from "../src/lib/types";
import type { Unit } from "../src/lib/types";

test("correction de numéro : seul le numéro change, le lot garde tout le reste", () => {
  const maison: Unit = { id: "m", buildingId: "b", name: "Lot 1 · maisonnette T3", type: "T3", surface: 70, status: "occupe", tenantLastName: "X", rent: 600, payments: { "2026-09": { status: "paye" } } };
  const pmr: Unit = { id: "p", buildingId: "b", name: "Lot 10 · PMR", status: "occupe", tenantLastName: "Y", rent: 500 };
  const lot2: Unit = { id: "l2", buildingId: "b", name: "Lot 2", status: "vacant" };
  const d = emptyData();
  d.units = [maison, lot2, pmr];
  d.tenancies = [{ id: "t", unitId: "m", status: "actif", tenants: [{ lastName: "X" }], notes: "Lot 10 selon le bail." }];
  const changes = renumber(d, maison, pmr);
  const m = changes.find((c) => c.item.id === "m")!.item as Unit;
  const p = changes.find((c) => c.item.id === "p")!.item as Unit;
  assert.equal(m.name, "Lot 10 · maisonnette T3");
  assert.equal(p.name, "Lot 1 · PMR");
  assert.deepEqual({ ...m, name: maison.name }, maison);
  assert.deepEqual({ ...p, name: pmr.name }, pmr);
  const t = changes.find((c) => c.coll === "tenancies")!.item;
  assert.equal(t.unitId, "m");
  assert.equal((t as { notes?: string }).notes, undefined);
  // La liste reste dans l'ordre des numéros : la maison passe en dernier.
  assert.deepEqual(sortedUnits([m, lot2, p]).map((u) => u.name), ["Lot 1 · PMR", "Lot 2", "Lot 10 · maisonnette T3"]);
});
