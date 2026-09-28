import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData } from "../src/lib/types";
import { monthIndex } from "../src/lib/engine/dates";
import { project } from "../src/lib/engine/projection";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { saleLabel, salePrice, saleShares } from "../src/lib/engine/sale";

const NOW = monthIndex(2026, 9);
const close = (a: number | undefined, b: number, tol = 1, what = "") => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${what} ${a} ≠ ${b}`);

function data(): AppData {
  const d = emptyData();
  d.companies.push({ id: "c", name: "SCI", kind: "SCI" });
  d.buildings.push({ id: "b", name: "Immeuble", companyId: "c", value: 1_000_000, propertyTax: 6000 });
  for (let i = 1; i <= 4; i++) d.units.push({ id: `u${i}`, buildingId: "b", name: `Lot ${i}`, rent: 500 * i, status: i === 4 ? "vacant" : "occupe" });
  d.loans.push({ id: "l", buildingId: "b", initialAmount: 600_000, ratePct: 3, durationMonths: 240, startDate: "2022-01-10" });
  return d;
}

test("vente : quote-parts d'un lot (loyers, valeur, charges, dette)", () => {
  const d = data();
  const s = saleShares(d.buildings[0], d.units, ["u2", "u4"]);
  assert.equal(s.whole, false);
  // Loyers perdus : lots loués seulement (le lot 4 est vacant).
  assert.equal(s.rent, 1000);
  // Quote-part sur les loyers potentiels : (1000 + 2000) / 5000.
  close(s.share, 0.6, 1e-9);
  close(s.value, 600_000, 1e-6);
  // Tous les lots choisis = vente en bloc.
  assert.equal(saleShares(d.buildings[0], d.units, ["u1", "u2", "u3", "u4"]).whole, true);
  assert.equal(salePrice({ id: "a", type: "sale", buildingId: "b", year: 2027, lots: [{ unitId: "u1", price: 200000 }, { unitId: "u2" }] }), undefined);
  assert.equal(salePrice({ id: "a", type: "sale", buildingId: "b", year: 2027, lots: [{ unitId: "u1", price: 200000 }, { unitId: "u2", price: 250000 }] }), 450000);
  assert.equal(saleLabel(d, { id: "a", type: "sale", buildingId: "b", year: 2027, lots: [{ unitId: "u1" }] }), "Immeuble — Lot 1");
});

test("vente partielle dans la projection : loyers, dette et mensualité réduits, trésorerie", () => {
  const d = data();
  const before = project(d, NOW);
  d.plans.push({ id: "v", type: "sale", buildingId: "b", year: 2027, date: "2027-06-15", lots: [{ unitId: "u1", price: 180_000 }], fees: 5000 });
  const p = project(d, NOW);
  const sale = p.sales[0];
  assert.deepEqual(sale.unitIds, ["u1"]);
  assert.equal(sale.month, monthIndex(2027, 6));
  const share = 500 / 5000;
  // Balance du crédit au mois de la vente, sans vente.
  const snapDebt = before.years.find((r) => r.year === 2027)!.debt;
  assert.ok(sale.debtRepaid > 0 && sale.debtRepaid < snapDebt * share * 1.05, `${sale.debtRepaid}`);
  close(sale.netCash, 180_000 - 5000 - sale.debtRepaid, 0.01, "net");
  close(sale.rentLostMonthly, 500, 0.01, "loyer perdu");
  assert.ok(sale.paymentsRemovedMonthly > 0);
  // L'immeuble reste : loyers 2028 = loyers 2026 − 500 €/mois (sans indexation).
  const r26 = before.years.find((r) => r.year === 2028)!;
  const r28 = p.years.find((r) => r.year === 2028)!;
  close(r26.rent - r28.rent, 500 * 12, 1, "loyers annuels");
  close(r26.charges - r28.charges, 6000 * share, 1, "charges");
  assert.ok(r28.payments < r26.payments);
  // Dette fin 2027 réduite d'environ la quote-part.
  const d27 = p.years.find((r) => r.year === 2027)!.debt;
  close(snapDebt - d27, sale.debtRepaid, 2000, "dette");
  // Un événement « Vente » dans la chronologie.
  assert.ok(p.events.some((e) => e.kind === "sale" && e.label.includes("Lot 1")));
  // Aujourd'hui, rien ne change.
  assert.equal(computeSnapshot(d, NOW).total.rentMonthly, before.snapshot.total.rentMonthly);
});

test("vente partielle : remboursement saisi, puis vente du reste", () => {
  const d = data();
  d.plans.push(
    { id: "v1", type: "sale", buildingId: "b", year: 2027, lots: [{ unitId: "u1", price: 180_000 }], debtRepaid: 100_000 },
    { id: "v2", type: "sale", buildingId: "b", year: 2028, price: 850_000 },
  );
  const p = project(d, NOW);
  close(p.sales[0].debtRepaid, 100_000, 0.01);
  // Deuxième vente : tout le reste, la dette restante est soldée, plus aucun loyer.
  assert.equal(p.sales[1].unitIds, undefined);
  const r29 = p.years.find((r) => r.year === 2029)!;
  assert.equal(r29.rent, 0);
  assert.equal(r29.debt, 0);
});

test("vente : reprise dans le dossier banque (groupe et société seule)", async () => {
  const { groupModel } = await import("../src/lib/pdf/model");
  const { companySubset } = await import("../src/lib/engine/subset");
  const d = data();
  d.plans.push({ id: "v", type: "sale", buildingId: "b", year: 2027, date: "2027-03-01", lots: [{ unitId: "u2", price: 250_000 }], underOffer: true });
  const m = groupModel(d, project(d, NOW), "Groupe");
  assert.equal(m.sales.length, 1);
  assert.equal(m.sales[0].label, "Immeuble — Lot 2");
  assert.equal(m.sales[0].price, 250_000);
  assert.equal(m.sales[0].underOffer, true);
  const sub = companySubset(d, "c");
  assert.equal(groupModel(sub, project(sub, NOW), "SCI").sales.length, 1);
});

test("lots fixes : tri numérique et note « Lot N selon le bail »", async () => {
  const { sortedUnits, cleanLotNote } = await import("../src/lib/move-tenant");
  const u = (name: string) => ({ id: name, buildingId: "b", name });
  assert.deepEqual(sortedUnits([u("Lot 10 · maisonnette"), u("Lot 2"), u("Lot 1 · PMR"), u("Local commercial")]).map((x) => x.name), ["Local commercial", "Lot 1 · PMR", "Lot 2", "Lot 10 · maisonnette"]);
  const t = { id: "t", unitId: "x", status: "actif" as const, tenants: [], notes: "Lot 6 selon le bail. Loyer en vigueur depuis le 01/02/2026." };
  assert.equal(cleanLotNote(t, "Lot 6 R+2 droit").notes, "Loyer en vigueur depuis le 01/02/2026.");
  assert.equal(cleanLotNote(t, "Lot 5").notes, t.notes);
});
