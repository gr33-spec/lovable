import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData, type Project } from "../src/lib/types";
import { projectFigures, realizeProject } from "../src/lib/engine/projects";
import { project } from "../src/lib/engine/projection";
import { projectImpact } from "../src/lib/engine/project-impact";
import { monthIndex } from "../src/lib/engine/dates";

const close = (a: number | undefined, b: number, tol = 0.5) => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

function sample(): Project {
  return {
    id: "p1",
    kind: "acquisition",
    name: "Immeuble du Phare",
    status: "etude",
    companyId: "sci",
    price: 300000,
    notaryFeesPct: 8,
    agencyFees: 10000,
    bankFees: 2000,
    costs: [
      { id: "c1", kind: "travaux", label: "Toiture", amount: 40000 },
      { id: "c2", kind: "frais", label: "Diagnostics", amount: 1000 },
    ],
    equity: 50000,
    loans: [{ id: "l1", amount: 327000, ratePct: 4, durationMonths: 240, insuranceMonthly: 30 }],
    lots: [
      { id: "a", name: "T2", rent: 600, charges: 30 },
      { id: "b", name: "T3", rent: 800, charges: 40 },
      { id: "c", name: "T3 bis", rent: 750 },
    ],
    propertyTax: 2400,
    insurance: 600,
    purchaseDate: "2027-03-15",
    rentStartDate: "2027-06-01",
  };
}

test("projet : coût total, financement, mensualité et rentabilité", () => {
  const f = projectFigures(sample());
  assert.equal(f.notary, 24000);
  assert.equal(f.totalCost, 300000 + 24000 + 10000 + 2000 + 40000 + 1000);
  assert.equal(f.resources, 377000);
  assert.equal(f.gap, 0);
  // 327 000 € à 4 % sur 20 ans : 1 981,56 € hors assurance.
  close(f.loans[0].payment, 1981.56, 0.05);
  close(f.monthlyPayments, 2011.56, 0.05);
  assert.equal(f.rentMonthly, 2150);
  assert.equal(f.chargesAnnual, 3000);
  close(f.netRentMonthly, 2150 - 250);
  close(f.cashflowMonthly, 1900 - 2011.56, 0.05);
  close(f.grossYieldPct, (2150 * 12 * 100) / 377000, 0.01);
  assert.ok(f.dscr! < 1);
  assert.deepEqual(f.missing, []);
});

test("projet : données manquantes signalées, jamais inventées", () => {
  const f = projectFigures({ id: "x", kind: "acquisition", name: "Idée", status: "idee", lots: [], costs: [], loans: [{ id: "l", amount: 100000 }] });
  assert.equal(f.totalCost, undefined);
  assert.equal(f.monthlyPayments, undefined);
  assert.equal(f.cashflowMonthly, undefined);
  assert.ok(f.missing.includes("Prix d'achat"));
  assert.ok(f.missing.includes("Frais de notaire (montant ou taux)"));
  assert.ok(f.missing.some((m) => m.includes("montant, taux et durée")));
  // Un montant de frais de notaire connu est prioritaire sur le taux.
  assert.equal(projectFigures({ ...sample(), notaryFees: 21000 }).notary, 21000);
});

test("projet : différé d'amortissement", () => {
  const f = projectFigures({ ...sample(), loans: [{ id: "l", amount: 120000, ratePct: 3, durationMonths: 240, deferralMonths: 12 }] });
  close(f.loans[0].deferralPayment, 300);
  // Amortissement sur 228 mois après le différé.
  close(f.loans[0].payment, 691.13, 0.05);
});

function group(p: Project): AppData {
  return {
    ...emptyData(),
    companies: [{ id: "sci", name: "SCI TEST", kind: "SCI", cash: 60000 }],
    buildings: [{ id: "b0", name: "Existant", companyId: "sci", value: 200000, rentMonthly: 1000 }],
    projects: [p],
  };
}

test("projet intégré aux projections : dette, loyers après la mise en location, apport", () => {
  const now = monthIndex(2026, 9);
  const off = project(group(sample()), now);
  const on = project(group({ ...sample(), inProjection: true }), now);
  const y27off = off.years.find((r) => r.year === 2027)!;
  const y27on = on.years.find((r) => r.year === 2027)!;
  const y28on = on.years.find((r) => r.year === 2028)!;
  assert.equal(y27off.debt, 0);
  assert.ok(y27on.debt > 300000 && y27on.debt < 327000);
  // Loyers de juin à décembre 2027 (7 mois) puis année pleine.
  close(y27on.rent - y27off.rent, 7 * 2150, 1);
  close(y28on.rent - 12000, 12 * 2150, 1);
  // Part non empruntée payée par la trésorerie à l'acte.
  close(y27on.operations, -(377000 - 327000));
  assert.ok(on.events.some((e) => e.id === "project-p1" && e.year === 2027));
  // Un projet abandonné ou réalisé n'est jamais projeté.
  assert.equal(project(group({ ...sample(), inProjection: true, status: "abandonne" }), now).years[1].debt, 0);

  const impact = projectImpact(group(sample()), now, sample())!;
  assert.equal(impact.year, 2028);
  close(impact.after.cashflowMonthly - impact.before.cashflowMonthly, projectFigures(sample()).cashflowMonthly!, 1);
});

test("projet réalisé : immeuble, logements, crédits et travaux créés sans doublon", () => {
  let n = 0;
  const id = () => `id${++n}`;
  const data = group(sample());
  const r = realizeProject(data, sample(), { purchaseDate: "2027-04-02", price: 295000, loans: sample().loans, rented: true }, id, "2027-04-02");
  assert.equal(r.company, undefined);
  assert.equal(r.building?.companyId, "sci");
  assert.equal(r.building?.acquisitionPrice, 295000);
  assert.equal(r.building?.acquisitionDate, "2027-04-02");
  assert.equal(r.units.length, 3);
  assert.ok(r.units.every((u) => u.buildingId === r.building!.id && u.status === "occupe"));
  assert.equal(r.loans.length, 1);
  assert.equal(r.loans[0].initialAmount, 327000);
  assert.equal(r.loans[0].startDate, "2027-04-02");
  assert.equal(r.works.length, 1);
  assert.equal(r.works[0].financedByLoan, true);
  assert.equal(r.project.status, "realise");
  assert.equal(r.project.realizedBuildingId, r.building!.id);

  // Nouvelle société créée sous la holding.
  const withNew = realizeProject(data, { ...sample(), companyId: null, newCompanyName: "SCI DU PHARE", newCompanyParentId: "holding" }, { loans: [] }, id, "2027-01-01");
  assert.equal(withNew.company?.name, "SCI DU PHARE");
  assert.equal(withNew.company?.parentId, "holding");
  assert.equal(withNew.building?.companyId, withNew.company?.id);

  // Travaux financés par crédit : pas de double sortie de trésorerie.
  const after: AppData = { ...data, buildings: [...data.buildings, r.building!], units: r.units, loans: r.loans, works: r.works, projects: [r.project] };
  const proj = project(after, monthIndex(2027, 4));
  assert.equal(proj.years[0].works, 0);
  assert.ok(proj.events.some((e) => e.kind === "works"));

  // Projet de travaux sur un immeuble existant : mise à jour de la valeur et nouveaux lots.
  const works: Project = { id: "t", kind: "travaux", name: "Rénovation", status: "accorde", buildingId: "b0", valueAfterWorks: 260000, lots: [{ id: "n", name: "Combles", rent: 500 }], costs: [{ id: "w", kind: "travaux", label: "Combles", amount: 60000 }], loans: [{ id: "tl", amount: 60000, ratePct: 3.5, durationMonths: 180 }] };
  const rw = realizeProject(data, works, { loans: works.loans }, id, "2027-01-01");
  assert.equal(rw.building, undefined);
  assert.equal(rw.buildingPatch?.value, 260000);
  assert.equal(rw.units[0].buildingId, "b0");
  assert.equal(rw.loans[0].buildingId, "b0");
  assert.equal(rw.loans[0].companyId, "sci");
});
