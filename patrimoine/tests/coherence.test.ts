import { test } from "node:test";
import assert from "node:assert/strict";
import { demoData } from "../src/lib/demo";
import { emptyData, type AppData, type Loan } from "../src/lib/types";
import { monthIndex } from "../src/lib/engine/dates";
import { resolveLoan } from "../src/lib/engine/loan";
import { computeSnapshot, cashflowMonthly } from "../src/lib/engine/snapshot";
import { project } from "../src/lib/engine/projection";
import { portfolioIndicators } from "../src/lib/engine/indicators";
import { companySubset } from "../src/lib/engine/subset";
import { groupModel } from "../src/lib/pdf/model";
import { incomeTax, remunerationYear, salaryContributions } from "../src/lib/fiscal/remuneration";

// Contrôles indépendants : les chiffres sont recalculés par une autre méthode
// (formules fermées, sommes) et comparés à ceux de l'application et du dossier.

const close = (a: number | undefined, b: number, tol = 0.5, what = "") => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${what} ${a} ≠ ${b}`);
const NOW = monthIndex(2026, 9);

/** Capital restant dû après k échéances d'un prêt à annuités constantes (formule fermée). */
function closedBalance(P: number, annualRate: number, n: number, k: number): number {
  const r = annualRate / 1200;
  if (r === 0) return P - (P / n) * k;
  const A = (P * r) / (1 - Math.pow(1 + r, -n));
  return P * Math.pow(1 + r, k) - (A * (Math.pow(1 + r, k) - 1)) / r;
}

test("crédits : capital restant dû et mensualité conformes à la formule d'annuité", () => {
  const cases = [
    { P: 200000, rate: 3.5, n: 240, start: "2020-01-15" },
    { P: 327000, rate: 3.98, n: 300, start: "2019-06-01" },
    { P: 85000, rate: 1.2, n: 180, start: "2016-03-10" },
    { P: 150000, rate: 0, n: 120, start: "2022-09-01" },
    { P: 410000, rate: 4.4, n: 180, start: "2024-11-05" },
  ];
  for (const c of cases) {
    const loan: Loan = { id: "x", initialAmount: c.P, ratePct: c.rate, durationMonths: c.n, startDate: c.start, kind: "amortissable" };
    const r = resolveLoan(loan, NOW);
    const [y, m] = c.start.split("-").map(Number);
    const start = monthIndex(y, m);
    // Première échéance le mois suivant le déblocage ; échéances payées avant le mois courant.
    const paid = NOW - (start + 1);
    const expected = closedBalance(c.P, c.rate, c.n, paid);
    close(r.balance, expected, 0.5, `${c.P} à ${c.rate} %`);
    const A = c.rate === 0 ? c.P / c.n : (c.P * (c.rate / 1200)) / (1 - Math.pow(1 + c.rate / 1200, -c.n));
    close(r.payment, A, 0.01, "mensualité");
    assert.equal(r.endMonth, start + c.n);
    assert.equal(r.quality, "complete");
  }
  // Solde connu à une date + mensualité + fin : le taux déduit redonne la mensualité.
  const known = resolveLoan({ id: "k", remaining: 230371, remainingDate: "2026-09-01", monthlyPayment: 1433.29, endDate: "2045-07-01" }, NOW);
  assert.ok(known.impliedRatePct! > 3 && known.impliedRatePct! < 5);
  close(known.balance, 230371, 0.01);
});

function checkGroup(data: AppData, label: string) {
  const p = project(data, NOW);
  const snap = computeSnapshot(data, NOW);
  const f = snap.total;
  const m = groupModel(data, p, label);

  // Dette : somme des crédits = total = tableau du patrimoine = tableau des crédits.
  let debt = 0;
  let payments = 0;
  for (const l of data.loans) {
    const now = snap.byLoan.get(l.id)!;
    debt += now.balance ?? 0;
    payments += now.paymentMonthly;
  }
  close(f.debt, debt, 0.01, `${label} dette`);
  close(f.paymentsMonthly, payments, 0.01, `${label} mensualités`);
  const assets = m.buildings.reduce((s, b) => s + b.debt, 0) + m.companyLevelDebt;
  close(assets, f.debt, 0.5, `${label} dette du tableau du patrimoine`);
  close(m.loansByCompany.reduce((s, g) => s + g.balance, 0), f.debt, 0.5, `${label} dette du tableau des crédits`);
  close(m.loansByCompany.reduce((s, g) => s + g.monthly, 0), f.paymentsMonthly, 0.5, `${label} mensualités du tableau des crédits`);

  // Loyers : somme des immeubles = total ; capacité par société = synthèse.
  close(m.buildings.reduce((s, b) => s + b.rentAnnual, 0), f.rentMonthly * 12, 0.5, `${label} loyers`);
  const cap = m.capacity.reduce((a, c) => ({ rent: a.rent + c.rent, charges: a.charges + c.charges, payments: a.payments + c.payments, cf: a.cf + c.cf }), { rent: 0, charges: 0, payments: 0, cf: 0 });
  close(cap.rent, f.rentMonthly, 0.5, `${label} loyers capacité`);
  close(cap.charges, f.chargesAnnual / 12, 0.5, `${label} charges capacité`);
  close(cap.payments, f.paymentsMonthly, 0.5, `${label} mensualités capacité`);
  close(cap.cf, cashflowMonthly(f), 0.5, `${label} cash-flow capacité`);

  // Indicateurs recalculés.
  const ind = new Map(portfolioIndicators(data, p).map((i) => [i.id, i.value]));
  if (f.paymentsMonthly > 0) close(ind.get("dscr"), (f.rentMonthly * 12 - f.chargesAnnual) / (f.paymentsMonthly * 12), 1e-9, "DSCR");
  if (f.units > 0) close(ind.get("occupancy"), ((f.units - f.vacantUnits) / f.units) * 100, 1e-9, "occupation");

  // Projection : cash-flow = loyers − charges − mensualités, et la dette ne remonte jamais sans nouveau crédit.
  for (const r of p.years) close(r.cashflow, r.rent - r.charges - r.payments, 0.01, `${label} cash-flow ${r.year}`);
  // La dette de fin d'année ne dépasse jamais celle d'aujourd'hui, sauf crédits débloqués plus tard.
  const future = data.loans.filter((l) => (snap.resolvedLoans.get(l.id)?.fromMonth ?? 0) > NOW + 1);
  const futureDebt = future.reduce((s, l) => s + (snap.resolvedLoans.get(l.id)?.balance ?? 0), 0);
  if (!data.plans.length && !(data.projects ?? []).some((x) => x.inProjection)) {
    assert.ok(p.years[0].debt <= f.debt + (future.some((l) => (snap.resolvedLoans.get(l.id)?.fromMonth ?? 0) - 1 <= monthIndex(2026, 12)) ? futureDebt : 0) + 0.01, `${label} dette fin d'année`);
    if (!future.length) for (let i = 1; i < p.years.length; i++) assert.ok(p.years[i].debt <= p.years[i - 1].debt + 0.01, `${label} dette ${p.years[i].year}`);
  }
  return m;
}

test("dossier banque : totaux identiques d'une page à l'autre (groupe de démonstration)", () => {
  const data = demoData();
  checkGroup(data, "groupe");
  // Chaque société prise seule, et la somme des sociétés = le groupe.
  const roots = data.companies.filter((c) => !c.parentId);
  for (const c of data.companies) checkGroup(companySubset(data, c.id), c.name);
  const f = computeSnapshot(data, NOW).total;
  const sumRoots = roots.reduce((s, c) => s + computeSnapshot(companySubset(data, c.id), NOW).total.rentMonthly, 0);
  const direct = computeSnapshot(data, NOW).ownByCompany.get("_none")?.rentMonthly ?? 0;
  close(sumRoots + direct, f.rentMonthly, 0.5, "loyers des sociétés + en direct");
});

test("dossier banque : crédits à venir, inconnus et portés par une société", () => {
  const d = emptyData();
  d.companies.push({ id: "h", name: "Holding", kind: "holding" }, { id: "s", name: "SCI", kind: "SCI", parentId: "h" });
  d.buildings.push({ id: "b", name: "Immeuble", companyId: "s", value: 300000, rentMonthly: 2500, propertyTax: 1800 });
  d.loans.push(
    { id: "l1", buildingId: "b", initialAmount: 200000, ratePct: 3, durationMonths: 240, startDate: "2021-01-10" },
    { id: "l2", companyId: "h", initialAmount: 60000, ratePct: 4, durationMonths: 120, startDate: "2023-05-02" },
    // Signé, débloqué plus tard : hors totaux d'aujourd'hui.
    { id: "l3", buildingId: "b", initialAmount: 50000, ratePct: 3.5, durationMonths: 180, startDate: "2027-02-01" },
    // Capital inconnu : signalé, jamais inventé.
    { id: "l4", companyId: "s", monthlyPayment: 400 },
  );
  const m = checkGroup(d, "cas limites");
  close(m.companyLevelDebt, computeSnapshot(d, NOW).byLoan.get("l2")!.balance!, 0.5, "crédit porté par la holding");
  const all = m.loansByCompany.flatMap((g) => g.loans);
  assert.ok(all.find((l) => l.name === "Crédit" && l.note?.includes("Premières échéances")));
  assert.ok(all.some((l) => l.note?.includes("non communiqué")));
  assert.equal(computeSnapshot(d, NOW).total.unknownDebt, 1);
  // Le crédit débloqué en février 2027 n'est pas dans la dette 2026, mais l'est fin 2027.
  const p = project(d, NOW);
  const y26 = p.years.find((r) => r.year === 2026)!.debt;
  const y27 = p.years.find((r) => r.year === 2027)!.debt;
  assert.ok(y26 < computeSnapshot(d, NOW).total.debt + 0.01);
  assert.ok(y27 > y26 + 20000, `${y27} / ${y26}`);
});

test("rémunération : coût = cotisations + prélèvements + impôt + net, pour chaque source", () => {
  const d = emptyData();
  d.companies.push({ id: "sarl", name: "SARL", kind: "SARL", shareCapital: 8000, activity: { revenue: 400000, expenses: 250000 } }, { id: "sci", name: "SCI", kind: "SCI", partnerAccounts: 72000 });
  d.settings.household = { couple: true, parts: 2.5, otherIncome: 12000 };
  d.withdrawals.push(
    { id: "a", kind: "tns", person: "G", companyId: "sarl", annualAmount: 52000, startYear: 2026 },
    { id: "b", kind: "dividendes", person: "G", companyId: "sarl", annualAmount: 25000, startYear: 2026, dividendTax: "bareme" },
    { id: "c", kind: "salaire", person: "E", companyId: "sarl", annualAmount: 30000, startYear: 2026 },
    { id: "e", kind: "dividendes", person: "E", companyId: "sarl", annualAmount: 10000, startYear: 2026 },
    { id: "f", kind: "cca", person: "G", companyId: "sci", annualAmount: 12000, startYear: 2026 },
  );
  const r = remunerationYear(d, 2026, 2026);
  for (const s of r.sources) {
    const employer = s.withdrawal.kind === "salaire" ? 0 : 0;
    close(s.cost - employer, s.social + s.capitalSocial + s.incomeTax + s.net, 0.05, s.withdrawal.id);
  }
  close(r.cost, 52000 + 25000 + 30000 + 10000 + 12000, 0.01, "coût total");
  // L'impôt au barème attribué aux sources = impôt du foyer − impôt sur les autres revenus seuls.
  const pfu = 10000 * 0.128;
  const attributed = r.sources.reduce((s, x) => s + x.incomeTax, 0) - pfu;
  close(attributed, incomeTax(r.taxable, 2.5, true) - incomeTax(12000, 2.5, true), 0.1, "impôt au barème");
  // Salaire : brut = coût ÷ 1,45 ; net = brut × 0,78.
  const sal = salaryContributions(30000);
  close(sal.net, (30000 / 1.45) * 0.78, 0.01, "salaire net");
});

test("bilan : avant un bail importé, l'occupation est inconnue (jamais comptée vacante)", async () => {
  const { yearStats } = await import("../src/lib/engine/annual");
  const d = emptyData();
  d.buildings.push({ id: "b", name: "B" });
  d.units.push({ id: "u", buildingId: "b", name: "Lot 1", rent: 600, status: "occupe" });
  d.tenancies.push({ id: "t", unitId: "u", status: "actif", imported: true, tenants: [{ lastName: "X" }], startDate: "2026-06-15", rent: 600 });
  const s = yearStats(d, 2026, "2026-09-28");
  assert.equal(s.buildings[0].vacantMonths, 0);
  assert.equal(s.buildings[0].lostRent, 0);
  // Bail créé dans l'application (arrivée réelle) : le logement était vide avant.
  d.tenancies[0] = { ...d.tenancies[0], imported: false };
  assert.ok(yearStats(d, 2026, "2026-09-28").buildings[0].vacantMonths > 4);
});
