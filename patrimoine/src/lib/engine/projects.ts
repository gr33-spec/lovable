import type { AppData, Building, Company, Loan, Project, ProjectLoan, ProjectStatus, Unit, Work } from "../types";
import { annuityPayment } from "./loan";
import { NO_COMPANY } from "./snapshot";

// Projets : coût total, plan de financement, rentabilité prévisionnelle,
// intégration aux projections et conversion en données réelles.
// Aucun taux n'est supposé : un montant manquant reste « non renseigné ».

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  idee: "Idée",
  etude: "À l'étude",
  soumis: "Envoyé à la banque",
  accorde: "Accordé",
  realise: "Réalisé",
  abandonne: "Abandonné",
};

export const STATUS_ORDER: ProjectStatus[] = ["idee", "etude", "soumis", "accorde", "realise", "abandonne"];

/** Projet encore en cours (ni réalisé, ni abandonné). */
export const isOpen = (p: Project) => p.status !== "realise" && p.status !== "abandonne";

/** Pris en compte dans les projections (accueil, chronologie, dossier). */
export const inProjection = (p: Project) => isOpen(p) && !!p.inProjection;

const sum = (list: (number | undefined)[]) => list.reduce<number>((s, v) => s + (v ?? 0), 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface LoanFigures {
  loan: ProjectLoan;
  /** Mensualité d'amortissement hors assurance (après différé). */
  payment?: number;
  /** Mensualité pendant le différé (intérêts seuls). */
  deferralPayment?: number;
  insurance: number;
  /** Mensualité totale assurance comprise, hors différé. */
  monthly?: number;
  totalInterest?: number;
}

export function loanFigures(loan: ProjectLoan): LoanFigures {
  const insurance = loan.insuranceMonthly ?? 0;
  if (!loan.amount || !loan.durationMonths || loan.ratePct === undefined) return { loan, insurance };
  const r = loan.ratePct / 1200;
  const deferral = Math.min(Math.max(0, loan.deferralMonths ?? 0), loan.durationMonths - 1);
  const n = loan.durationMonths - deferral;
  const payment = annuityPayment(loan.amount, r, n);
  const deferralPayment = deferral > 0 ? loan.amount * r : undefined;
  return {
    loan,
    payment: round2(payment),
    deferralPayment: deferralPayment !== undefined ? round2(deferralPayment) : undefined,
    insurance,
    monthly: round2(payment + insurance),
    totalInterest: round2(payment * n + (deferralPayment ?? 0) * deferral - loan.amount),
  };
}

export interface ProjectFigures {
  // Emplois
  price?: number;
  notary?: number;
  agency: number;
  bankFees: number;
  works: number;
  otherCosts: number;
  /** Coût total du projet (undefined si le prix manque pour un achat). */
  totalCost?: number;
  // Ressources
  equity: number;
  loanTotal: number;
  resources: number;
  /** Reste à financer (positif) ou excédent (négatif). */
  gap?: number;
  loans: LoanFigures[];
  /** Mensualités de crédit (assurance comprise, hors différé). */
  monthlyPayments?: number;
  // Exploitation
  rentMonthly: number;
  recoverableCharges: number;
  vacancyMonthly: number;
  chargesAnnual: number;
  /** Loyers nets de vacance et de charges, par mois. */
  netRentMonthly: number;
  cashflowMonthly?: number;
  grossYieldPct?: number;
  netYieldPct?: number;
  /** Loyers nets ÷ mensualités. */
  dscr?: number;
  /** Données à compléter pour un dossier solide. */
  missing: string[];
}

export function projectFigures(p: Project): ProjectFigures {
  const acquisition = p.kind !== "travaux";
  const costs = p.costs ?? [];
  const works = sum(costs.filter((c) => c.kind === "travaux").map((c) => c.amount));
  const otherCosts = sum(costs.filter((c) => c.kind !== "travaux").map((c) => c.amount));
  const price = acquisition ? p.price : undefined;
  const notary = acquisition ? (p.notaryFees ?? (p.price && p.notaryFeesPct !== undefined ? round2((p.price * p.notaryFeesPct) / 100) : undefined)) : undefined;
  const agency = acquisition ? (p.agencyFees ?? 0) : 0;
  const bankFees = p.bankFees ?? 0;
  const totalCost = acquisition && !p.price ? undefined : round2((price ?? 0) + (notary ?? 0) + agency + bankFees + works + otherCosts);

  const loans = (p.loans ?? []).map(loanFigures);
  const loanTotal = sum((p.loans ?? []).map((l) => l.amount));
  const equity = p.equity ?? 0;
  const resources = loanTotal + equity;
  const allPayments = loans.every((l) => l.monthly !== undefined);
  const monthlyPayments = loans.length === 0 ? 0 : allPayments ? round2(sum(loans.map((l) => l.monthly))) : undefined;

  const lots = p.lots ?? [];
  const rentMonthly = sum(lots.map((l) => l.rent)) + (p.extraRentMonthly ?? 0);
  const recoverableCharges = sum(lots.map((l) => l.charges));
  const vacancyMonthly = round2((rentMonthly * (p.vacancyPct ?? 0)) / 100);
  const chargesAnnual = sum([p.propertyTax, p.insurance, p.coproCharges, p.otherCharges]);
  const netRentMonthly = round2(rentMonthly - vacancyMonthly - chargesAnnual / 12);
  const cashflowMonthly = monthlyPayments === undefined || rentMonthly === 0 ? undefined : round2(netRentMonthly - monthlyPayments);
  const grossYieldPct = totalCost && rentMonthly ? round2(((rentMonthly * 12) / totalCost) * 100) : undefined;
  const netYieldPct = totalCost && rentMonthly ? round2(((netRentMonthly * 12) / totalCost) * 100) : undefined;
  const dscr = monthlyPayments && rentMonthly ? round2(netRentMonthly / monthlyPayments) : undefined;

  const missing: string[] = [];
  if (acquisition && !p.price) missing.push("Prix d'achat");
  if (acquisition && p.notaryFees === undefined && p.notaryFeesPct === undefined) missing.push("Frais de notaire (montant ou taux)");
  if (!acquisition && !p.buildingId) missing.push("Immeuble concerné");
  if (!acquisition && works === 0) missing.push("Montant des travaux");
  if (rentMonthly === 0) missing.push("Loyers prévus");
  if ((p.loans ?? []).length === 0 && !p.equity) missing.push("Financement (prêt ou apport)");
  for (const l of loans) if (l.monthly === undefined) missing.push(`${l.loan.label || "Prêt"} : montant, taux et durée`);
  if (chargesAnnual === 0) missing.push("Charges (taxe foncière, assurance…)");
  if (acquisition && !p.companyId && !p.newCompanyName) missing.push("Société qui achète");
  if (totalCost !== undefined && Math.abs(totalCost - resources) > 1 && resources > 0) missing.push("Plan de financement non équilibré");

  return {
    price,
    notary,
    agency,
    bankFees,
    works,
    otherCosts,
    totalCost,
    equity,
    loanTotal,
    resources,
    gap: totalCost !== undefined ? round2(totalCost - resources) : undefined,
    loans,
    monthlyPayments,
    rentMonthly,
    recoverableCharges,
    vacancyMonthly,
    chargesAnnual,
    netRentMonthly,
    cashflowMonthly,
    grossYieldPct,
    netYieldPct,
    dscr,
    missing,
  };
}

/** Clé de société utilisée dans les projections pour un projet. */
export function projectCompanyKey(p: Project, data: AppData): string {
  if (p.kind === "travaux") return data.buildings.find((b) => b.id === p.buildingId)?.companyId ?? NO_COMPANY;
  if (p.companyId) return p.companyId;
  return p.newCompanyName ? `new-${p.id}` : NO_COMPANY;
}

/** Nom affiché de la société porteuse. */
export function projectCompanyName(p: Project, data: AppData): string | undefined {
  if (p.kind === "travaux") {
    const b = data.buildings.find((x) => x.id === p.buildingId);
    return data.companies.find((c) => c.id === b?.companyId)?.name;
  }
  if (p.companyId) return data.companies.find((c) => c.id === p.companyId)?.name;
  return p.newCompanyName ? `${p.newCompanyName} (à créer)` : undefined;
}

export function newProject(kind: Project["kind"], id: string, name?: string): Project {
  return {
    id,
    kind,
    name: name ?? (kind === "travaux" ? "Travaux" : "Nouveau projet"),
    status: "idee",
    createdAt: new Date().toISOString(),
    lots: [],
    costs: [],
    loans: [],
  };
}

// ——— Réalisation : le projet devient un immeuble, des logements, des crédits ———

export interface RealizeInput {
  purchaseDate?: string;
  price?: number;
  /** Prêts réellement obtenus (repris du projet puis corrigés). */
  loans: ProjectLoan[];
  /** Les logements sont déjà loués à l'achat. */
  rented?: boolean;
}

export interface RealizeResult {
  company?: Company;
  building?: Building;
  buildingPatch?: Building;
  units: Unit[];
  loans: Loan[];
  works: Work[];
  project: Project;
}

export function realizeProject(data: AppData, p: Project, input: RealizeInput, newId: () => string, today: string): RealizeResult {
  const date = input.purchaseDate ?? p.purchaseDate ?? today;
  const year = Number(date.slice(0, 4));
  let company: Company | undefined;
  let companyId = p.companyId ?? null;
  if (p.kind === "acquisition" && !companyId && p.newCompanyName) {
    company = { id: newId(), name: p.newCompanyName, kind: "SCI", parentId: p.newCompanyParentId ?? null };
    companyId = company.id;
  }

  let building: Building | undefined;
  let buildingPatch: Building | undefined;
  let buildingId: string;
  const existing = p.kind === "travaux" ? data.buildings.find((b) => b.id === p.buildingId) : undefined;
  if (existing) {
    buildingId = existing.id;
    buildingPatch = {
      ...existing,
      ...(p.valueAfterWorks ? { value: p.valueAfterWorks, valueMode: "manual" as const } : {}),
      lotsCount: existing.lotsCount !== undefined ? existing.lotsCount + (p.lots ?? []).length : existing.lotsCount,
    };
  } else {
    buildingId = newId();
    const price = input.price ?? p.price;
    building = {
      id: buildingId,
      name: p.name,
      companyId,
      address: p.address,
      city: p.city,
      acquisitionDate: date,
      acquisitionPrice: price,
      valueMode: "manual",
      value: p.valueAfterWorks ?? price,
      surface: p.surface,
      lotsCount: (p.lots ?? []).length || undefined,
      propertyTax: p.propertyTax,
      insurance: p.insurance,
      otherCharges: (p.coproCharges ?? 0) + (p.otherCharges ?? 0) || undefined,
      condition: p.condition,
      legalRegime: p.legalRegime,
      constructionPeriod: p.constructionPeriod,
      notes: p.description,
    };
  }

  const units: Unit[] = (p.lots ?? []).map((l) => ({
    id: newId(),
    buildingId,
    name: l.name,
    type: l.type,
    surface: l.surface,
    rent: l.rent,
    charges: l.charges,
    status: input.rented ? "occupe" : "vacant",
  }));

  const loans: Loan[] = input.loans
    .filter((l) => l.amount)
    .map((l) => ({
      id: newId(),
      name: l.label || `Prêt ${p.name}`,
      bank: l.bank,
      buildingId,
      companyId: existing?.companyId ?? companyId,
      kind: "amortissable",
      initialAmount: l.amount,
      ratePct: l.ratePct,
      durationMonths: l.durationMonths,
      startDate: date,
      insuranceMonthly: l.insuranceMonthly,
      notes: l.deferralMonths ? `Différé d'amortissement de ${l.deferralMonths} mois prévu au projet.` : undefined,
    }));

  const financed = loans.length > 0;
  const works: Work[] = (p.costs ?? [])
    .filter((c) => c.kind === "travaux")
    .map((c) => ({
      id: newId(),
      label: c.label,
      amount: c.amount,
      year,
      buildingId,
      status: "prevu",
      financedByLoan: financed,
      notes: `Issu du projet « ${p.name} ».`,
    }));

  return {
    company,
    building,
    buildingPatch,
    units,
    loans,
    works,
    project: {
      ...p,
      status: "realise",
      inProjection: false,
      purchaseDate: date,
      price: input.price ?? p.price,
      loans: input.loans,
      realizedAt: today,
      realizedBuildingId: buildingId,
      realizedCompanyId: company?.id ?? companyId ?? undefined,
      realizedLoanIds: loans.map((l) => l.id),
    },
  };
}
