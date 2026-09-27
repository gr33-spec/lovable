import { test } from "node:test";
import assert from "node:assert/strict";
import { leaseVersionFor } from "../src/lib/legal/versions";
import { depositDeadline, depositSettlement, lateDepositPenalty, maxDeposit, minDurationYears, occupiedDays } from "../src/lib/legal/rules";
import { monthDue, monthReceipt, rentStatement } from "../src/lib/legal/receipts";
import { compareInspections, newEntryInspection, newExitInspection } from "../src/lib/legal/inspection";
import { leaseDocument } from "../src/lib/legal/lease";
import { euroWords, numberToWords } from "../src/lib/legal/doc";
import type { Tenancy, Unit } from "../src/lib/types";

test("version du bail selon la date de conclusion", () => {
  assert.equal(leaseVersionFor("2026-09-30").id, "nue-2015");
  assert.equal(leaseVersionFor("2026-10-01").id, "nue-2026");
  assert.equal(leaseVersionFor("2030-01-15").id, "nue-2026");
});

test("règles : durée, dépôt, délais et pénalités", () => {
  assert.equal(minDurationYears(undefined), 3);
  assert.equal(minDurationYears({ id: "c", name: "SCI", kind: "SCI" }), 6);
  assert.equal(minDurationYears({ id: "c", name: "SCI", kind: "SCI", familySci: true }), 3);
  assert.equal(maxDeposit(650), 650);
  assert.equal(depositDeadline("2026-10-15", true), "2026-11-15");
  assert.equal(depositDeadline("2026-10-15", false), "2026-12-15");
  assert.equal(lateDepositPenalty(600, "2026-11-15", "2026-11-15"), 0);
  assert.equal(lateDepositPenalty(600, "2026-11-15", "2026-11-20"), 60);
  assert.equal(lateDepositPenalty(600, "2026-11-15", "2027-01-02"), 120);
  const s = depositSettlement({ deposit: 650, deductions: [{ id: "1", label: "Peinture", amount: 200, kind: "degradation" }] });
  assert.equal(s.toReturn, 450);
  assert.deepEqual(occupiedDays("2026-10", "2026-10-16"), { days: 16, total: 31 });
});

const unit: Unit = {
  id: "u",
  buildingId: "b",
  name: "Lot 3",
  payments: {
    "2026-10": { status: "paye", due: 342.58, paidDate: "2026-10-20" },
    "2026-11": { status: "paye", due: 700, rent: 650, charges: 50 },
    "2026-12": { status: "partiel", due: 700, paid: 400 },
  },
};
const t: Tenancy = { id: "t", unitId: "u", status: "actif", tenants: [{ firstName: "Anne", lastName: "Martin" }], startDate: "2026-10-16", rent: 650, charges: 50, signDate: "2026-10-10", durationYears: 6, deposit: 650 };

test("quittances : prorata, quittance si payé, reçu si partiel, rien si impayé", () => {
  const d = monthDue(t, "2026-10");
  assert.equal(d.rent, 335.48);
  assert.equal(d.charges, 25.81);
  const oct = monthReceipt(unit, t, "2026-10");
  assert.equal(oct.kind, "quittance");
  const nov = monthReceipt(unit, t, "2026-11");
  assert.ok(nov.kind === "quittance" && nov.rent === 650 && nov.charges === 50);
  const dec = monthReceipt(unit, t, "2026-12");
  assert.ok(dec.kind === "recu" && dec.received === 400 && dec.remaining === 300);
  assert.equal(monthReceipt(unit, t, "2027-01").kind, "aucun");
});

test("attestation à date : seulement si tout est payé", () => {
  assert.equal(rentStatement(unit, t, "2026-10", "2026-11").kind, "attestation");
  const s = rentStatement(unit, t, "2026-10", "2026-12");
  assert.equal(s.kind, "recu");
  assert.equal(s.remaining, 300);
  assert.equal(rentStatement(unit, t, "2026-10", "2027-01").kind, "incomplet");
});

test("états des lieux : sortie pré-remplie depuis l'entrée, comparaison", () => {
  const entry = newEntryInspection({ id: "u", buildingId: "b", name: "Lot", mainRooms: 2 }, t);
  entry.rooms.forEach((r) => r.items.forEach((i) => (i.state = "bon")));
  entry.keys[0].count = 2;
  const exit = newExitInspection({ id: "u", buildingId: "b", name: "Lot" }, t, entry);
  assert.equal(exit.rooms[1].items[0].state, "bon");
  assert.equal(compareInspections(entry, exit).conform, true); // clés pré-remplies comme restituées
  exit.keys[0].count = 1;
  assert.deepEqual(compareInspections(entry, exit).keysMissing, [{ kind: entry.keys[0].kind, missing: 1 }]);
  exit.keys[0].count = 2;
  exit.rooms[1].items[1].state = "mauvais";
  const cmp = compareInspections(entry, exit);
  assert.equal(cmp.conform, false);
  assert.equal(cmp.changes.filter((c) => c.worse).length, 1);
});

test("bail : clause résolutoire obligatoire et clauses facultatives du modèle 2026", () => {
  const ctx = {
    landlord: { name: "SCI TEST", isCompany: true, form: "SCI" },
    unit: { id: "u", buildingId: "b", name: "Lot 3" },
    tenancy: { ...t, clauseInsurance: true, clauseMainResidence: true },
    address: "1 rue du Port, Paimpol",
  };
  const doc = leaseDocument(ctx);
  const text = JSON.stringify(doc.blocks);
  assert.match(doc.reference, /nue-2026/);
  assert.match(text, /six semaines après un commandement de payer/);
  assert.match(text, /dépôt de garantie/);
  assert.match(text, /L\. 151-14-1/);
  assert.doesNotMatch(text, /troubles de voisinage/);
  const old = leaseDocument({ ...ctx, tenancy: { ...ctx.tenancy, signDate: "2022-05-01", startDate: "2022-05-01" } });
  assert.match(old.reference, /nue-2015/);
  assert.match(JSON.stringify(old.blocks), /deux mois après un commandement/);
});

test("montants en lettres", () => {
  assert.equal(numberToWords(80), "quatre-vingts");
  assert.equal(numberToWords(71), "soixante et onze");
  assert.equal(numberToWords(1200), "mille deux cents");
  assert.equal(numberToWords(200300), "deux cent mille trois cents");
  assert.equal(euroWords(650.5), "six cent cinquante euros et cinquante centimes");
});

test("durée des nouveaux baux : 3 ans par défaut, réglable", async () => {
  const { leaseYears } = await import("../src/lib/legal/rules");
  const { newTenancyDraft } = await import("../src/lib/tenancy");
  assert.equal(leaseYears(undefined), 3);
  assert.equal(leaseYears({ leaseYears: 6 }), 6);
  const d = newTenancyDraft({ id: "u", buildingId: "b", name: "Lot", rent: 500 }, undefined, { id: "c", name: "SCI", kind: "SCI" }, undefined, leaseYears({}));
  assert.equal(d.durationYears, 3);
});

test("compléments : fusion par nom, rien d'autre modifié", async () => {
  const { planComplements, complementsSchema } = await import("../src/lib/complements");
  const { metersFor } = await import("../src/lib/legal/inspection");
  const data = {
    ...(await import("../src/lib/types")).emptyData(),
    companies: [{ id: "c", name: "DU LEFF", kind: "SCI" as const, cash: 1000 }],
    buildings: [{ id: "b", name: "Immeuble du Leff", companyId: "c", value: 300000 }],
    units: [{ id: "u", buildingId: "b", name: "Lot 1", rent: 400 }],
  };
  const patch = complementsSchema.parse({
    type: "patrimoine-complements",
    companies: [{ name: "SCI du Leff", set: { email: "a@b.fr", familySci: false } }, { name: "Inconnue", set: { phone: "1" } }],
    buildings: [{ name: "IMMEUBLE DU LEFF", set: { address: "8 rue Pasteur", city: "22170 Châtelaudren" }, units: { heating: "individuel", heatingEnergy: "Électricité", hotWater: "individuel", hotWaterEnergy: "Électricité" } }],
  });
  const plan = planComplements(data, patch);
  assert.equal(plan.data.companies[0].email, "a@b.fr");
  assert.equal(plan.data.companies[0].cash, 1000);
  assert.equal(plan.data.buildings[0].value, 300000);
  assert.equal(plan.data.buildings[0].address, "8 rue Pasteur");
  assert.equal(plan.data.units[0].rent, 400);
  assert.equal(plan.data.units[0].heating, "individuel");
  assert.equal(plan.lines.filter((l) => !l.ok).length, 1);
  assert.deepEqual(metersFor(plan.data.units[0]), ["Électricité", "Eau froide"]);
});
