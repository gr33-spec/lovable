import { test } from "node:test";
import assert from "node:assert/strict";
import { leaseVersionFor } from "../src/lib/legal/versions";
import { depositDeadline, depositSettlement, lateDepositPenalty, maxDeposit, minDurationYears, occupiedDays } from "../src/lib/legal/rules";
import { monthDue, monthReceipt, rentStatement } from "../src/lib/legal/receipts";
import { compareInspections, newEntryInspection, newExitInspection } from "../src/lib/legal/inspection";
import { leaseDocument } from "../src/lib/legal/lease";
import { euroWords, numberToWords } from "../src/lib/legal/doc";
const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
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

test("sauvegarde : un fichier de compléments ou sans identifiants est refusé", async () => {
  const { isValidBackup } = await import("../src/lib/ops");
  assert.equal(isValidBackup({ type: "patrimoine-complements", companies: [{ name: "X", set: {} }], buildings: [] }), false);
  assert.equal(isValidBackup({ companies: [{ name: "X" }], buildings: [] }), false);
  assert.equal(isValidBackup({ app: "patrimoine", data: { companies: [{ id: "c", name: "X" }], buildings: [] } }), true);
});

test("espace gestion : lecture filtrée et modifications restreintes", async () => {
  const { scopeForGestion, sanitizeGestionOps } = await import("../src/lib/scope");
  const { applyOps } = await import("../src/lib/ops");
  const data = {
    ...(await import("../src/lib/types")).emptyData(),
    companies: [{ id: "c", name: "SCI", kind: "SCI" as const, cash: 50000, partnerAccounts: 1000, address: "1 rue" }],
    buildings: [{ id: "b", name: "Imm", companyId: "c", value: 800000, propertyTax: 3000, address: "2 rue" }],
    units: [{ id: "u", buildingId: "b", name: "Lot", rent: 500, value: 90000 }],
    loans: [{ id: "l", remaining: 100000 }],
  };
  const s = scopeForGestion(data);
  assert.equal(s.loans.length, 0);
  assert.equal((s.companies[0] as { cash?: number }).cash, undefined);
  assert.equal(s.buildings[0].value, undefined);
  assert.equal(s.units[0].value, undefined);
  assert.equal(s.buildings[0].address, "2 rue");
  const ops = sanitizeGestionOps(data, [
    { op: "upsert", coll: "units", item: { id: "u", buildingId: "b", name: "Lot", rent: 520, payments: { "2026-09": { status: "paye", due: 520 } } } },
    { op: "upsert", coll: "units", item: { id: "new", buildingId: "b", name: "Créé" } },
    { op: "upsert", coll: "companies", item: { id: "c", name: "SCI", kind: "SCI", cash: 0, email: "x@y.fr" } },
    { op: "upsert", coll: "loans", item: { id: "l", remaining: 0 } },
    { op: "delete", coll: "units", id: "u" },
    { op: "settings", patch: { valueGrowthPct: 50, dismissedReminders: ["a"] } },
  ]);
  const next = applyOps(data, ops);
  assert.equal(next.units.length, 1);
  assert.equal(next.units[0].rent, 520);
  assert.equal(next.units[0].value, 90000);
  assert.equal(next.companies[0].cash, 50000);
  assert.equal(next.companies[0].email, "x@y.fr");
  assert.equal(next.loans[0].remaining, 100000);
  assert.equal(next.settings.valueGrowthPct, undefined);
  assert.deepEqual(next.settings.dismissedReminders, ["a"]);
});

test("IRL : indice publié à une date, libellés, révision au même trimestre", async () => {
  const { irlAt, irlLabel, nextYearSameQuarter, parseIrlLabel } = await import("../src/lib/irl");
  const series = [
    { year: 2025, quarter: 2 as const, value: 146.68 },
    { year: 2025, quarter: 3 as const, value: 145.77 },
    { year: 2026, quarter: 1 as const, value: 146.9 },
    { year: 2026, quarter: 2 as const, value: 147.5 },
  ];
  assert.equal(irlAt(series, "2026-07-10")?.quarter, 1);
  assert.equal(irlAt(series, "2026-07-20")?.quarter, 2);
  assert.equal(irlLabel({ year: 2026, quarter: 2 }), "IRL du 2e trimestre 2026");
  assert.deepEqual(parseIrlLabel("IRL T2 2025"), { year: 2025, quarter: 2 });
  assert.deepEqual(parseIrlLabel("IRL du 1er trimestre 2024"), { year: 2024, quarter: 1 });
  assert.equal(nextYearSameQuarter(series, "IRL du 2e trimestre 2025")?.value, 147.5);
});

test("caution : un loyer charges comprises par mois, toute la durée du bail", async () => {
  const { guaranteeTerms } = await import("../src/lib/legal/lease");
  const g = guaranteeTerms({ rent: 500, charges: 30, durationYears: 3, startDate: "2026-11-01" }, { wholeLease: true });
  assert.equal(g.monthly, 530);
  assert.equal(g.months, 36);
  assert.equal(g.max, 19080);
  assert.equal(g.end, "2029-11-01");
});

test("IRL : lecture de la réponse INSEE (SDMX)", async () => {
  const { parseSdmx } = await import("../src/lib/irl");
  const xml = `<message:StructureSpecificData><Series IDBANK="001515333"><Obs TIME_PERIOD="2026-Q1" OBS_VALUE="146.9" OBS_STATUS="A"/><Obs OBS_STATUS="A" OBS_VALUE="147.5" TIME_PERIOD="2026-Q2"/></Series></message:StructureSpecificData>`;
  assert.deepEqual(parseSdmx(xml), [
    { year: 2026, quarter: 1, value: 146.9 },
    { year: 2026, quarter: 2, value: 147.5 },
  ]);
});

test("bilan de l'année : vacance, rotation, calendrier, révisions", async () => {
  const { yearStats } = await import("../src/lib/engine/annual");
  const data = {
    ...(await import("../src/lib/types")).emptyData(),
    buildings: [{ id: "b", name: "Imm" }],
    units: [
      { id: "u1", buildingId: "b", name: "A", rent: 600, status: "occupe" as const, payments: { "2026-01": { status: "paye" as const, due: 600 }, "2026-02": { status: "impaye" as const, due: 600 } }, rentHistory: [{ date: "2026-03-01", rent: 615, previousRent: 600 }] },
      { id: "u2", buildingId: "b", name: "B", rent: 500, status: "occupe" as const },
    ],
    tenancies: [
      { id: "t1", unitId: "u2", status: "clos" as const, tenants: [], startDate: "2023-01-01", endDate: "2026-01-31" },
      { id: "t2", unitId: "u2", status: "actif" as const, tenants: [], startDate: "2026-04-01" },
    ],
  };
  const s = yearStats(data, 2026, "2026-06-15");
  assert.equal(s.monthsCount, 6);
  const b = s.buildings[0];
  assert.deepEqual(b.units[0].months.slice(0, 7), ["paye", "impaye", "non_pointe", "non_pointe", "non_pointe", "non_pointe", "futur"]);
  assert.deepEqual(b.units[1].months.slice(0, 5), ["non_pointe", "vacant", "vacant", "non_pointe", "non_pointe"]);
  assert.equal(s.vacantMonths, 2);
  assert.equal(s.lostRent, 1000);
  close(s.occupancyPct!, (10 / 12) * 100, 1e-9);
  assert.equal(s.departures.length, 1);
  assert.equal(s.arrivals.length, 1);
  assert.equal(s.avgRelocationDays, 59); // 1er février → 31 mars
  close(s.avgStayYears!, 3.08, 0.01);
  assert.equal(s.revisionGain, 15);
  assert.equal(s.estimatedUnits, 1);
});
