import type { AppData, Company, Household, Withdrawal } from "../types";
import { CAPITAL, IR_BRACKETS, IR_DECOTE, IS, PASS, PROF_ALLOWANCE, QF_HALF_PART_CAP, SALARY, TNS, TNS_DIVIDEND_THRESHOLD } from "./bareme";

// Rémunération des dirigeants : cotisations, impôt sur le revenu du foyer,
// prélèvements sur dividendes et capacité des sociétés d'exploitation.
// Estimations fondées sur les barèmes 2026 (voir bareme.ts).

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (n: number) => Math.round(n * 100) / 100;

// ——— Travailleur non salarié (gérant majoritaire) ———

export interface TnsDetail {
  /** Revenu brut (coût pour la société, cotisations comprises). */
  gross: number;
  base: number;
  health: number;
  dailyAllowance: number;
  pension: number;
  disability: number;
  family: number;
  csgCrds: number;
  training: number;
  total: number;
  net: number;
  /** Net imposable avant l'abattement de 10 % (net + CSG non déductible et CRDS). */
  taxable: number;
}

/** Taux maladie-maternité (interpolé entre les paliers). */
function healthRate(base: number): number {
  const x = base / PASS;
  const steps = TNS.healthSteps;
  if (x >= steps[steps.length - 1][0]) return steps[steps.length - 1][1];
  for (let i = steps.length - 1; i > 0; i--) {
    const [x0, t0] = steps[i - 1];
    const [x1, t1] = steps[i];
    if (x >= x0 && x < x1) return x1 === x0 ? t1 : t0 + ((t1 - t0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}

export function tnsContributions(gross: number): TnsDetail {
  if (gross <= 0) return { gross: 0, base: 0, health: 0, dailyAllowance: 0, pension: 0, disability: 0, family: 0, csgCrds: 0, training: 0, total: 0, net: 0, taxable: 0 };
  const allowance = Math.min(gross, clamp(gross * TNS.allowanceRate, TNS.allowanceMinPass * PASS, TNS.allowanceMaxPass * PASS));
  const base = Math.max(0, gross - allowance);
  const capped = Math.min(base, PASS);
  const health = base <= 3 * PASS ? base * healthRate(base) : 3 * PASS * TNS.healthSteps[TNS.healthSteps.length - 1][1] + (base - 3 * PASS) * TNS.healthAbove3Pass;
  const dailyAllowance = Math.min(base, TNS.dailyAllowanceCapPass * PASS) * TNS.dailyAllowance;
  const pension =
    capped * TNS.pensionBase +
    base * TNS.pensionBaseUncapped +
    capped * TNS.pensionComplementary1 +
    clamp(base - PASS, 0, (TNS.pensionComplementaryCapPass - 1) * PASS) * TNS.pensionComplementary2;
  const disability = capped * TNS.disability;
  const x = base / PASS;
  const familyRate = x <= TNS.familyFromPass ? 0 : x >= TNS.familyFullPass ? TNS.family : (TNS.family * (x - TNS.familyFromPass)) / (TNS.familyFullPass - TNS.familyFromPass);
  const family = base * familyRate;
  const csgCrds = base * TNS.csgCrds;
  const training = TNS.trainingPass * PASS;
  const total = health + dailyAllowance + pension + disability + family + csgCrds + training;
  const net = gross - total;
  return {
    gross: r2(gross),
    base: r2(base),
    health: r2(health),
    dailyAllowance: r2(dailyAllowance),
    pension: r2(pension),
    disability: r2(disability),
    family: r2(family),
    csgCrds: r2(csgCrds),
    training: r2(training),
    total: r2(total),
    net: r2(net),
    taxable: r2(net + base * (TNS.csgCrds - TNS.csgDeductible)),
  };
}

// ——— Assimilé salarié ———

export interface SalaryDetail {
  cost: number;
  gross: number;
  employer: number;
  employee: number;
  total: number;
  net: number;
  taxable: number;
  pension: number;
}

export function salaryContributions(cost: number, h?: Household): SalaryDetail {
  const emp = (h?.salaryEmployeePct ?? SALARY.employee * 100) / 100;
  const pat = (h?.salaryEmployerPct ?? SALARY.employer * 100) / 100;
  const gross = cost / (1 + pat);
  const employer = cost - gross;
  const employee = gross * emp;
  const net = gross - employee;
  return {
    cost: r2(cost),
    gross: r2(gross),
    employer: r2(employer),
    employee: r2(employee),
    total: r2(employer + employee),
    net: r2(net),
    taxable: r2(net + gross * SALARY.csgBase * SALARY.csgNonDeductible),
    pension: r2(gross * SALARY.pensionShare),
  };
}

// ——— Impôt sur le revenu du foyer ———

function barème(income: number): number {
  let tax = 0;
  let prev = 0;
  for (const [upTo, rate] of IR_BRACKETS) {
    if (income <= prev) break;
    tax += (Math.min(income, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
}

/** Impôt sur le revenu au barème : quotient familial plafonné et décote. */
export function incomeTax(taxable: number, parts = 1, couple = false): number {
  if (taxable <= 0) return 0;
  const baseParts = couple ? 2 : 1;
  const n = Math.max(baseParts, parts);
  const withParts = barème(taxable / n) * n;
  const withoutExtra = barème(taxable / baseParts) * baseParts;
  const cap = ((n - baseParts) / 0.5) * QF_HALF_PART_CAP;
  let tax = Math.max(withParts, withoutExtra - cap);
  const threshold = couple ? IR_DECOTE.couple : IR_DECOTE.single;
  if (tax < threshold / IR_DECOTE.rate) tax = Math.max(0, tax - Math.max(0, threshold - IR_DECOTE.rate * tax));
  return r2(tax);
}

/** Tranche marginale d'imposition (taux du barème atteint par le quotient familial). */
export function marginalRate(taxable: number, parts = 1, couple = false): number {
  const q = taxable / Math.max(couple ? 2 : 1, parts);
  let prev = 0;
  for (const [upTo, rate] of IR_BRACKETS) {
    if (q <= upTo) return q > prev ? rate : 0;
    prev = upTo;
  }
  return IR_BRACKETS[IR_BRACKETS.length - 1][1];
}

const profAllowance = (x: number) => (x <= 0 ? 0 : Math.min(x, clamp(x * PROF_ALLOWANCE.rate, PROF_ALLOWANCE.min, PROF_ALLOWANCE.max)));

/** Impôt sur les sociétés d'un bénéfice (taux réduit sur la première tranche). */
export function corporateTax(profit: number): number {
  if (profit <= 0) return 0;
  return r2(Math.min(profit, IS.reducedCeiling) * IS.reducedRate + Math.max(0, profit - IS.reducedCeiling) * IS.normalRate);
}

// ——— Une année de rémunération ———

export interface SourceResult {
  withdrawal: Withdrawal;
  person: string;
  company?: Company;
  /** Coût pour la société (ou montant versé). */
  cost: number;
  social: number;
  /** Prélèvements sociaux sur dividendes (18,6 %). */
  capitalSocial: number;
  incomeTax: number;
  net: number;
  /** Cotisations retraite (droits acquis). */
  pension: number;
  detail?: TnsDetail | SalaryDetail;
  notes: string[];
}

export interface PersonResult {
  person: string;
  cost: number;
  social: number;
  tax: number;
  net: number;
  pension: number;
}

export interface CompanyCapacity {
  company: Company;
  profitBefore: number;
  remunerationCost: number;
  corporateTax: number;
  distributable: number;
  dividends: number;
}

export interface YearRemuneration {
  year: number;
  sources: SourceResult[];
  persons: PersonResult[];
  cost: number;
  social: number;
  tax: number;
  net: number;
  /** Revenu imposable au barème du foyer et taux marginal. */
  taxable: number;
  marginal: number;
  companies: CompanyCapacity[];
  warnings: string[];
}

/** Montant d'une sortie pour une année (croissance incluse), 0 hors période. */
export function amountFor(w: Withdrawal, year: number, y0: number): number {
  if (!w.annualAmount) return 0;
  const start = w.startYear ?? y0;
  if (year < start || (w.endYear !== undefined && year > w.endYear)) return 0;
  return w.annualAmount * Math.pow(1 + (w.growthPct ?? 0) / 100, year - start);
}

/** Chiffre d'affaires et charges d'une société d'exploitation pour une année. */
export function activityFor(c: Company, year: number, y0: number): { revenue: number; expenses: number } {
  const a = c.activity;
  if (!a) return { revenue: 0, expenses: 0 };
  const g = Math.pow(1 + (a.growthPct ?? 0) / 100, Math.max(0, year - y0));
  return { revenue: (a.revenue ?? 0) * g, expenses: (a.expenses ?? 0) * g };
}

export function remunerationYear(data: AppData, year: number, y0: number, override?: Withdrawal[]): YearRemuneration {
  const h = data.settings.household ?? {};
  const list = override ?? data.withdrawals;
  const parts = h.parts ?? (h.couple ? 2 : 1);
  const pfuIncome = (h.pfuIncomePct ?? CAPITAL.pfuIncome * 100) / 100;
  const socialDiv = (h.dividendSocialPct ?? CAPITAL.socialDividends * 100) / 100;
  const companyOf = (id?: string | null) => data.companies.find((c) => c.id === id);
  const warnings: string[] = [];

  // Rémunération TNS par (personne, société) : les dividendes excédentaires s'y ajoutent.
  const tnsKey = (w: Withdrawal) => `${w.person ?? ""}|${w.companyId ?? ""}`;
  const tnsGross = new Map<string, number>();
  for (const w of list) if (w.kind === "tns") tnsGross.set(tnsKey(w), (tnsGross.get(tnsKey(w)) ?? 0) + amountFor(w, year, y0));

  const sources: SourceResult[] = [];
  const barèmeByPerson = new Map<string, number>();
  const otherTaxable: number[] = [];
  const addWage = (person: string, v: number) => barèmeByPerson.set(person, (barèmeByPerson.get(person) ?? 0) + v);

  for (const w of list) {
    const amount = amountFor(w, year, y0);
    if (amount <= 0) continue;
    const person = w.person?.trim() || "Dirigeant";
    const company = companyOf(w.companyId);
    const base: SourceResult = { withdrawal: w, person, company, cost: amount, social: 0, capitalSocial: 0, incomeTax: 0, net: amount, pension: 0, notes: [] };
    if (w.kind === "tns") {
      // Cotisations calculées sur le total TNS de la personne dans la société, réparties au prorata.
      const total = tnsGross.get(tnsKey(w)) ?? amount;
      const d = tnsContributions(total);
      const share = total > 0 ? amount / total : 1;
      base.social = r2(d.total * share);
      base.net = r2(d.net * share);
      base.pension = r2(d.pension * share);
      base.detail = d;
      addWage(person, d.taxable * share);
    } else if (w.kind === "salaire") {
      const d = salaryContributions(amount, h);
      base.social = d.total;
      base.net = d.net;
      base.pension = d.pension;
      base.detail = d;
      addWage(person, d.taxable);
    } else if (w.kind === "dividendes") {
      // Gérant majoritaire de SARL : fraction > 10 % (capital + comptes courants) soumise aux cotisations TNS.
      let excess = 0;
      const key = tnsKey(w);
      if ((tnsGross.has(key) || w.majorityManager) && company) {
        excess = Math.max(0, amount - TNS_DIVIDEND_THRESHOLD * ((company.shareCapital ?? 0) + (company.partnerAccounts ?? 0)));
        if (excess > 0) {
          const t = tnsGross.get(key) ?? 0;
          const extra = tnsContributions(t + excess).total - tnsContributions(t).total;
          base.social = r2(extra);
          base.notes.push(`${Math.round(excess).toLocaleString("fr-FR")} € au-delà de 10 % du capital et des comptes courants : soumis aux cotisations TNS.`);
        }
      }
      base.capitalSocial = r2((amount - excess) * socialDiv);
      if (w.dividendTax === "bareme") {
        otherTaxable.push(amount * (1 - CAPITAL.dividendAllowance) - (amount - excess) * CAPITAL.deductibleCsg);
      } else {
        base.incomeTax = r2(amount * pfuIncome);
      }
      base.net = r2(amount - base.social - base.capitalSocial - base.incomeTax);
    } else if (w.kind === "cca") {
      base.net = amount;
    } else {
      base.net = r2(amount * (1 - (w.taxRatePct ?? 0) / 100));
      base.incomeTax = r2(amount - base.net);
    }
    sources.push(base);
  }

  // Impôt au barème du foyer : salaires et rémunérations TNS (abattement de 10 % par personne),
  // dividendes au barème et autres revenus.
  let taxable = h.otherIncome ?? 0;
  for (const v of barèmeByPerson.values()) taxable += v - profAllowance(v);
  for (const v of otherTaxable) taxable += v;
  taxable = Math.max(0, taxable);
  const withSources = incomeTax(taxable, parts, h.couple);
  const without = incomeTax(Math.max(0, h.otherIncome ?? 0), parts, h.couple);
  const due = Math.max(0, withSources - without);
  // Répartition de l'impôt dû sur les sources au barème, au prorata de leur revenu imposable.
  const barèmeSources = sources.filter((s) => s.withdrawal.kind === "tns" || s.withdrawal.kind === "salaire" || (s.withdrawal.kind === "dividendes" && s.withdrawal.dividendTax === "bareme"));
  const weight = (s: SourceResult) =>
    s.withdrawal.kind === "dividendes" ? s.cost * (1 - CAPITAL.dividendAllowance) : ((s.detail as TnsDetail | SalaryDetail | undefined)?.taxable ?? 0) * (s.withdrawal.kind === "tns" ? s.cost / (tnsGross.get(tnsKey(s.withdrawal)) || s.cost) : 1);
  const totalWeight = barèmeSources.reduce((a, s) => a + weight(s), 0);
  for (const s of barèmeSources) {
    const part = totalWeight > 0 ? (due * weight(s)) / totalWeight : 0;
    s.incomeTax = r2(s.incomeTax + part);
    s.net = r2(s.net - part);
  }

  // Sociétés d'exploitation : bénéfice, impôt sur les sociétés, capacité de distribution.
  const companies: CompanyCapacity[] = [];
  for (const c of data.companies.filter((x) => x.activity && (x.activity.revenue || x.activity.expenses))) {
    const { revenue, expenses } = activityFor(c, year, y0);
    const remunerationCost = sources.filter((s) => s.company?.id === c.id && (s.withdrawal.kind === "tns" || s.withdrawal.kind === "salaire")).reduce((a, s) => a + s.cost, 0);
    const profitBefore = revenue - expenses - remunerationCost;
    const tax = corporateTax(profitBefore);
    const distributable = Math.max(0, profitBefore - tax);
    const dividends = sources.filter((s) => s.company?.id === c.id && s.withdrawal.kind === "dividendes").reduce((a, s) => a + s.cost, 0);
    if (profitBefore < 0) warnings.push(`${c.name} : la rémunération dépasse le résultat de l'année ${year} (${Math.round(profitBefore).toLocaleString("fr-FR")} €).`);
    if (dividends > distributable + 1) warnings.push(`${c.name} : dividendes ${year} supérieurs au bénéfice distribuable (${Math.round(distributable).toLocaleString("fr-FR")} €), sauf réserves existantes.`);
    companies.push({ company: c, profitBefore: r2(profitBefore), remunerationCost: r2(remunerationCost), corporateTax: tax, distributable: r2(distributable), dividends: r2(dividends) });
  }
  // Comptes courants : pas plus que le solde.
  for (const c of data.companies) {
    const repaid = sources.filter((s) => s.company?.id === c.id && s.withdrawal.kind === "cca").reduce((a, s) => a + s.cost, 0);
    if (repaid > 0 && repaid > (c.partnerAccounts ?? 0) + 1) warnings.push(`${c.name} : remboursement de compte courant supérieur au solde déclaré (${Math.round(c.partnerAccounts ?? 0).toLocaleString("fr-FR")} €).`);
  }

  const byPerson = new Map<string, PersonResult>();
  for (const s of sources) {
    const p = byPerson.get(s.person) ?? { person: s.person, cost: 0, social: 0, tax: 0, net: 0, pension: 0 };
    p.cost += s.cost;
    p.social += s.social + s.capitalSocial;
    p.tax += s.incomeTax;
    p.net += s.net;
    p.pension += s.pension;
    byPerson.set(s.person, p);
  }
  const persons = [...byPerson.values()].map((p) => ({ ...p, cost: r2(p.cost), social: r2(p.social), tax: r2(p.tax), net: r2(p.net), pension: r2(p.pension) }));
  const sum = (k: keyof PersonResult) => r2(persons.reduce((a, p) => a + (p[k] as number), 0));
  return {
    year,
    sources,
    persons,
    cost: sum("cost"),
    social: sum("social"),
    tax: sum("tax"),
    net: sum("net"),
    taxable: r2(taxable),
    marginal: marginalRate(taxable, parts, h.couple),
    companies,
    warnings,
  };
}

// ——— Comparateur : même bénéfice disponible, différentes façons de se rémunérer ———

export interface CompareOption {
  label: string;
  /** Rémunération (coût pour la société) et dividendes bruts de l'option. */
  remuneration: number;
  dividends: number;
  cost: number;
  corporateTax: number;
  social: number;
  tax: number;
  net: number;
}

/**
 * Pour un bénéfice avant rémunération et avant IS `budget`, net perçu par une
 * personne selon la voie choisie (la société verse tout). Les autres sources
 * du foyer sont conservées.
 */
export function compareOptions(data: AppData, year: number, y0: number, person: string, companyId: string, budget: number, statut: "tns" | "salaire"): { options: CompareOption[]; best: CompareOption } {
  const others = data.withdrawals.filter((w) => (w.person?.trim() || "Dirigeant") !== person);
  const run = (label: string, remuneration: number): CompareOption => {
    const profit = budget - remuneration;
    const is = corporateTax(profit);
    const dividends = Math.max(0, profit - is);
    const test: Withdrawal[] = [...others];
    if (remuneration > 0) test.push({ id: "cmp-r", kind: statut, person, companyId, annualAmount: remuneration, startYear: year });
    if (dividends > 0) test.push({ id: "cmp-d", kind: "dividendes", person, companyId, annualAmount: dividends, startYear: year, dividendTax: "pfu", majorityManager: statut === "tns" });
    const r = remunerationYear(data, year, y0, test);
    const p = r.persons.find((x) => x.person === person);
    return { label, remuneration, dividends, cost: remuneration + dividends, corporateTax: is, social: p?.social ?? 0, tax: p?.tax ?? 0, net: p?.net ?? 0 };
  };
  const salaryLabel = statut === "tns" ? "Tout en rémunération TNS" : "Tout en salaire";
  const options = [run(salaryLabel, budget), run("Tout en dividendes", 0)];
  // Meilleur mélange : rémunération par pas de 1 000 €, le reste en dividendes.
  let best = options[0].net >= options[1].net ? options[0] : options[1];
  const step = Math.max(500, Math.round(budget / 60 / 500) * 500);
  for (let r = step; r < budget; r += step) {
    const o = run("", r);
    if (o.net > best.net + 1) best = { ...o, label: `Rémunération ${Math.round(r).toLocaleString("fr-FR")} € + dividendes` };
  }
  if (!best.label) best = { ...best, label: "Mélange" };
  return { options, best };
}
