import { test } from "node:test";
import assert from "node:assert/strict";
import { matchStatement, parseAmount, parseDate, parseStatement } from "../src/lib/bank-statement";
import { computeSnapshot } from "../src/lib/engine/snapshot";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData } from "../src/lib/types";

test("montants et dates des relevés français", () => {
  assert.equal(parseAmount("1 234,56"), 1234.56);
  assert.equal(parseAmount("-650,00 €"), -650);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount(""), undefined);
  assert.equal(parseDate("05/10/2026"), "2026-10-05");
  assert.equal(parseDate("5-10-26"), "2026-10-05");
  assert.equal(parseDate("2026-10-05"), "2026-10-05");
  assert.equal(parseDate("32/10/2026"), undefined);
});

test("relevé avec montant unique ou débit/crédit, en-tête après des lignes d'information", () => {
  const a = parseStatement("Date opération;Libellé;Montant\n05/10/2026;VIR SEPA DUPONT JEAN;650,00\n06/10/2026;PRLV CREDIT AGRICOLE ECH PRET;-812,40\n");
  assert.equal(a.error, undefined);
  assert.deepEqual(a.rows[0], { date: "2026-10-05", label: "VIR SEPA DUPONT JEAN", amount: 650 });
  assert.equal(a.rows[1].amount, -812.4);
  const b = parseStatement('Compte courant n° 123\nSolde au 01/10/2026;1000\n\n"Date";"Libellé";"Débit";"Crédit"\n"03/10/2026";"VIR MARTIN";"";"720,50"\n"04/10/2026";"CB CARREFOUR";"45,10";""\n');
  assert.deepEqual(b.rows.map((r) => r.amount), [720.5, -45.1]);
  assert.ok(parseStatement("n'importe quoi\nsans colonnes").error);
});

test("rapprochement : loyers par nom et montant, mensualités de crédit, rien d'inventé", () => {
  const d = emptyData();
  d.buildings = [{ id: "b", name: "Immeuble" }];
  d.units = [
    { id: "u1", buildingId: "b", name: "T1", rent: 600, charges: 50, status: "occupe" },
    { id: "u2", buildingId: "b", name: "T2", rent: 700, charges: 20, status: "occupe", tenantLastName: "Le Goff" },
    { id: "u3", buildingId: "b", name: "T3", rent: 500, status: "occupe", tenantLastName: "Martin" },
  ];
  d.tenancies = [{ id: "t1", unitId: "u1", status: "actif", tenants: [{ firstName: "Jean", lastName: "Dupont" }], startDate: "2024-01-01", rent: 600, charges: 50 }];
  d.loans = [{ id: "l", name: "Prêt Immeuble", bank: "Crédit Agricole", initialAmount: 150000, ratePct: 3, durationMonths: 240, startDate: "2020-01-01", monthlyPayment: 831.9 }];
  const snap = computeSnapshot(d, monthIndex(2026, 10));
  const pay = snap.byLoan.get("l")!.paymentMonthly;
  const rows = [
    { date: "2026-10-05", label: "VIR SEPA M DUPONT JEAN LOYER", amount: 650 },
    { date: "2026-10-06", label: "VIREMENT", amount: 720 },
    { date: "2026-10-08", label: "VIR MARTIN", amount: 250 },
    { date: "2026-10-10", label: "PRLV CREDIT AGRICOLE", amount: -pay },
    { date: "2026-10-11", label: "VIR INCONNU", amount: 999 },
  ];
  const m = matchStatement(d, snap, rows);
  assert.deepEqual(m[0].kind === "rent" && [m[0].unitId, m[0].month, m[0].confidence], ["u1", "2026-10", "sure"]);
  assert.deepEqual(m[1].kind === "rent" && [m[1].unitId, m[1].confidence], ["u2", "probable"]);
  assert.deepEqual(m[2].kind === "rent" && [m[2].unitId, m[2].confidence], ["u3", "probable"], "nom seul : paiement partiel probable");
  assert.deepEqual(m[3].kind === "loan" && [m[3].loanId, m[3].confidence], ["l", "sure"]);
  assert.equal(m[4].kind, "none");
  // Deux virements du même locataire : deux mois différents, jamais deux fois le même.
  const twice = matchStatement(d, snap, [rows[0], { ...rows[0], date: "2026-10-28" }]);
  assert.ok(twice[0].kind === "rent" && twice[1].kind === "rent" && twice[0].month !== twice[1].month);
});
