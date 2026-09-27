import { test } from "node:test";
import assert from "node:assert/strict";
import { annuityPayment, resolveLoan } from "../src/lib/engine/loan";
import { monthIndex } from "../src/lib/engine/dates";
import { project, rowForYear } from "../src/lib/engine/projection";
import { computeSnapshot, cashflowMonthly } from "../src/lib/engine/snapshot";
import { emptyData, type AppData } from "../src/lib/types";

const NOW = monthIndex(2026, 9);
const close = (a: number, b: number, tol: number) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test("mensualité d'annuité classique", () => {
  close(annuityPayment(300000, 0.036 / 12, 240), 1755.33, 0.01);
  close(annuityPayment(120000, 0, 120), 1000, 1e-9);
});

test("crédit complet : capital restant dû calculé à aujourd'hui", () => {
  const r = resolveLoan(
    { id: "l", initialAmount: 300000, ratePct: 3.6, startDate: "2020-01-15", durationMonths: 240 },
    NOW,
  );
  assert.equal(r.quality, "complete");
  close(r.payment!, 1755.33, 0.01);
  assert.equal(r.endMonth, monthIndex(2040, 1));
  // 79 échéances payées (févr. 2020 → sept. 2026 exclu).
  const i = 0.003;
  const expected = 300000 * Math.pow(1 + i, 79) - r.payment! * ((Math.pow(1 + i, 79) - 1) / i);
  close(r.balance!, expected, 1);
});

test("mode simple : CRD + mensualité + date de fin → taux déduit", () => {
  const full = resolveLoan(
    { id: "l", initialAmount: 300000, ratePct: 3.6, startDate: "2020-01-15", durationMonths: 240 },
    NOW,
  );
  const simple = resolveLoan(
    { id: "s", remaining: full.balance, monthlyPayment: full.payment, endDate: "2040-01-01" },
    NOW,
  );
  close(simple.impliedRatePct!, 3.6, 0.01);
});

test("projection : le crédit s'éteint à sa date de fin et libère la mensualité", () => {
  const data: AppData = {
    ...emptyData(),
    companies: [{ id: "c", name: "SCI TEST", kind: "SCI" }],
    buildings: [{ id: "b", name: "Immeuble", companyId: "c", value: 700000, rentMonthly: 4000, propertyTax: 3600 }],
    loans: [{ id: "l", buildingId: "b", remaining: 100000, monthlyPayment: 2000, endDate: "2031-06-01" }],
  };
  const snap = computeSnapshot(data, NOW);
  close(snap.total.value, 700000, 0);
  close(snap.total.debt, 100000, 0);
  close(cashflowMonthly(snap.total), 4000 - 300 - 2000, 1e-6);

  const p = project(data, NOW);
  const end = p.events.find((e) => e.kind === "loan_end");
  assert.ok(end);
  assert.equal(end.year, 2031);
  close(end.monthlyFreed!, 2000, 1);
  assert.equal(rowForYear(p, 2031)!.debt, 0);
  close(rowForYear(p, 2033)!.cashflow, (4000 - 300) * 12, 1);
  assert.ok(rowForYear(p, 2030)!.debt > 0);
});

test("CRD + mensualité sans date de fin : fin estimée et signalée", () => {
  const r = resolveLoan({ id: "x", remaining: 24000, monthlyPayment: 1000 }, NOW);
  assert.equal(r.quality, "estimated");
  assert.equal(r.endMonth, NOW + 23);
});

test("sans capital restant dû : dette inconnue, jamais inventée", () => {
  const data: AppData = {
    ...emptyData(),
    buildings: [{ id: "b", name: "Sans valeur" }],
    loans: [{ id: "l", buildingId: "b", monthlyPayment: 800, endDate: "2030-01-01" }],
  };
  const snap = computeSnapshot(data, NOW);
  assert.equal(snap.total.unvalued, 1);
  assert.equal(snap.total.unknownDebt, 1);
  assert.equal(snap.total.debt, 0);
  close(snap.total.paymentsMonthly, 800, 0);
});

test("simulation de vente : dette remboursée, trésorerie dégagée", () => {
  const data: AppData = {
    ...emptyData(),
    companies: [{ id: "c", name: "SCI", kind: "SCI", cash: 10000 }],
    buildings: [{ id: "b", name: "Paimpol", companyId: "c", value: 700000, rentMonthly: 5000 }],
    loans: [{ id: "l", buildingId: "b", remaining: 350000, ratePct: 3, endDate: "2040-12-01" }],
  };
  const base = project(data, NOW);
  const sim = project(data, NOW, {
    scenarioActions: [{ id: "s1", type: "sale", buildingId: "b", year: 2030, price: 900000, fees: 20000 }],
  });
  const sale = sim.sales[0];
  assert.ok(sale);
  const debt2029 = rowForYear(base, 2029)!.debt;
  close(sale.debtRepaid, debt2029, 1);
  close(sale.netCash!, 900000 - 20000 - debt2029, 1);
  close(sale.rentLostMonthly, 5000, 1e-6);
  assert.equal(rowForYear(sim, 2030)!.debt, 0);
  assert.equal(rowForYear(sim, 2030)!.value, 0);
  assert.equal(rowForYear(sim, 2030)!.rent, 0);
  assert.ok(rowForYear(sim, 2030)!.treasury > rowForYear(base, 2030)!.treasury);
});

test("remboursement anticipé : fin avancée", () => {
  const data: AppData = {
    ...emptyData(),
    buildings: [{ id: "b", name: "B", value: 100000 }],
    loans: [{ id: "l", buildingId: "b", remaining: 100000, ratePct: 2, endDate: "2041-12-01" }],
  };
  const base = project(data, NOW);
  const sim = project(data, NOW, {
    scenarioActions: [{ id: "p", type: "prepayment", loanId: "l", year: 2028, amount: 50000, mode: "duree" }],
  });
  const endBase = base.events.find((e) => e.kind === "loan_end")!.year;
  const endSim = sim.events.find((e) => e.kind === "loan_end")!.year;
  assert.equal(endBase, 2041);
  assert.ok(endSim < endBase);
});

test("indicateurs : DSCR, occupation et ratios de bilan", async () => {
  const { portfolioIndicators, statementRatios } = await import("../src/lib/engine/indicators");
  const data: AppData = {
    ...emptyData(),
    buildings: [{ id: "b", name: "B", value: 1000000, propertyTax: 12000 }],
    units: [
      { id: "u1", buildingId: "b", name: "1", rent: 3000, status: "occupe" },
      { id: "u2", buildingId: "b", name: "2", rent: 1000, status: "vacant" },
    ],
    loans: [{ id: "l", buildingId: "b", remaining: 200000, monthlyPayment: 2000, ratePct: 3, endDate: "2036-09-01" }],
  };
  const ind = portfolioIndicators(data, project(data, NOW));
  const get = (id: string) => ind.find((i) => i.id === id)!.value!;
  close(get("dscr"), (36000 - 12000) / 24000, 1e-9);
  close(get("occupancy"), 50, 1e-9);
  close(get("vacancy-loss"), 25, 1e-9);
  close(get("gross-yield"), 3.6, 1e-9);
  close(get("avg-rate"), 3, 1e-9);
  const r = statementRatios({ operatingResult: 50000, depreciation: 20000, netResult: 30000, financialCharges: 10000, bankDebt: 400000, equity: 100000 });
  close(r.ebe!, 70000, 0);
  close(r.caf!, 50000, 0);
  close(r.gearing!, 4, 1e-9);
  close(r.debtToCaf!, 8, 1e-9);
  close(r.interestCoverage!, 7, 1e-9);
});
