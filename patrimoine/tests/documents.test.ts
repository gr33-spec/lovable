import { test } from "node:test";
import assert from "node:assert/strict";
import { documentIndex, documentsOf, fileDocument, searchText } from "../src/lib/documents";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData } from "../src/lib/types";
import type { LoanScheduleRow } from "../src/lib/types";

const NOW = monthIndex(2026, 10);

function fixture() {
  const d = emptyData();
  d.companies = [{ id: "c", name: "SCI Armor", kind: "SCI" }];
  d.buildings = [{ id: "b", name: "Immeuble du Port", companyId: "c", city: "Paimpol" }, { id: "b2", name: "Immeuble B", companyId: "c" }];
  d.units = [{ id: "u", buildingId: "b", name: "Lot 3" }];
  d.tenancies = [{ id: "t", unitId: "u", status: "actif", tenants: [{ firstName: "Jean", lastName: "MARTIN" }], guarantors: [{ kind: "personne", lastName: "DURAND" }] }];
  d.loans = [{ id: "l", buildingId: "b2", bank: "Crédit Agricole", name: "Prêt B" }];
  d.statements = [{ id: "s", companyId: "c", year: 2025, figures: {}, source: "ia", fileId: "f-bilan", fileName: "bilan.pdf" }];
  return d;
}

function table(): LoanScheduleRow[] {
  const rows: LoanScheduleRow[] = [];
  let b = 12_000;
  for (let i = 0; i < 12; i++) {
    const principal = 1000;
    const interest = Math.round(b * 0.002 * 100) / 100;
    b -= principal;
    rows.push({ month: `2025-${String(i + 1).padStart(2, "0")}`, payment: principal + interest, interest, principal, balance: b });
  }
  return rows;
}

test("bail rangé dans le dossier du locataire, sans jamais écraser", () => {
  const d = fixture();
  const r = fileDocument(d, { fileId: "f1", name: "bail.pdf", category: "bail", tenancyId: "t" }, NOW);
  assert.equal(r.ops[0].coll, "tenancies");
  const t = r.ops[0].item as (typeof d.tenancies)[number];
  assert.equal(t.signedLease?.fileId, "f1");
  d.tenancies = [t];
  // Un second bail pour le même locataire ne remplace pas le premier : il devient une pièce rattachée.
  const r2 = fileDocument(d, { fileId: "f2", name: "bail2.pdf", category: "bail", tenancyId: "t" }, NOW);
  assert.equal(r2.ops[0].coll, "documents");
  assert.equal((r2.ops[0].item as { tenancyId?: string }).tenancyId, "t");
});

test("caution, courrier, tableau d'amortissement, pièce libre", () => {
  const d = fixture();
  const c = fileDocument(d, { fileId: "f3", name: "caution.pdf", category: "caution", tenancyId: "t" }, NOW);
  assert.equal((c.ops[0].item as (typeof d.tenancies)[number]).guarantors?.[0].signedFile?.fileId, "f3");
  const l = fileDocument(d, { fileId: "f4", name: "courrier.pdf", category: "courrier", title: "Révision 2026", tenancyId: "t" }, NOW);
  assert.equal((l.ops[0].item as (typeof d.tenancies)[number]).letters?.[0].label, "Révision 2026");
  const tab = fileDocument(d, { fileId: "f5", name: "tableau.pdf", category: "tableau_amortissement", loanId: "l", scheduleRows: table(), loanPlan: { kind: "existing", loanId: "l" } }, NOW);
  const loan = tab.ops[0].item as (typeof d.loans)[number];
  assert.equal(tab.ops[0].coll, "loans");
  assert.equal(loan.schedule?.fileId, "f5");
  assert.equal(loan.initialAmount, 12_000);
  const bad = table().map((r, i) => (i === 5 ? { ...r, balance: r.balance + 500 } : r));
  // Sans financement désigné, un tableau reste une pièce rattachée au prêt (jamais perdue).
  assert.equal(fileDocument(d, { fileId: "f6", name: "t.pdf", category: "tableau_amortissement", loanId: "l", scheduleRows: bad }, NOW).ops[0].coll, "documents");
  const ins = fileDocument(d, { fileId: "f7", name: "pno.pdf", category: "assurance", title: "Assurance PNO", buildingId: "b" }, NOW);
  assert.equal(ins.ops[0].coll, "documents");
});

test("bibliothèque : chaque pièce une fois, retrouvée depuis chaque élément et par la recherche", () => {
  const d = fixture();
  d.tenancies[0].signedLease = { fileId: "f1", name: "bail.pdf" };
  d.documents = [{ id: "d1", fileId: "f7", name: "pno.pdf", category: "assurance", title: "Assurance PNO", buildingId: "b", summary: "Axa contrat 123", addedAt: "2026-09-01", source: "ia" }];
  const index = documentIndex(d);
  assert.equal(index.length, 3);
  assert.equal(new Set(index.map((e) => e.fileId)).size, 3);
  const bail = index.find((e) => e.category === "bail")!;
  assert.deepEqual([bail.companyId, bail.buildingId, bail.unitId], ["c", "b", "u"], "rattachement complété vers le haut");
  assert.equal(documentsOf(index, { buildingId: "b" }).length, 2);
  assert.equal(documentsOf(index, { unitId: "u" }).length, 1);
  assert.equal(documentsOf(index, { companyId: "c" }).length, 3);
  assert.ok(searchText(index.find((e) => e.docId === "d1")!, d).includes("axa"));
  assert.ok(searchText(bail, d).includes("martin"));
  assert.ok(searchText(bail, d).includes("paimpol"));
});
