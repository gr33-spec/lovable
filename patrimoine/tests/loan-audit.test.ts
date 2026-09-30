import { test } from "node:test";
import assert from "node:assert/strict";
import { loanFieldsFromSchedule, reliableInitial, scheduleStart, syncFromSchedules } from "../src/lib/schedule";
import { auditLoans } from "../src/lib/engine/loan-audit";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { currentMonth } from "../src/lib/engine/dates";
import { emptyData, type Loan, type LoanScheduleRow } from "../src/lib/types";

/** Tableau d'un prêt de `amount` à `ratePct` sur `n` mois, première échéance en `y`-`m`. */
function table(amount: number, ratePct: number, n: number, y: number, m: number): LoanScheduleRow[] {
  const r = ratePct / 1200;
  const pay = Math.round(((amount * r) / (1 - (1 + r) ** -n)) * 100) / 100;
  const rows: LoanScheduleRow[] = [];
  let bal = amount;
  for (let i = 0; i < n; i++) {
    const interest = Math.round(bal * r * 100) / 100;
    const principal = i === n - 1 ? bal : Math.round((pay - interest) * 100) / 100;
    bal = Math.max(0, Math.round((bal - principal) * 100) / 100);
    const mm = m - 1 + i;
    rows.push({ month: `${y + Math.floor(mm / 12)}-${String((mm % 12) + 1).padStart(2, "0")}`, payment: Math.round((principal + interest) * 100) / 100, interest, principal, balance: bal });
  }
  return rows;
}

test("tableau complet : montant, déblocage et durée repris", () => {
  const rows = table(250000, 2, 240, 2019, 6);
  assert.equal(scheduleStart(rows), "first");
  const f = loanFieldsFromSchedule(rows);
  assert.equal(f.initialAmount, 250000);
  assert.equal(f.startDate, "2019-05-01");
  assert.equal(f.durationMonths, 240);
});

test("tableau commencé en cours de prêt : jamais pris pour le montant emprunté", () => {
  const partial = table(250000, 2, 240, 2019, 6).slice(83); // édité 7 ans après
  assert.equal(scheduleStart(partial), "unknown");
  const f = loanFieldsFromSchedule(partial);
  assert.equal(f.initialAmount, undefined);
  assert.equal(f.startDate, undefined);
  assert.equal(f.durationMonths, undefined);
  assert.ok(f.endDate && f.monthlyPayment && f.ratePct, "fin, échéance et taux restent repris");
  // Ancienne déduction enregistrée : écartée à l'affichage.
  const fromRows = partial[0].balance + partial[0].principal;
  const loan: Loan = { id: "l", initialAmount: Math.round(fromRows * 100) / 100, schedule: { rows: partial, importedAt: "2026-01-01", source: "manuel" } };
  assert.equal(reliableInitial(loan).value, undefined);
  assert.ok(reliableInitial(loan).partialFrom);
  // Montant saisi par le propriétaire : conservé et jamais écrasé par la synchronisation.
  const data = emptyData();
  data.loans.push({ ...loan, initialAmount: 250000 });
  const synced = syncFromSchedules(data).loans[0] ?? data.loans[0];
  assert.equal(synced.initialAmount, 250000);
  assert.equal(reliableInitial(synced).value, 250000);
});

test("en-tête du document : tableau partiel reconnu, montant de l'en-tête retenu", () => {
  const partial = table(180000, 1.8, 300, 2016, 3).slice(100);
  assert.equal(scheduleStart(partial, { startDate: "2016-02-10" }), "partial");
  const f = loanFieldsFromSchedule(partial, undefined, { initialAmount: 180000, startDate: "2016-02-10", durationMonths: 300 });
  assert.equal(f.initialAmount, 180000);
  assert.equal(f.durationMonths, 300);
});

test("vérification croisée : mensualité incohérente et doublon signalés", () => {
  const data = emptyData();
  data.loans.push({ id: "a", name: "Prêt 1", bank: "CIC", initialAmount: 200000, ratePct: 2, durationMonths: 240, startDate: "2020-01-01", monthlyPayment: 1500 });
  data.loans.push({ id: "b", name: "Prêt 2", bank: "CIC", initialAmount: 100000, ratePct: 2, durationMonths: 240, startDate: "2020-01-01", monthlyPayment: 505.88 });
  data.loans.push({ id: "c", name: "Prêt 2", bank: "CIC", initialAmount: 100000, ratePct: 2, durationMonths: 240, startDate: "2020-01-01", monthlyPayment: 505.88 });
  const f = auditLoans(data, computeSnapshot(data, currentMonth()));
  assert.ok(f.some((x) => x.loanId === "a" && x.severity === "critical" && x.text.includes("Mensualité saisie")));
  assert.ok(!f.some((x) => x.loanId === "b" && x.text.includes("Mensualité saisie")), "mensualité juste : rien à signaler");
  assert.ok(f.some((x) => x.text.startsWith("Doublon probable")));
});
