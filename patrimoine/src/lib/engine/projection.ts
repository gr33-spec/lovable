import type { Action, AppData, Building, Unit } from "../types";
import { monthIndex, parseMonth, yearOf, type MonthIndex } from "./dates";
import { inProjection, projectCompanyKey, projectFigures } from "./projects";
import { activityFor, amountFor, corporateTax } from "../fiscal/remuneration";
import { WITHDRAWAL_KINDS, labelOf } from "../labels";
import { annuityPayment, stepLoan, type LoanState } from "./loan";
import {
  NO_COMPANY,
  buildingChargesAnnual,
  buildingRent,
  buildingValue,
  computeSnapshot,
  loanCompanyKey,
  type Snapshot,
} from "./snapshot";

// Projection mensuelle sur 30 ans, agrégée par année, pour le groupe et
// pour chaque société. C'est l'unique source des chiffres futurs : tableau
// de bord, chronologie, simulations et dossier banque l'utilisent tous.

export const HORIZON_YEARS = 30;

export interface YearRow {
  year: number;
  /** Valeurs au 31/12 (ou fin de projection). */
  value: number;
  debt: number;
  net: number;
  treasury: number;
  /** Flux annuels (l'année en cours est annualisée). */
  rent: number;
  charges: number;
  payments: number;
  cashflow: number;
  /** Flux ponctuels de l'année (non annualisés). */
  works: number;
  withdrawals: number;
  /** Résultat des sociétés d'exploitation après IS (hors rémunérations, déjà comptées). */
  business: number;
  balloons: number;
  operations: number;
  /** Nombre de crédits en cours au 31/12. */
  activeLoans: number;
}

export type EventKind =
  | "loan_end"
  | "balloon"
  | "works"
  | "sale"
  | "purchase"
  | "refinance"
  | "prepayment"
  | "event"
  | "acquisition"
  | "income";

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  month: MonthIndex;
  year: number;
  companyKey: string;
  label: string;
  amount?: number;
  /** Variation de la sortie mensuelle (ex. mensualité libérée). */
  monthlyFreed?: number;
  source: "real" | "plan" | "scenario";
  refId?: string;
  loanId?: string;
}

export interface SaleResult {
  actionId: string;
  buildingId: string;
  year: number;
  price?: number;
  debtRepaid: number;
  fees: number;
  tax: number;
  netCash?: number;
  rentLostMonthly: number;
  paymentsRemovedMonthly: number;
  chargesRemovedAnnual: number;
  valueRemoved: number;
}

export interface Projection {
  nowMonth: MonthIndex;
  years: YearRow[];
  byCompany: Map<string, YearRow[]>;
  events: TimelineEvent[];
  sales: SaleResult[];
  /** Crédits sans données suffisantes pour projeter la dette. */
  incompleteLoans: string[];
  snapshot: Snapshot;
}

interface BuildingState {
  id: string;
  companyKey: string;
  value?: number;
  rent0: number;
  charges0: number;
  /** Mois de référence des valeurs (croissance calculée depuis ce mois). */
  refMonth: MonthIndex;
  activeFrom: MonthIndex;
  /** Début des loyers, si différent (mise en location après travaux). */
  rentFrom?: MonthIndex;
  soldAt?: MonthIndex;
}

interface ProjLoan extends LoanState {
  id: string;
  name: string;
  companyKey: string;
  buildingId?: string;
  fromMonth: MonthIndex;
  /** Solde inconnu : seules les mensualités sont projetées. */
  paymentOnly: boolean;
  /** Solde connu mais échéancier impossible : dette maintenue constante. */
  frozen: boolean;
  source: "real" | "plan" | "scenario";
}

function emptyRow(year: number): YearRow {
  return {
    year,
    value: 0,
    debt: 0,
    net: 0,
    treasury: 0,
    rent: 0,
    charges: 0,
    payments: 0,
    cashflow: 0,
    works: 0,
    withdrawals: 0,
    business: 0,
    balloons: 0,
    operations: 0,
    activeLoans: 0,
  };
}

function actionMonth(year: number, nowMonth: MonthIndex): MonthIndex {
  return Math.max(nowMonth, monthIndex(year, 1));
}

function growth(pct: number | undefined, fromMonth: MonthIndex, m: MonthIndex): number {
  if (!pct) return 1;
  return Math.pow(1 + pct / 100, (m - fromMonth) / 12);
}

export interface ProjectionOptions {
  /** Opérations de scénario ajoutées aux plans validés. */
  scenarioActions?: Action[];
  /** Ignorer les opérations validées (plans). */
  ignorePlans?: boolean;
  horizonYears?: number;
}

export function project(data: AppData, nowMonth: MonthIndex, opts: ProjectionOptions = {}): Projection {
  const horizon = opts.horizonYears ?? HORIZON_YEARS;
  const snapshot = computeSnapshot(data, nowMonth);
  const settings = data.settings;
  const y0 = yearOf(nowMonth);
  const lastMonth = monthIndex(y0 + horizon, 12);

  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  const unitsByBuilding = new Map<string, Unit[]>();
  for (const u of data.units) {
    const list = unitsByBuilding.get(u.buildingId) ?? [];
    list.push(u);
    unitsByBuilding.set(u.buildingId, list);
  }
  const companyName = (key: string) => data.companies.find((c) => c.id === key)?.name;
  const buildingName = (id?: string | null) => (id ? buildingsById.get(id)?.name : undefined);

  // ——— État initial ———
  const buildings: BuildingState[] = data.buildings.map((b: Building) => {
    const units = unitsByBuilding.get(b.id) ?? [];
    const acq = b.acquisitionDate ? Number(b.acquisitionDate.slice(0, 4)) : undefined;
    const acqMonth = acq && acq > y0 ? monthIndex(acq, Number(b.acquisitionDate!.slice(5, 7)) || 1) : nowMonth;
    return {
      id: b.id,
      companyKey: b.companyId ?? NO_COMPANY,
      value: buildingValue(b, units),
      rent0: buildingRent(b, units).rent,
      charges0: buildingChargesAnnual(b),
      refMonth: nowMonth,
      activeFrom: acqMonth,
    };
  });

  const incompleteLoans: string[] = [];
  const loans: ProjLoan[] = [];
  for (const loan of data.loans) {
    const r = snapshot.resolvedLoans.get(loan.id)!;
    if (r.finished) continue;
    const paymentOnly = r.balance === undefined;
    const frozen = !paymentOnly && r.payment === undefined;
    if (paymentOnly && r.payment === undefined) {
      incompleteLoans.push(loan.id);
      continue;
    }
    if (paymentOnly || frozen) incompleteLoans.push(loan.id);
    loans.push({
      id: loan.id,
      name: loan.name || (loan.bank ? `Prêt ${loan.bank}` : "Crédit"),
      companyKey: loanCompanyKey(loan, buildingsById),
      buildingId: loan.buildingId ?? undefined,
      fromMonth: r.fromMonth,
      balance: r.balance ?? 0,
      monthlyRate: r.monthlyRate,
      payment: r.payment ?? 0,
      insurance: r.insurance,
      endMonth: r.endMonth,
      kind: r.kind,
      active: true,
      paymentOnly,
      frozen,
      source: "real",
    });
  }

  const treasury = new Map<string, number>();
  const addTreasury = (key: string, amount: number) => treasury.set(key, (treasury.get(key) ?? 0) + amount);
  for (const c of data.companies) if (c.cash) addTreasury(c.id, c.cash);

  // ——— Opérations ———
  type Op = { action: Action; source: "plan" | "scenario"; month: MonthIndex };
  const ops: Op[] = [
    ...(opts.ignorePlans ? [] : data.plans.map((a) => ({ action: a, source: "plan" as const }))),
    ...(opts.scenarioActions ?? []).map((a) => ({ action: a, source: "scenario" as const })),
  ]
    .filter((o) => o.action.year >= y0 && o.action.year <= y0 + horizon)
    .map((o) => ({ ...o, month: actionMonth(o.action.year, nowMonth) }));

  const events: TimelineEvent[] = [];
  const sales: SaleResult[] = [];

  // Travaux réels non terminés.
  const worksByMonth = new Map<MonthIndex, { key: string; amount: number }[]>();
  for (const w of data.works) {
    if (w.status === "termine" || !w.year) continue;
    const month = actionMonth(Math.max(w.year, y0), nowMonth);
    if (month > lastMonth) continue;
    const key = w.buildingId
      ? (buildingsById.get(w.buildingId)?.companyId ?? w.companyId ?? NO_COMPANY)
      : (w.companyId ?? NO_COMPANY);
    const list = worksByMonth.get(month) ?? [];
    // Travaux financés par un crédit : la dépense est couverte par l'emprunt.
    list.push({ key, amount: w.financedByLoan ? 0 : (w.amount ?? 0) });
    worksByMonth.set(month, list);
    const where = buildingName(w.buildingId) ?? companyName(key);
    events.push({
      id: `works-${w.id}`,
      kind: "works",
      month,
      year: yearOf(month),
      companyKey: key,
      label: where ? `${w.label} — ${where}` : w.label,
      amount: w.amount,
      source: "real",
      refId: w.id,
    });
  }

  for (const e of data.events) {
    if (e.year < y0 || e.year > y0 + horizon) continue;
    events.push({
      id: `event-${e.id}`,
      kind: "event",
      month: monthIndex(e.year, 1),
      year: e.year,
      companyKey: e.companyId ?? NO_COMPANY,
      label: e.label,
      amount: e.amount,
      source: "real",
      refId: e.id,
    });
  }

  for (const b of buildings) {
    if (b.activeFrom > nowMonth) {
      events.push({
        id: `acq-${b.id}`,
        kind: "acquisition",
        month: b.activeFrom,
        year: yearOf(b.activeFrom),
        companyKey: b.companyKey,
        label: `Acquisition — ${buildingName(b.id)}`,
        source: "real",
        refId: b.id,
      });
    }
  }

  // Projets intégrés aux projections (achat ou travaux à venir).
  const worksUplift = (after: number | undefined, buildingId?: string | null) => {
    const b = buildingId ? buildingsById.get(buildingId) : undefined;
    const before = b ? buildingValue(b, unitsByBuilding.get(b.id) ?? []) : undefined;
    return after !== undefined && before !== undefined ? Math.max(0, after - before) : undefined;
  };
  const projectOutflows = new Map<MonthIndex, { key: string; amount: number }[]>();
  const interestOnly: { key: string; from: MonthIndex; to: MonthIndex; amount: number }[] = [];
  for (const p of (data.projects ?? []).filter(inProjection)) {
    const f = projectFigures(p);
    const m = Math.max(nowMonth, parseMonth(p.purchaseDate) ?? nowMonth);
    if (m > lastMonth) continue;
    const key = projectCompanyKey(p, data);
    const rentFrom = Math.max(m, parseMonth(p.rentStartDate) ?? m);
    const id = `proj-${p.id}`;
    buildings.push({
      id,
      companyKey: key,
      // Travaux : seule la plus-value éventuelle s'ajoute (la valeur actuelle est déjà comptée).
      value: p.kind === "travaux" ? worksUplift(p.valueAfterWorks, p.buildingId) : (p.valueAfterWorks ?? p.price),
      rent0: f.rentMonthly - f.vacancyMonthly,
      charges0: f.chargesAnnual,
      refMonth: m,
      activeFrom: m,
      rentFrom,
    });
    for (const lf of f.loans) {
      const l = lf.loan;
      if (!l.amount || lf.payment === undefined || !l.durationMonths) continue;
      const deferral = Math.min(Math.max(0, l.deferralMonths ?? 0), l.durationMonths - 1);
      if (deferral > 0) interestOnly.push({ key, from: m + 1, to: m + deferral, amount: (lf.deferralPayment ?? 0) + lf.insurance });
      loans.push({
        id: `loan-${p.id}-${l.id}`,
        name: l.label || `Prêt ${p.name}`,
        companyKey: key,
        buildingId: id,
        fromMonth: m + 1 + deferral,
        balance: l.amount,
        monthlyRate: (l.ratePct ?? 0) / 1200,
        payment: lf.payment,
        insurance: lf.insurance,
        endMonth: m + l.durationMonths,
        kind: "amortissable",
        active: true,
        paymentOnly: false,
        frozen: false,
        source: "plan",
      });
    }
    // Part non empruntée : payée par la trésorerie à l'acte.
    const out = (f.totalCost ?? 0) - f.loanTotal;
    if (out > 0) projectOutflows.set(m, [...(projectOutflows.get(m) ?? []), { key, amount: out }]);
    events.push({
      id: `project-${p.id}`,
      kind: p.kind === "travaux" ? "works" : "purchase",
      month: m,
      year: yearOf(m),
      companyKey: key,
      label: `${p.kind === "travaux" ? "Travaux" : "Achat"} — ${p.name}`,
      amount: f.totalCost,
      source: "plan",
      refId: p.id,
    });
  }

  // Rémunérations : début et fin, repères de la chronologie.
  const activityCompanies = data.companies.filter((c) => c.activity && (c.activity.revenue || c.activity.expenses));
  for (const w of data.withdrawals) {
    if (!w.annualAmount || w.kind === "cca") continue;
    const who = [w.person, companyName(w.companyId ?? "")].filter(Boolean).join(" · ");
    const kind = labelOf(WITHDRAWAL_KINDS, w.kind) ?? "Rémunération";
    const start = w.startYear ?? y0;
    if (start > y0 && start <= y0 + horizon) {
      events.push({ id: `income-${w.id}`, kind: "income", month: monthIndex(start, 1), year: start, companyKey: w.companyId ?? NO_COMPANY, label: `${kind}${who ? ` — ${who}` : ""}`, amount: w.annualAmount, source: "real", refId: w.id });
    }
    if (w.endYear !== undefined && w.endYear >= y0 && w.endYear < y0 + horizon) {
      events.push({ id: `income-end-${w.id}`, kind: "income", month: monthIndex(w.endYear + 1, 1), year: w.endYear + 1, companyKey: w.companyId ?? NO_COMPANY, label: `Fin : ${kind.toLowerCase()}${who ? ` — ${who}` : ""}`, source: "real", refId: w.id });
    }
  }

  // ——— Boucle mensuelle ———
  const keys = new Set<string>([NO_COMPANY, ...data.companies.map((c) => c.id)]);
  const rows = new Map<string, YearRow[]>();
  for (const k of keys) rows.set(k, []);
  const rowFor = (key: string, year: number): YearRow => {
    if (!rows.has(key)) rows.set(key, []);
    const list = rows.get(key)!;
    const idx = year - y0;
    while (list.length <= idx) list.push(emptyRow(y0 + list.length));
    return list[idx];
  };

  const loanPayoff = (l: ProjLoan) => {
    const amount = l.paymentOnly ? 0 : l.balance;
    l.balance = 0;
    l.active = false;
    return amount;
  };

  for (let m = nowMonth; m <= lastMonth; m++) {
    const year = yearOf(m);

    for (const op of ops.filter((o) => o.month === m)) {
      const a = op.action;
      if (a.type === "sale") {
        const b = buildings.find((x) => x.id === a.buildingId && x.soldAt === undefined);
        if (!b) continue;
        const bLoans = loans.filter((l) => l.buildingId === b.id && l.active && l.fromMonth <= m);
        const paymentsRemoved = bLoans.reduce((s, l) => s + (l.payment + l.insurance), 0);
        const debtRepaid = bLoans.reduce((s, l) => s + loanPayoff(l), 0);
        const g = growth(settings.rentGrowthPct, b.refMonth, m);
        const rentLost = b.rent0 * g;
        const chargesRemoved = b.charges0 * growth(settings.chargesGrowthPct, b.refMonth, m);
        const valueRemoved = (b.value ?? 0) * growth(settings.valueGrowthPct, b.refMonth, m);
        b.soldAt = m;
        const fees = a.fees ?? 0;
        const tax = a.tax ?? 0;
        const netCash = a.price !== undefined ? a.price - fees - tax - debtRepaid : undefined;
        if (netCash !== undefined) {
          addTreasury(b.companyKey, netCash);
          rowFor(b.companyKey, year).operations += netCash;
        }
        sales.push({
          actionId: a.id,
          buildingId: b.id,
          year,
          price: a.price,
          debtRepaid,
          fees,
          tax,
          netCash,
          rentLostMonthly: rentLost,
          paymentsRemovedMonthly: paymentsRemoved,
          chargesRemovedAnnual: chargesRemoved,
          valueRemoved,
        });
        events.push({
          id: `sale-${a.id}`,
          kind: "sale",
          month: m,
          year,
          companyKey: b.companyKey,
          label: `Vente — ${buildingName(b.id) ?? "immeuble"}`,
          amount: a.price,
          source: op.source,
          refId: a.id,
        });
      } else if (a.type === "purchase") {
        const key = a.companyId ?? NO_COMPANY;
        buildings.push({
          id: a.id,
          companyKey: key,
          value: a.price,
          rent0: a.rentMonthly ?? 0,
          charges0: a.chargesAnnual ?? 0,
          refMonth: m,
          activeFrom: m,
        });
        const loanAmount = a.loanAmount ?? 0;
        if (loanAmount > 0) {
          const rate = (a.ratePct ?? 0) / 1200;
          const n = Math.max(1, Math.round((a.durationYears ?? 20) * 12));
          loans.push({
            id: `loan-${a.id}`,
            name: `Prêt ${a.name}`,
            companyKey: key,
            buildingId: a.id,
            fromMonth: m + 1,
            balance: loanAmount,
            monthlyRate: rate,
            payment: annuityPayment(loanAmount, rate, n),
            insurance: 0,
            endMonth: m + n,
            kind: "amortissable",
            active: true,
            paymentOnly: false,
            frozen: false,
            source: op.source,
          });
        }
        const out = (a.price ?? 0) + (a.fees ?? 0) - loanAmount;
        addTreasury(key, -out);
        rowFor(key, year).operations -= out;
        events.push({
          id: `purchase-${a.id}`,
          kind: "purchase",
          month: m,
          year,
          companyKey: key,
          label: `Achat — ${a.name}`,
          amount: a.price,
          source: op.source,
          refId: a.id,
        });
      } else if (a.type === "refinance") {
        const old = loans.filter((l) => a.loanIds.includes(l.id) && l.active);
        const payoff = old.reduce((s, l) => s + loanPayoff(l), 0);
        const amount = a.amount ?? payoff;
        const key = a.companyId ?? old[0]?.companyKey ?? NO_COMPANY;
        const buildingId = a.buildingId ?? old[0]?.buildingId;
        if (amount > 0) {
          const rate = (a.ratePct ?? 0) / 1200;
          const n = Math.max(1, Math.round((a.durationYears ?? 20) * 12));
          loans.push({
            id: `loan-${a.id}`,
            name: "Refinancement",
            companyKey: key,
            buildingId: buildingId ?? undefined,
            fromMonth: m + 1,
            balance: amount,
            monthlyRate: rate,
            payment: annuityPayment(amount, rate, n),
            insurance: 0,
            endMonth: m + n,
            kind: "amortissable",
            active: true,
            paymentOnly: false,
            frozen: false,
            source: op.source,
          });
        }
        const net = amount - payoff - (a.fees ?? 0);
        addTreasury(key, net);
        rowFor(key, year).operations += net;
        events.push({
          id: `refi-${a.id}`,
          kind: "refinance",
          month: m,
          year,
          companyKey: key,
          label: "Refinancement",
          amount,
          source: op.source,
          refId: a.id,
        });
      } else if (a.type === "works") {
        const key = a.buildingId
          ? (buildingsById.get(a.buildingId)?.companyId ?? a.companyId ?? NO_COMPANY)
          : (a.companyId ?? NO_COMPANY);
        const amount = a.amount ?? 0;
        addTreasury(key, -amount);
        rowFor(key, year).works += amount;
        events.push({
          id: `worksop-${a.id}`,
          kind: "works",
          month: m,
          year,
          companyKey: key,
          label: a.label || "Travaux",
          amount: a.amount,
          source: op.source,
          refId: a.id,
        });
      } else if (a.type === "prepayment") {
        const l = loans.find((x) => x.id === a.loanId && x.active && !x.paymentOnly);
        if (!l) continue;
        const amount = Math.min(a.amount ?? 0, l.balance);
        l.balance -= amount;
        if (a.mode === "mensualite" && l.endMonth !== undefined && l.kind === "amortissable") {
          l.payment = annuityPayment(l.balance, l.monthlyRate, Math.max(1, l.endMonth - m + 1));
        }
        addTreasury(l.companyKey, -amount);
        rowFor(l.companyKey, year).operations -= amount;
        events.push({
          id: `prepay-${a.id}`,
          kind: "prepayment",
          month: m,
          year,
          companyKey: l.companyKey,
          label: `Remboursement anticipé — ${l.name}`,
          amount,
          source: op.source,
          refId: a.id,
        });
      }
    }

    for (const w of worksByMonth.get(m) ?? []) {
      addTreasury(w.key, -w.amount);
      rowFor(w.key, year).works += w.amount;
    }
    for (const o of projectOutflows.get(m) ?? []) {
      addTreasury(o.key, -o.amount);
      rowFor(o.key, year).operations -= o.amount;
    }
    for (const d of interestOnly) {
      if (m < d.from || m > d.to) continue;
      rowFor(d.key, year).payments += d.amount;
      addTreasury(d.key, -d.amount);
    }

    for (const b of buildings) {
      if (m < b.activeFrom || (b.soldAt !== undefined && m >= b.soldAt)) continue;
      const row = rowFor(b.companyKey, year);
      const rent = m < (b.rentFrom ?? b.activeFrom) ? 0 : b.rent0 * growth(settings.rentGrowthPct, b.refMonth, m);
      const charges = (b.charges0 / 12) * growth(settings.chargesGrowthPct, b.refMonth, m);
      row.rent += rent;
      row.charges += charges;
      addTreasury(b.companyKey, rent - charges);
    }

    for (const l of loans) {
      if (!l.active || m < l.fromMonth) continue;
      const row = rowFor(l.companyKey, year);
      if (l.paymentOnly || l.frozen) {
        if (l.endMonth !== undefined && m > l.endMonth) {
          l.active = false;
          continue;
        }
        const pay = l.paymentOnly ? l.payment + l.insurance : 0;
        row.payments += pay;
        addTreasury(l.companyKey, -pay);
        if (l.endMonth !== undefined && m === l.endMonth) {
          l.active = false;
          if (l.frozen) {
            row.balloons += l.balance;
            addTreasury(l.companyKey, -l.balance);
            l.balance = 0;
          }
          events.push(loanEndEvent(l, m, pay));
        }
        continue;
      }
      const p = stepLoan(l, m);
      row.payments += p.regular;
      row.balloons += p.balloon;
      addTreasury(l.companyKey, -(p.regular + p.balloon));
      if (p.ended) {
        events.push(loanEndEvent(l, m, l.payment + l.insurance));
        if (p.balloon > 50) {
          events.push({
            id: `balloon-${l.id}`,
            kind: "balloon",
            month: m,
            year,
            companyKey: l.companyKey,
            label: `Remboursement du capital — ${l.name}`,
            amount: p.balloon,
            source: l.source,
            loanId: l.id,
          });
        }
      }
    }

    for (const w of data.withdrawals) {
      const annual = amountFor(w, year, y0);
      if (!annual) continue;
      const key = w.companyId ?? NO_COMPANY;
      const amount = annual / 12;
      rowFor(key, year).withdrawals += amount;
      addTreasury(key, -amount);
    }

    // Sociétés d'exploitation : résultat après impôt sur les sociétés, et prestations facturées aux sociétés du groupe.
    for (const c of activityCompanies) {
      const { revenue, expenses } = activityFor(c, year, y0);
      const remuneration = data.withdrawals.filter((w) => w.companyId === c.id && (w.kind === "tns" || w.kind === "salaire")).reduce((s, w) => s + amountFor(w, year, y0), 0);
      const result = (revenue - expenses - corporateTax(revenue - expenses - remuneration)) / 12;
      rowFor(c.id, year).business += result;
      addTreasury(c.id, result);
      const g = Math.pow(1 + (c.activity?.growthPct ?? 0) / 100, Math.max(0, year - y0));
      for (const b of c.activity?.billed ?? []) {
        if (!b.annualAmount || !b.companyId) continue;
        const billed = (b.annualAmount * g) / 12;
        rowFor(b.companyId, year).charges += billed;
        addTreasury(b.companyId, -billed);
      }
    }

    // Clôture d'année : valeurs de stock.
    if (m % 12 === 11 || m === lastMonth) {
      for (const key of rows.keys()) {
        const row = rowFor(key, year);
        row.value = 0;
        row.debt = 0;
        row.activeLoans = 0;
      }
      for (const b of buildings) {
        if (m < b.activeFrom || (b.soldAt !== undefined && m >= b.soldAt)) continue;
        rowFor(b.companyKey, year).value += (b.value ?? 0) * growth(settings.valueGrowthPct, b.refMonth, m);
      }
      for (const l of loans) {
        if (!l.active || l.paymentOnly) continue;
        const row = rowFor(l.companyKey, year);
        row.debt += l.balance;
        row.activeLoans += 1;
      }
      for (const key of rows.keys()) {
        const row = rowFor(key, year);
        row.treasury = treasury.get(key) ?? 0;
        row.net = row.value - row.debt;
      }
    }
  }

  // Annualisation de l'année en cours et cash-flow.
  const monthsInFirstYear = 12 - (nowMonth % 12);
  const scale = 12 / monthsInFirstYear;
  for (const list of rows.values()) {
    const first = list[0];
    if (first) {
      first.rent *= scale;
      first.charges *= scale;
      first.payments *= scale;
    }
    for (const row of list) row.cashflow = row.rent - row.charges - row.payments;
  }

  const years: YearRow[] = [];
  for (let i = 0; i <= horizon; i++) {
    const total = emptyRow(y0 + i);
    for (const list of rows.values()) {
      const row = list[i];
      if (!row) continue;
      for (const k of Object.keys(total) as (keyof YearRow)[]) {
        if (k !== "year") total[k] += row[k];
      }
    }
    years.push(total);
  }

  events.sort((a, b) => a.month - b.month);
  return { nowMonth, years, byCompany: rows, events, sales, incompleteLoans, snapshot };
}

function loanEndEvent(l: ProjLoan, m: MonthIndex, freed: number): TimelineEvent {
  return {
    id: `end-${l.id}`,
    kind: "loan_end",
    month: m,
    year: yearOf(m),
    companyKey: l.companyKey,
    label: `Fin — ${l.name}`,
    monthlyFreed: freed,
    source: l.source,
    loanId: l.id,
  };
}

export function rowForYear(p: Projection, year: number, key?: string): YearRow | undefined {
  const list = key ? p.byCompany.get(key) : p.years;
  return list?.find((r) => r.year === year);
}

/** Première année où la dette projetée est nulle. */
export function debtFreeYear(p: Projection): number | undefined {
  if ((p.years[0]?.debt ?? 0) <= 0) return undefined;
  return p.years.find((r) => r.debt < 1)?.year;
}

/** Première année où la dette est divisée par deux par rapport à aujourd'hui. */
export function halfDebtYear(p: Projection): number | undefined {
  const d0 = p.snapshot.total.debt;
  if (d0 <= 0) return undefined;
  return p.years.find((r) => r.debt <= d0 / 2)?.year;
}
