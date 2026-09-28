import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyData, type AppData } from "../src/lib/types";
import { compareOptions, corporateTax, incomeTax, marginalRate, remunerationYear, salaryContributions, tnsContributions } from "../src/lib/fiscal/remuneration";
import { project } from "../src/lib/engine/projection";
import { monthIndex } from "../src/lib/engine/dates";

const close = (a: number | undefined, b: number, tol = 1) => assert.ok(a !== undefined && Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test("impôt sur le revenu : barème 2026, quotient familial, décote", () => {
  // (29 315 − 11 497) × 11 % + (50 000 − 29 315) × 30 %
  close(incomeTax(50000, 1), 8165.48, 0.02);
  // Couple, 2 parts : deux fois l'impôt de 40 000 €.
  close(incomeTax(80000, 2, true), 10330.96, 0.02);
  // Décote pour un petit impôt (célibataire) : 897 − 45,25 % × impôt brut.
  const brut = (20000 - 11497) * 0.11;
  close(incomeTax(20000, 1), brut - (897 - 0.4525 * brut), 0.02);
  assert.equal(incomeTax(10000, 1), 0);
  // Plafonnement : une demi-part de plus ne fait pas gagner plus de 1 807 €.
  const couple = incomeTax(200000, 2, true);
  assert.ok(couple - incomeTax(200000, 2.5, true) <= 1807 + 0.01);
  assert.equal(marginalRate(50000, 1), 0.3);
  assert.equal(marginalRate(20000, 2, true), 0);
});

test("impôt sur les sociétés : 15 % jusqu'à 42 500 €, 25 % au-delà", () => {
  assert.equal(corporateTax(40000), 6000);
  assert.equal(corporateTax(60000), 6375 + 4375);
  assert.equal(corporateTax(-5000), 0);
});

test("gérant majoritaire TNS : assiette abattue de 26 % et cotisations 2026", () => {
  const d = tnsContributions(40000);
  close(d.base, 29600, 0.01);
  // Retraite de base 17,87 % + 0,72 %, complémentaire 8,1 % (sous le PASS).
  close(d.pension, 29600 * (0.1787 + 0.0072 + 0.081), 0.05);
  close(d.csgCrds, 29600 * 0.097, 0.01);
  assert.equal(d.family, 0);
  // Ordre de grandeur publié : ~45 % du net.
  const ratio = d.total / d.net;
  assert.ok(ratio > 0.4 && ratio < 0.5, `${ratio}`);
  assert.equal(d.net, 40000 - d.total);
  // Allocations familiales au-delà de 140 % du PASS : 3,1 %.
  const high = tnsContributions(120000);
  close(high.family, high.base * 0.031, 0.05);
});

test("assimilé salarié : coût, brut et net avec les taux moyens (modifiables)", () => {
  const d = salaryContributions(58000);
  close(d.gross, 40000, 0.01);
  close(d.net, 31200, 0.01);
  const custom = salaryContributions(58000, { salaryEmployeePct: 20, salaryEmployerPct: 40 });
  close(custom.gross, 58000 / 1.4, 0.01);
});

function sarl(): AppData {
  const d = emptyData();
  d.companies.push({ id: "sarl", name: "SARL BAT", kind: "SARL", shareCapital: 10000, partnerAccounts: 0, activity: { revenue: 300000, expenses: 180000, billed: [{ companyId: "sci", annualAmount: 12000 }] } });
  d.companies.push({ id: "sci", name: "SCI", kind: "SCI", partnerAccounts: 50000 });
  d.settings.household = { couple: true, parts: 2 };
  return d;
}

test("rémunération du foyer : TNS + dividendes + salaire, IS et distribuable", () => {
  const d = sarl();
  d.withdrawals.push({ id: "a", kind: "tns", person: "Grégory", companyId: "sarl", annualAmount: 45000, startYear: 2026 });
  d.withdrawals.push({ id: "b", kind: "dividendes", person: "Grégory", companyId: "sarl", annualAmount: 20000, startYear: 2026 });
  d.withdrawals.push({ id: "c", kind: "salaire", person: "Enora", companyId: "sarl", annualAmount: 20000, startYear: 2026 });
  d.withdrawals.push({ id: "d", kind: "cca", person: "Grégory", companyId: "sci", annualAmount: 6000, startYear: 2026 });
  const r = remunerationYear(d, 2026, 2026);
  const div = r.sources.find((s) => s.withdrawal.id === "b")!;
  // 10 % de 10 000 € = 1 000 € : 19 000 € supportent les cotisations TNS, 1 000 € les prélèvements sociaux.
  close(div.capitalSocial, 1000 * 0.186, 0.01);
  assert.ok(div.social > 5000);
  close(div.incomeTax, 20000 * 0.128, 0.01);
  const cca = r.sources.find((s) => s.withdrawal.id === "d")!;
  assert.equal(cca.net, 6000);
  // Bénéfice de la SARL : 300 000 − 180 000 − 45 000 − 20 000 = 55 000 €.
  const c = r.companies[0];
  assert.equal(c.profitBefore, 55000);
  assert.equal(c.corporateTax, corporateTax(55000));
  assert.deepEqual(r.warnings, []);
  // La somme par personne correspond au total.
  close(r.persons.reduce((s, p) => s + p.net, 0), r.net, 0.05);
  assert.equal(r.cost, 91000);
  // Une rémunération au-delà du résultat est signalée.
  d.withdrawals.push({ id: "e", kind: "dividendes", person: "Enora", companyId: "sarl", annualAmount: 60000, startYear: 2026 });
  assert.ok(remunerationYear(d, 2026, 2026).warnings.some((w) => w.includes("distribuable")));
});

test("comparateur : même bénéfice, rémunération ou dividendes", () => {
  const d = sarl();
  const { options, best } = compareOptions(d, 2026, 2026, "Grégory", "sarl", 80000, "tns");
  assert.equal(options.length, 2);
  assert.ok(best.net >= Math.max(...options.map((o) => o.net)));
  // Rémunération + IS + dividendes = bénéfice disponible.
  close(best.remuneration + best.corporateTax + best.dividends, 80000, 1);
  const allDiv = options[1];
  assert.equal(allDiv.remuneration, 0);
  close(allDiv.dividends, 80000 - corporateTax(80000), 0.01);
  // Gérant majoritaire : même sans rémunération, les dividendes au-delà de 10 % du capital supportent les cotisations TNS.
  assert.ok(allDiv.social > allDiv.dividends * 0.186 + 1000);
  const sas = compareOptions(d, 2026, 2026, "Grégory", "sarl", 80000, "salaire").options[1];
  close(sas.social, sas.dividends * 0.186, 1);
});

test("projections : croissance, activité après IS, facturation aux SCI, repères", () => {
  const d = sarl();
  d.withdrawals.push({ id: "a", kind: "tns", person: "Grégory", companyId: "sarl", annualAmount: 40000, startYear: 2027, endYear: 2030, growthPct: 10 });
  const p = project(d, monthIndex(2026, 1));
  const sarl27 = p.byCompany.get("sarl")!.find((r) => r.year === 2027)!;
  close(sarl27.withdrawals, 40000, 1);
  const sarl28 = p.byCompany.get("sarl")!.find((r) => r.year === 2028)!;
  close(sarl28.withdrawals, 44000, 1);
  close(sarl27.business, 120000 - corporateTax(80000), 1);
  const sci = p.byCompany.get("sci")!.find((r) => r.year === 2027)!;
  close(sci.charges, 12000, 1);
  assert.ok(p.events.some((e) => e.kind === "income" && e.year === 2027));
  assert.ok(p.events.some((e) => e.kind === "income" && e.year === 2031));
});
