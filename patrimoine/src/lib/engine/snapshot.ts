import type { AppData, Building, Company, Loan, Unit } from "../types";
import type { MonthIndex } from "./dates";
import { resolveLoan, type ResolvedLoan } from "./loan";

// Photographie « aujourd'hui » : valeurs, dettes, loyers, charges et
// mensualités par immeuble, par société (avec consolidation des filiales)
// et pour le groupe.

export const NO_COMPANY = "_none";

export interface Figures {
  /** Valeur des biens valorisés. */
  value: number;
  /** Nombre d'immeubles sans valeur connue. */
  unvalued: number;
  debt: number;
  /** Crédits dont le capital restant dû est inconnu. */
  unknownDebt: number;
  /** Crédits en cours dont la mensualité est inconnue. */
  unknownPayment: number;
  rentMonthly: number;
  /** Loyers si tous les logements étaient loués. */
  potentialRentMonthly: number;
  chargesAnnual: number;
  paymentsMonthly: number;
  cash: number;
  partnerAccounts: number;
  buildings: number;
  units: number;
  vacantUnits: number;
  loans: number;
}

export function emptyFigures(): Figures {
  return {
    value: 0,
    unvalued: 0,
    debt: 0,
    unknownDebt: 0,
    unknownPayment: 0,
    rentMonthly: 0,
    potentialRentMonthly: 0,
    chargesAnnual: 0,
    paymentsMonthly: 0,
    cash: 0,
    partnerAccounts: 0,
    buildings: 0,
    units: 0,
    vacantUnits: 0,
    loans: 0,
  };
}

export function addFigures(a: Figures, b: Figures): Figures {
  const out = { ...a };
  for (const key of Object.keys(b) as (keyof Figures)[]) out[key] = a[key] + b[key];
  return out;
}

export function netWorth(f: Figures): number {
  return f.value - f.debt;
}

export function cashflowMonthly(f: Figures): number {
  return f.rentMonthly - f.chargesAnnual / 12 - f.paymentsMonthly;
}

/** LTV en %, undefined si aucune valeur connue. */
export function ltv(f: Figures): number | undefined {
  if (f.value <= 0) return undefined;
  return (f.debt / f.value) * 100;
}

// ——— Immeubles ———

export function buildingValue(b: Building, units: Unit[]): number | undefined {
  const bySurface = b.surface && b.pricePerSqm ? b.surface * b.pricePerSqm : undefined;
  if (b.valueMode === "surface" && bySurface !== undefined) return bySurface;
  if (b.value !== undefined && b.value !== null) return b.value;
  if (bySurface !== undefined) return bySurface;
  const valued = units.filter((u) => u.value !== undefined);
  if (valued.length > 0) return valued.reduce((s, u) => s + (u.value ?? 0), 0);
  return undefined;
}

export function buildingRent(b: Building, units: Unit[]): { rent: number; potential: number } {
  const withRent = units.filter((u) => u.rent !== undefined && u.rent > 0);
  if (withRent.length === 0) {
    const r = b.rentMonthly ?? 0;
    return { rent: r, potential: r };
  }
  const rent = withRent.filter((u) => u.status !== "vacant").reduce((s, u) => s + (u.rent ?? 0), 0);
  const potential = withRent.reduce((s, u) => s + (u.rent ?? 0), 0);
  return { rent, potential };
}

export function buildingChargesAnnual(b: Building): number {
  return (b.propertyTax ?? 0) + (b.insurance ?? 0) + (b.accounting ?? 0) + (b.otherCharges ?? 0);
}

export function loanCompanyKey(loan: Loan, buildingsById: Map<string, Building>): string {
  if (loan.buildingId) {
    const b = buildingsById.get(loan.buildingId);
    if (b) return b.companyId ?? NO_COMPANY;
  }
  return loan.companyId ?? NO_COMPANY;
}

export interface Snapshot {
  nowMonth: MonthIndex;
  resolvedLoans: Map<string, ResolvedLoan>;
  byBuilding: Map<string, Figures>;
  /** Chiffres propres à chaque société (hors filiales). */
  ownByCompany: Map<string, Figures>;
  /** Chiffres consolidés (société + filiales). */
  byCompany: Map<string, Figures>;
  byLoan: Map<string, { balance?: number; paymentMonthly: number }>;
  total: Figures;
}

export function loanNowFigures(r: ResolvedLoan, nowMonth: MonthIndex) {
  const started = r.fromMonth <= nowMonth;
  const running = !r.finished && started && (r.endMonth === undefined || r.endMonth >= nowMonth);
  const paymentMonthly = running && r.payment !== undefined ? r.payment + r.insurance : 0;
  const balance = r.finished ? 0 : started ? r.balance : 0;
  return { balance, paymentMonthly };
}

export function computeSnapshot(data: AppData, nowMonth: MonthIndex): Snapshot {
  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  const unitsByBuilding = new Map<string, Unit[]>();
  for (const u of data.units) {
    const list = unitsByBuilding.get(u.buildingId) ?? [];
    list.push(u);
    unitsByBuilding.set(u.buildingId, list);
  }

  const byBuilding = new Map<string, Figures>();
  const ownByCompany = new Map<string, Figures>();
  const addToCompany = (key: string, f: Figures) => {
    ownByCompany.set(key, addFigures(ownByCompany.get(key) ?? emptyFigures(), f));
  };

  for (const b of data.buildings) {
    const units = unitsByBuilding.get(b.id) ?? [];
    const f = emptyFigures();
    const value = buildingValue(b, units);
    if (value === undefined) f.unvalued = 1;
    else f.value = value;
    const { rent, potential } = buildingRent(b, units);
    f.rentMonthly = rent;
    f.potentialRentMonthly = potential;
    f.chargesAnnual = buildingChargesAnnual(b);
    f.buildings = 1;
    f.units = units.length || b.lotsCount || 0;
    f.vacantUnits = units.filter((u) => u.status === "vacant").length;
    byBuilding.set(b.id, f);
  }

  const resolvedLoans = new Map<string, ResolvedLoan>();
  const byLoan = new Map<string, { balance?: number; paymentMonthly: number }>();
  const loanFigs = new Map<string, Figures>();
  for (const loan of data.loans) {
    const r = resolveLoan(loan, nowMonth);
    resolvedLoans.set(loan.id, r);
    const now = loanNowFigures(r, nowMonth);
    byLoan.set(loan.id, now);
    const f = emptyFigures();
    if (now.balance === undefined) f.unknownDebt = 1;
    else f.debt = now.balance;
    f.paymentsMonthly = now.paymentMonthly;
    if (!r.finished && r.payment === undefined) f.unknownPayment = 1;
    f.loans = r.finished ? 0 : 1;
    loanFigs.set(loan.id, f);
    if (loan.buildingId && byBuilding.has(loan.buildingId)) {
      byBuilding.set(loan.buildingId, addFigures(byBuilding.get(loan.buildingId)!, f));
    } else {
      addToCompany(loanCompanyKey(loan, buildingsById), f);
    }
  }

  for (const b of data.buildings) addToCompany(b.companyId ?? NO_COMPANY, byBuilding.get(b.id)!);

  for (const c of data.companies) {
    const f = emptyFigures();
    f.cash = c.cash ?? 0;
    f.partnerAccounts = c.partnerAccounts ?? 0;
    addToCompany(c.id, f);
  }

  // Consolidation : société + toutes ses filiales (protection contre les cycles).
  const children = new Map<string, Company[]>();
  for (const c of data.companies) {
    if (c.parentId) {
      const list = children.get(c.parentId) ?? [];
      list.push(c);
      children.set(c.parentId, list);
    }
  }
  const byCompany = new Map<string, Figures>();
  const consolidate = (id: string, seen: Set<string>): Figures => {
    if (seen.has(id)) return emptyFigures();
    seen.add(id);
    let f = ownByCompany.get(id) ?? emptyFigures();
    for (const child of children.get(id) ?? []) f = addFigures(f, consolidate(child.id, seen));
    return f;
  };
  for (const c of data.companies) byCompany.set(c.id, consolidate(c.id, new Set()));

  let total = emptyFigures();
  for (const f of ownByCompany.values()) total = addFigures(total, f);

  return { nowMonth, resolvedLoans, byBuilding, ownByCompany, byCompany, byLoan, total };
}

/** Sociétés classées : racines d'abord, puis filiales (ordre d'affichage). */
export function companyTree(companies: Company[]): { company: Company; depth: number }[] {
  const ids = new Set(companies.map((c) => c.id));
  const out: { company: Company; depth: number }[] = [];
  const seen = new Set<string>();
  const visit = (c: Company, depth: number) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    out.push({ company: c, depth });
    companies.filter((x) => x.parentId === c.id).forEach((x) => visit(x, depth + 1));
  };
  companies.filter((c) => !c.parentId || !ids.has(c.parentId)).forEach((c) => visit(c, 0));
  companies.forEach((c) => visit(c, 0));
  return out;
}
