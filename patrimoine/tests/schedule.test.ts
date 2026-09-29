import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSchedule, loanFieldsFromSchedule, syncFromSchedules } from "../src/lib/schedule";
import { resolveLoan, yearlyBalances } from "../src/lib/engine/loan";
import { project } from "../src/lib/engine/projection";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData } from "../src/lib/types";
import type { Loan, LoanScheduleRow } from "../src/lib/types";

// Tableau « banque » : 200 000 € à 3,2 % sur 20 ans, première échéance en février 2020,
// avec un palier (échéance majorée les 12 premiers mois) pour vérifier qu'il est suivi à la lettre.
function bankTable(): LoanScheduleRow[] {
  const rows: LoanScheduleRow[] = [];
  let b = 200_000;
  const r = 0.032 / 12;
  for (let i = 0; i < 240; i++) {
    const y = 2020 + Math.floor((i + 1) / 12);
    const m = ((i + 1) % 12) + 1;
    const interest = Math.round(b * r * 100) / 100;
    const n = 240 - i;
    const base = i < 12 ? 1500 : Math.round(((b * r) / (1 - Math.pow(1 + r, -n))) * 100) / 100;
    let principal = Math.round((base - interest) * 100) / 100;
    if (i === 239) principal = b;
    b = Math.round((b - principal) * 100) / 100;
    rows.push({ month: `${y}-${String(m).padStart(2, "0")}`, payment: Math.round((principal + interest) * 100) / 100, interest, principal, insurance: 25, balance: Math.max(0, b) });
  }
  return rows;
}

test("tableau d'amortissement : contrôles et champs du crédit", () => {
  const rows = bankTable();
  const c = checkSchedule(rows);
  assert.equal(c.count, 240);
  assert.equal(c.initialAmount, 200_000);
  assert.deepEqual(c.issues, []);
  const f = loanFieldsFromSchedule(rows);
  assert.equal(f.initialAmount, 200_000);
  assert.equal(f.startDate, "2020-01-01");
  assert.equal(f.endDate, "2040-01-01");
  assert.equal(f.durationMonths, 240);
  assert.equal(f.insuranceMonthly, 25);
  assert.ok(Math.abs((f.ratePct ?? 0) - 3.2) < 0.01);
  const broken = rows.map((r, i) => (i === 50 ? { ...r, balance: r.balance + 1000 } : r));
  assert.ok(checkSchedule(broken).issues.some((x) => x.includes("capital restant")));
});

test("le moteur suit le tableau de la banque au centime", () => {
  const rows = bankTable();
  const loan: Loan = { id: "l", schedule: { rows, importedAt: "2026-09-29", source: "ia" }, remaining: 999_999 };
  const now = monthIndex(2026, 10);
  const r = resolveLoan(loan, now);
  const lastPast = rows.filter((x) => x.month < "2026-10").pop()!;
  assert.equal(r.balance, lastPast.balance, "capital restant dû lu dans le tableau, la saisie manuelle est ignorée");
  assert.equal(r.quality, "complete");
  assert.equal(r.insurance, 25);
  const years = yearlyBalances(r, now, 5);
  const dec2027 = rows.find((x) => x.month === "2027-12")!;
  assert.equal(Math.round(years.find((y) => y.year === 2027)!.balance * 100) / 100, dec2027.balance);
  // Projection complète : dette au 31/12/2028 = ligne de décembre 2028 du tableau.
  const d = emptyData();
  d.loans = [loan];
  const p = project(d, now);
  const dec2028 = rows.find((x) => x.month === "2028-12")!;
  assert.ok(Math.abs(p.years.find((y) => y.year === 2028)!.debt - dec2028.balance) < 0.01);
  // Crédit terminé après la dernière ligne.
  assert.equal(resolveLoan(loan, monthIndex(2040, 3)).finished, true);
});

test("remboursement anticipé : le tableau cède la place au calcul", () => {
  const rows = bankTable();
  const d = emptyData();
  d.loans = [{ id: "l", schedule: { rows, importedAt: "2026-09-29", source: "ia" } }];
  d.plans = [{ id: "a", type: "prepayment", loanId: "l", year: 2027, amount: 50_000, mode: "duree" }];
  const p = project(d, monthIndex(2026, 10));
  const dec2028 = rows.find((x) => x.month === "2028-12")!;
  assert.ok(p.years.find((y) => y.year === 2028)!.debt < dec2028.balance - 40_000);
});

test("fiches tenues à jour depuis les tableaux déjà enregistrés (rétroactif)", () => {
  const rows = bankTable();
  const d = emptyData();
  d.buildings = [{ id: "b", name: "Immeuble" }, { id: "b2", name: "Autre", acquisitionDate: "2015-06-01" }];
  d.loans = [
    { id: "l", buildingId: "b", schedule: { rows, importedAt: "2026-01-10", source: "ia" }, remaining: 150_000, remainingDate: "2024-01-01", ratePct: 4 },
    { id: "l2", buildingId: "b2", schedule: { rows, importedAt: "2026-01-10", source: "ia" } },
    { id: "sans", remaining: 1000 },
  ];
  const now = monthIndex(2026, 10);
  const { loans, buildings } = syncFromSchedules(d, now);
  const l = loans.find((x) => x.id === "l")!;
  assert.equal(l.remaining, rows.filter((x) => x.month < "2026-10").pop()!.balance);
  assert.equal(l.remainingDate, "2026-10-01");
  assert.equal(l.initialAmount, 200_000);
  assert.ok(Math.abs(l.ratePct! - 3.2) < 0.01);
  assert.ok(!loans.some((x) => x.id === "sans"));
  assert.deepEqual(buildings.map((b) => [b.id, b.acquisitionDate]), [["b", "2020-01-01"]], "date d'acquisition remplie seulement si vide");
  // Une fois à jour, plus rien à faire ; le mois suivant, le capital restant avance.
  d.loans = d.loans.map((x) => loans.find((y) => y.id === x.id) ?? x);
  d.buildings = d.buildings.map((x) => buildings.find((y) => y.id === x.id) ?? x);
  assert.deepEqual(syncFromSchedules(d, now), { loans: [], buildings: [] });
  const next = syncFromSchedules(d, now + 1).loans.find((x) => x.id === "l")!;
  assert.equal(next.remainingDate, "2026-11-01");
  assert.ok(next.remaining! < l.remaining!);
});
