import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData } from "../src/lib/types";
import { monthIndex } from "../src/lib/engine/dates";
import { cashflowMonthly, computeSnapshot, dscr, grossYield, rentalPayments } from "../src/lib/engine/snapshot";
import { project } from "../src/lib/engine/projection";
import { portfolioIndicators } from "../src/lib/engine/indicators";
import { groupModel } from "../src/lib/pdf/model";

// Un chiffre = une source : le même montant partout (prêt, bien, société,
// total, projection, indicateurs, dossier banque), et la résidence principale
// hors du périmètre locatif (cash-flow, DSCR, rendements).

const NOW = monthIndex(2026, 9);
const close = (a: number | undefined, b: number, tol = 0.5, what = "") => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${what} ${a} ≠ ${b}`);

function sample(): AppData {
  const d = emptyData();
  d.companies.push({ id: "sci", name: "SCI A", kind: "SCI" });
  d.buildings.push({ id: "imm", name: "Immeuble", kind: "immeuble", usage: "location", companyId: "sci", value: 500000, propertyTax: 2400, insurance: 600 });
  d.buildings.push({ id: "rp", name: "Résidence principale", kind: "maison", usage: "residence_principale", value: 400000, propertyTax: 1800 });
  d.units.push({ id: "u1", buildingId: "imm", name: "Lot 1", rent: 700, status: "occupe" }, { id: "u2", buildingId: "imm", name: "Lot 2", rent: 800, status: "occupe" }, { id: "u3", buildingId: "imm", name: "Lot 3", rent: 600, status: "vacant" });
  d.loans.push({ id: "l1", name: "Prêt immeuble", bank: "CIC", buildingId: "imm", initialAmount: 300000, ratePct: 2, startDate: "2020-01-01", durationMonths: 240, insuranceMonthly: 30 });
  d.loans.push({ id: "l2", name: "Prêt RP", bank: "CA", buildingId: "rp", initialAmount: 250000, ratePct: 1.5, startDate: "2019-06-01", durationMonths: 300 });
  return d;
}

test("même capital restant dû au prêt, au bien, à la société, au total et dans le dossier", () => {
  const d = sample();
  const p = project(d, NOW);
  const s = p.snapshot;
  const bal = s.byLoan.get("l1")!.balance!;
  close(s.byBuilding.get("imm")!.debt, bal, 0.01, "bien");
  close(s.ownByCompany.get("sci")!.debt, bal, 0.01, "société");
  close(s.total.debt, bal + s.byLoan.get("l2")!.balance!, 0.01, "total");
  const m = groupModel(d, p, "Test");
  close(m.buildings.find((b) => b.name === "Immeuble")!.debt, bal, 0.01, "dossier (patrimoine)");
  const loanRow = m.loansByCompany.flatMap((g) => g.loans).find((l) => l.name === "Prêt immeuble")!;
  close(loanRow.balance, bal, 0.01, "dossier (crédits)");
  close(m.loansByCompany.reduce((a, g) => a + g.balance, 0), s.total.debt, 0.01, "dossier (total crédits)");
  // La projection donne la dette au 31/12 : plus basse que celle d'aujourd'hui du capital remboursé d'ici là.
  assert.ok(p.years[0].debt < s.total.debt && p.years[0].debt > s.total.debt - 12 * (s.byLoan.get("l1")!.paymentMonthly + s.byLoan.get("l2")!.paymentMonthly), "projection au 31/12");
});

test("résidence principale : dans la valeur et la dette, hors cash-flow, DSCR et rendements", () => {
  const d = sample();
  const p = project(d, NOW);
  const t = p.snapshot.total;
  const pay1 = p.snapshot.byLoan.get("l1")!.paymentMonthly;
  const pay2 = p.snapshot.byLoan.get("l2")!.paymentMonthly;
  close(t.value, 900000, 0.01, "valeur totale");
  close(t.paymentsMonthly, pay1 + pay2, 0.01, "mensualités totales");
  close(rentalPayments(t), pay1, 0.01, "mensualités locatives");
  // Loyers des lots occupés (le lot vacant ne compte pas), charges du seul bien locatif.
  close(t.rentMonthly, 1500, 0.01, "loyers");
  close(cashflowMonthly(t), 1500 - 3000 / 12 - pay1, 0.01, "cash-flow locatif");
  close(dscr(t), (1500 - 250) / pay1, 0.0001, "DSCR");
  close(grossYield(t), (1500 * 12 * 100) / 500000, 0.0001, "rendement brut");
  const ind = new Map(portfolioIndicators(d, p).map((i) => [i.id, i.value]));
  close(ind.get("dscr"), dscr(t)!, 0.0001, "indicateur DSCR");
  close(ind.get("gross-yield"), grossYield(t)!, 0.0001, "indicateur rendement");
  const m = groupModel(d, p, "Test");
  const cap = m.capacity.find((c) => c.company === "SCI A")!;
  close(cap.cf, cashflowMonthly(p.snapshot.ownByCompany.get("sci")!), 0.01, "dossier capacité");
  assert.equal(m.capacity.find((c) => c.company === "En direct"), undefined, "le crédit personnel n'entre pas dans la capacité locative");
  // Projection : même cash-flow locatif pour l'année en cours (aucun crédit ne s'arrête d'ici la fin d'année).
  close(p.years[0].cashflow / 12, cashflowMonthly(t), 1, "projection année en cours");
  close(p.years[0].personalPayments / 12, pay2, 1, "mensualités personnelles projetées");
});

test("snapshot : cohérence au niveau de chaque société (somme des biens)", () => {
  const d = sample();
  const s = computeSnapshot(d, NOW);
  const f = s.ownByCompany.get("sci")!;
  const b = s.byBuilding.get("imm")!;
  close(f.rentMonthly, b.rentMonthly, 0.01);
  close(f.chargesAnnual, b.chargesAnnual, 0.01);
  close(f.paymentsMonthly, b.paymentsMonthly, 0.01);
});

test("documents : un seul fichier, visible partout où il est rattaché (bibliothèque, société, bien, crédit)", async () => {
  const { documentIndex, documentsOf } = await import("../src/lib/documents");
  const d = sample();
  // Importé depuis l'immeuble : rattaché à l'immeuble.
  d.documents.push({ id: "doc1", fileId: "f1", name: "offre.pdf", category: "offre_pret", buildingId: "imm", addedAt: "2026-09-01", source: "manuel" });
  let idx = documentIndex(d);
  assert.equal(idx.filter((e) => e.fileId === "f1").length, 1, "une seule entrée dans la bibliothèque");
  assert.equal(documentsOf(idx, { buildingId: "imm" }).length, 1, "visible dans l'immeuble");
  assert.equal(documentsOf(idx, { companyId: "sci" }).length, 1, "visible dans la société (par l'immeuble)");
  assert.equal(documentsOf(idx, { loanId: "l1" }).length, 0, "pas encore dans le crédit");
  // Relation ajoutée au crédit : même document, aucun duplicata.
  d.documents[0] = { ...d.documents[0], loanId: "l1" };
  idx = documentIndex(d);
  assert.equal(idx.filter((e) => e.fileId === "f1").length, 1, "toujours une seule entrée");
  assert.equal(documentsOf(idx, { loanId: "l1" }).length, 1, "visible dans le crédit");
  assert.equal(documentsOf(idx, { buildingId: "imm" }).length, 1, "toujours dans l'immeuble");
  const { missingDocuments } = await import("../src/lib/doc-completeness");
  assert.deepEqual(missingDocuments(d, { loanId: "l1" }), [], "offre de prêt présente");
  assert.deepEqual(missingDocuments(d, { buildingId: "imm" }).map((x) => x.id), ["acte", "assurance"]);
  assert.deepEqual(missingDocuments(d, { buildingId: "rp" }), [], "résidence principale : rien exigé");
});
