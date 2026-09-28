import { test } from "node:test";
import assert from "node:assert/strict";
import { moveTenant } from "../src/lib/move-tenant";
import { emptyData } from "../src/lib/types";
import type { AppData, Unit } from "../src/lib/types";

const lot = (id: string, name: string, extra: Partial<Unit> = {}): Unit => ({ id, buildingId: "b", name, surface: Number(id.slice(1)) * 10, value: 1000, ...extra });

function data(units: Unit[]): AppData {
  const d = emptyData();
  d.units = units;
  d.tenancies = [
    { id: "t1", unitId: "u1", status: "actif", tenants: [{ firstName: "Jean", lastName: "Martin" }], rent: 500, notes: "Lot 10 selon le bail." },
    { id: "old", unitId: "u1", status: "clos", tenants: [] },
  ];
  d.inspections = [{ id: "i1", tenancyId: "t1", unitId: "u1", kind: "entree" } as AppData["inspections"][number]];
  return d;
}

const apply = (d: AppData, changes: ReturnType<typeof moveTenant>["changes"]) => {
  const next = structuredClone(d);
  for (const c of changes) {
    const list = next[c.coll] as { id: string }[];
    list[list.findIndex((x) => x.id === c.item.id)] = c.item;
  }
  return next;
};

test("déplacement vers un lot libre : le lot reste fixe, seul le locataire bouge", () => {
  const u1 = lot("u1", "Lot 1 · PMR", { status: "occupe", tenantFirstName: "Jean", tenantLastName: "Martin", rent: 500, charges: 30, payments: { "2026-09": { status: "paye" } } });
  const u10 = lot("u10", "Lot 10 · maisonnette", { status: "vacant" });
  const d = data([u1, u10]);
  const { changes, swap } = moveTenant(d, u1, u10);
  assert.equal(swap, false);
  const n = apply(d, changes);
  const [a, b] = [n.units.find((u) => u.id === "u1")!, n.units.find((u) => u.id === "u10")!];
  assert.equal(a.name, "Lot 1 · PMR");
  assert.equal(b.name, "Lot 10 · maisonnette");
  assert.equal(a.surface, 10);
  assert.equal(b.surface, 100);
  assert.equal(a.status, "vacant");
  assert.equal(a.tenantLastName, undefined);
  assert.equal(a.payments, undefined);
  assert.equal(b.status, "occupe");
  assert.equal(b.tenantLastName, "Martin");
  assert.equal(b.rent, 500);
  assert.deepEqual(b.payments, { "2026-09": { status: "paye" } });
  const t1 = n.tenancies.find((t) => t.id === "t1")!;
  assert.equal(t1.unitId, "u10");
  assert.equal(t1.notes, undefined);
  assert.equal(n.tenancies.find((t) => t.id === "old")!.unitId, "u1");
  assert.equal(n.inspections[0].unitId, "u10");
  assert.deepEqual(n.units.map((u) => u.id), ["u1", "u10"]);
});

test("déplacement vers un lot occupé : les deux locataires sont échangés", () => {
  const u1 = lot("u1", "Lot 1", { status: "occupe", tenantLastName: "Martin", rent: 500 });
  const u10 = lot("u10", "Lot 10", { status: "occupe", tenantLastName: "Durand", rent: 700 });
  const d = data([u1, u10]);
  d.tenancies.push({ id: "t2", unitId: "u10", status: "actif", tenants: [{ lastName: "Durand" }] });
  const { changes, swap } = moveTenant(d, u1, u10);
  assert.equal(swap, true);
  const n = apply(d, changes);
  const [a, b] = [n.units.find((u) => u.id === "u1")!, n.units.find((u) => u.id === "u10")!];
  assert.equal(a.name, "Lot 1");
  assert.equal(a.tenantLastName, "Durand");
  assert.equal(a.rent, 700);
  assert.equal(b.name, "Lot 10");
  assert.equal(b.tenantLastName, "Martin");
  assert.equal(b.rent, 500);
  assert.equal(n.tenancies.find((t) => t.id === "t1")!.unitId, "u10");
  assert.equal(n.tenancies.find((t) => t.id === "t2")!.unitId, "u1");
});
