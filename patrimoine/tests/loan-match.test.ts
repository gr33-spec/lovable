import { test } from "node:test";
import assert from "node:assert/strict";
import { autoFileable, matchLoan } from "../src/lib/loan-match";
import { fileDocument, documentIndex, documentsOf } from "../src/lib/documents";
import { applyOps } from "../src/lib/ops";
import { monthIndex } from "../src/lib/engine/dates";
import { emptyData, type AppData, type LoanScheduleRow, type ScheduleMeta } from "../src/lib/types";

const NOW = monthIndex(2026, 9);

/** Échéancier d'un prêt amortissable (mensualités constantes). */
function table(amount: number, year: number, month: number, ratePct: number, months: number): LoanScheduleRow[] {
  const r = ratePct / 1200;
  const pay = Math.round(((amount * r) / (1 - Math.pow(1 + r, -months))) * 100) / 100;
  const rows: LoanScheduleRow[] = [];
  let b = amount;
  for (let i = 0; i < months; i++) {
    const m = year * 12 + month - 1 + i;
    const interest = Math.round(b * r * 100) / 100;
    const principal = i === months - 1 ? b : Math.round((pay - interest) * 100) / 100;
    b = Math.round((b - principal) * 100) / 100;
    rows.push({ month: `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`, payment: Math.round((principal + interest) * 100) / 100, interest, principal, balance: Math.max(0, b) });
  }
  return rows;
}

function base(): AppData {
  const d = emptyData();
  d.companies = [
    { id: "tregor", name: "SCI DU TRÉGOR", kind: "SCI" } as AppData["companies"][number],
    { id: "port", name: "SCI DU PORT", kind: "SCI" } as AppData["companies"][number],
  ];
  d.buildings = [
    { id: "paimpol", name: "Appartement de Paimpol", companyId: "tregor", address: "12 rue des Islandais", city: "Paimpol" } as AppData["buildings"][number],
    { id: "lannion", name: "Immeuble de Lannion", companyId: "tregor", address: "3 quai d'Aiguillon", city: "Lannion" } as AppData["buildings"][number],
    { id: "portb", name: "Immeuble du Port", companyId: "port" } as AppData["buildings"][number],
  ];
  return d;
}

const A = { rows: table(145_000, 2021, 3, 1.65, 240), meta: { borrower: "SCI DU TREGOR", bank: "Crédit Agricole", initialAmount: 145_000, startDate: "2021-02-15", durationMonths: 240, ratePct: 1.65, address: "12 rue des Islandais 22500 Paimpol" } as ScheduleMeta };
const B = { rows: table(80_000, 2019, 7, 1.2, 180), meta: { borrower: "SCI du Trégor", bank: "Crédit Mutuel", initialAmount: 80_000 } as ScheduleMeta };
const C = { rows: table(210_000, 2023, 10, 3.9, 300), meta: { borrower: "S.C.I. DU TREGOR", bank: "CIC", address: "3 quai d'Aiguillon, Lannion" } as ScheduleMeta };

/** Import comme le fait l'écran : rapprochement puis rangement. */
function importTable(d: AppData, facts: typeof A, fileId: string) {
  const m = matchLoan(d, facts, {}, NOW);
  const r = fileDocument(d, { fileId, name: `${fileId}.pdf`, category: "tableau_amortissement", companyId: m.companyId, buildingId: m.buildingId, scheduleRows: facts.rows, scheduleMeta: facts.meta, loanPlan: m.plan }, NOW);
  const next = applyOps(d, [...r.ops.map((o) => ({ op: "upsert" as const, coll: o.coll, item: o.item as never })), ...r.removes.map((x) => ({ op: "delete" as const, coll: x.coll, id: x.id }))]);
  return { m, r, next };
}

test("trois tableaux d'une même SCI sans prêt enregistré : trois financements distincts, bien rattachés", () => {
  let d = base();
  const a = importTable(d, A, "fa");
  assert.equal(a.m.companyId, "tregor");
  assert.equal(a.m.buildingId, "paimpol", "adresse du bien reconnue");
  assert.equal(a.m.plan.kind, "new");
  assert.ok(autoFileable(a.m, d), "emprunteur certain, aucun autre prêt : rangé sans question");
  d = a.next;
  const b = importTable(d, B, "fb");
  assert.equal(b.m.plan.kind, "new", "autre montant, autre date : autre financement");
  assert.equal(b.m.buildingId, undefined, "pas d'adresse, deux immeubles : pas d'immeuble inventé");
  d = b.next;
  const c = importTable(d, C, "fc");
  assert.equal(c.m.plan.kind, "new");
  assert.equal(c.m.buildingId, "lannion");
  d = c.next;
  assert.equal(d.loans.length, 3);
  const loanA = d.loans.find((l) => l.schedule?.fileId === "fa")!;
  assert.equal(loanA.initialAmount, 145_000);
  assert.equal(loanA.startDate, "2021-02-01");
  assert.equal(loanA.durationMonths, 240);
  assert.equal(loanA.ratePct, 1.65);
  assert.equal(loanA.bank, "Crédit Agricole");
  assert.equal(loanA.buildingId, "paimpol");
  assert.match(loanA.name!, /Crédit Agricole 2021/);
  assert.ok(!/Prêt \d/.test(loanA.name!), "jamais de numéro d'ordre comme nom");
  // Même donnée partout : Documents, société, immeuble, prêt.
  const index = documentIndex(d);
  assert.equal(index.filter((e) => e.category === "tableau_amortissement").length, 3);
  assert.equal(documentsOf(index, { companyId: "tregor" }).length, 3);
  assert.equal(documentsOf(index, { buildingId: "paimpol" }).length, 1);
  assert.equal(documentsOf(index, { loanId: loanA.id })[0].fileId, "fa");
  assert.equal(d.documents.length, 0, "aucune pièce libre en double");
  // Réimport du même tableau (autre fichier) : reconnu, rien de créé.
  const again = matchLoan(d, A, {}, NOW);
  assert.equal(again.identicalTo, loanA.id);
});

test("prêts saisis à la main (« Prêt 1/2/3 ») : reconnus par leurs chiffres, pas par leur nom", () => {
  const d = base();
  const payA = matchLoan(d, A, {}, NOW).fields.monthlyPayment!;
  const payB = matchLoan(d, B, {}, NOW).fields.monthlyPayment!;
  d.loans = [
    { id: "p1", name: "Prêt 1", companyId: "tregor", monthlyPayment: payB, remaining: 30_000, remainingDate: "2026-09-01" },
    { id: "p2", name: "Prêt 2", buildingId: "paimpol", monthlyPayment: payA, initialAmount: 145_000 },
    { id: "p3", name: "Prêt 3", companyId: "tregor", initialAmount: 210_000 },
  ];
  const a = matchLoan(d, A, {}, NOW);
  assert.deepEqual(a.plan, { kind: "existing", loanId: "p2" });
  assert.ok(a.sure);
  const c = matchLoan(d, C, {}, NOW);
  assert.deepEqual(c.plan, { kind: "existing", loanId: "p3" });
  const b = matchLoan(d, B, {}, NOW);
  assert.equal(b.plan.kind === "existing" && b.plan.loanId, "p1");
  // Le capital restant saisi (30 000 €) ne correspond pas au tableau : signalé, jamais écrasé en silence.
  assert.ok(b.changes.some((ch) => ch.key === "remaining" && ch.conflict));
  assert.equal(autoFileable(b, d), false);
});

test("écart avec la fiche : listé et soumis à confirmation", () => {
  const d = base();
  d.loans = [{ id: "x", name: "Crédit Paimpol", buildingId: "paimpol", initialAmount: 145_000, ratePct: 1.9, startDate: "2021-02-01" }];
  const m = matchLoan(d, A, {}, NOW);
  assert.deepEqual(m.plan, { kind: "existing", loanId: "x" });
  const rate = m.changes.find((c) => c.key === "ratePct")!;
  assert.equal(rate.conflict, true);
  assert.equal(rate.before, "1,9 %");
  assert.equal(autoFileable(m, d), false);
  // Complément sans écart : rangé sans question.
  d.loans[0].ratePct = 1.65;
  const ok = matchLoan(d, A, {}, NOW);
  assert.ok(ok.changes.every((c) => !c.conflict));
  assert.equal(autoFileable(ok, d), true);
});

test("société d'un autre emprunteur : jamais rattaché à ses prêts", () => {
  const d = base();
  d.loans = [{ id: "portloan", buildingId: "portb", initialAmount: 145_000, startDate: "2021-02-01" }];
  const m = matchLoan(d, A, {}, NOW);
  assert.equal(m.companyId, "tregor");
  assert.equal(m.plan.kind, "new");
});

test("tableau édité en cours de prêt : montant et départ lus dans l'en-tête", () => {
  const d = base();
  const full = table(200_000, 2019, 6, 1.2, 300);
  const rows = full.filter((r) => r.month >= "2024-01");
  const m = matchLoan(d, { rows, meta: { borrower: "SCI DU PORT", initialAmount: 200_000, startDate: "2019-05-10", durationMonths: 300 } }, {}, NOW);
  assert.equal(m.companyId, "port");
  assert.equal(m.buildingId, "portb", "immeuble unique de la société");
  assert.equal(m.fields.initialAmount, 200_000);
  assert.equal(m.fields.startDate, "2019-05-01");
  assert.equal(m.fields.durationMonths, 300);
  // Le même prêt, déjà enregistré avec le tableau complet : reconnu par les échéances communes.
  d.loans = [{ id: "full", buildingId: "portb", schedule: { rows: full, importedAt: "2025-01-01", source: "ia" } }];
  const again = matchLoan(d, { rows, meta: { borrower: "SCI DU PORT" } }, {}, NOW);
  assert.deepEqual(again.plan, { kind: "existing", loanId: "full" });
});

test("remplacement d'un tableau : l'ancien reste une pièce du prêt, une pièce libre reprise n'est pas dupliquée", () => {
  const d = base();
  d.loans = [{ id: "x", buildingId: "paimpol", schedule: { rows: table(145_000, 2021, 3, 1.7, 240), fileId: "old", fileName: "ancien.pdf", importedAt: "2024-01-01", source: "ia" } }];
  d.documents = [{ id: "loose", fileId: "new", name: "nouveau.pdf", category: "tableau_amortissement", companyId: "tregor", addedAt: "2026-09-01", source: "ia" }];
  const r = fileDocument(d, { fileId: "new", name: "nouveau.pdf", category: "tableau_amortissement", scheduleRows: A.rows, scheduleMeta: A.meta, loanPlan: { kind: "existing", loanId: "x" } }, NOW);
  const loan = r.ops.find((o) => o.coll === "loans")!.item as AppData["loans"][number];
  assert.equal(loan.schedule!.fileId, "new");
  const archive = r.ops.find((o) => o.coll === "documents")!.item as AppData["documents"][number];
  assert.equal(archive.fileId, "old");
  assert.equal(archive.loanId, "x");
  assert.deepEqual(r.removes, [{ coll: "documents", id: "loose" }]);
});

test("trois prêts saisis avec seulement le capital restant dû : chaque tableau trouve le sien", () => {
  const d = base();
  const t1 = { rows: table(160_000, 2018, 1, 1.5, 240), meta: { borrower: "SCI DU PORT", bank: "CIC" } };
  const t2 = { rows: table(260_000, 2020, 6, 1.3, 240), meta: { borrower: "SCI DU PORT", bank: "CIC" } };
  const t3 = { rows: table(320_000, 2022, 3, 1.9, 300), meta: { borrower: "SCI DU PORT", bank: "Crédit Agricole" } };
  const now = (t: typeof t1) => matchLoan(emptyData(), t, {}, NOW).fields.remaining!;
  // Montants saisis il y a quelques mois, sans date (comme dans l'application) : légèrement au-dessus.
  d.loans = [
    { id: "port1", name: "Prêt 1 DU PORT", buildingId: "portb", remaining: Math.round(now(t1) * 1.02) },
    { id: "port2", name: "Prêt 2 DU PORT", buildingId: "portb", remaining: Math.round(now(t2) * 1.015) },
    { id: "port3", name: "Prêt 3 DU PORT", buildingId: "portb", remaining: Math.round(now(t3) * 1.01) },
  ];
  for (const [t, id] of [[t3, "port3"], [t1, "port1"], [t2, "port2"]] as const) {
    const m = matchLoan(d, t, {}, NOW);
    assert.deepEqual(m.plan, { kind: "existing", loanId: id });
    assert.ok(m.sure, `${id} reconnu sans hésitation`);
    assert.ok(autoFileable(m, d), `${id} rangé automatiquement (seuls des compléments)`);
  }
});
