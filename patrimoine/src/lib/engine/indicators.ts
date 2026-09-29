import type { AppData, Statement, StatementFigures } from "../types";
import type { Projection } from "./projection";
import { NO_COMPANY, rentalCharges, rentalPayments, rentalValue, type Figures } from "./snapshot";

// Indicateurs financiers : calculés à partir des données de l'application
// (temps réel) et des comptes annuels saisis ou importés. Chaque indicateur
// porte une appréciation simple et une explication en une phrase.
// Les seuils sont des repères usuels, pas des règles bancaires officielles.

export type Level = "good" | "watch" | "alert" | "neutral";

export interface Indicator {
  id: string;
  label: string;
  /** Valeur numérique brute (undefined = données insuffisantes). */
  value?: number;
  format: "pct" | "ratio" | "eur" | "years" | "count" | "months";
  level: Level;
  explain: string;
  group: "Rentabilité" | "Endettement" | "Occupation" | "Structure de la dette" | "Comptes annuels";
  /** Valeur approchée (« env. », « max. ») : mensualités estimées ou charges manquantes. Pas de verdict dans ce cas. */
  approx?: "env." | "max.";
}

const level = (v: number | undefined, good: (v: number) => boolean, watch: (v: number) => boolean): Level =>
  v === undefined ? "neutral" : good(v) ? "good" : watch(v) ? "watch" : "alert";

/** Annuités de l'activité locative (hors crédits de la résidence principale ou secondaire). */
function annualDebtService(f: Figures): number {
  return rentalPayments(f) * 12;
}

export function portfolioIndicators(data: AppData, p: Projection): Indicator[] {
  const snap = p.snapshot;
  const t = snap.total;
  const rentYear = t.rentMonthly * 12;
  const potentialYear = t.potentialRentMonthly * 12;
  const chargesYear = rentalCharges(t);
  const debtService = annualDebtService(t);
  const noi = rentYear - chargesYear; // revenu net d'exploitation (avant crédits)
  const valued = t.unvalued === 0 && t.value > 0;
  // Rendements : loyers rapportés aux seuls biens locatifs (la résidence principale ne rapporte rien).
  const rentalV = rentalValue(t);
  const yieldBase = rentalV !== undefined && rentalV > 0 ? rentalV : undefined;

  // Structure de la dette : taux moyen pondéré et durée résiduelle pondérée.
  let rateWeight = 0;
  let rateSum = 0;
  let durWeight = 0;
  let durSum = 0;
  for (const loan of data.loans) {
    const r = snap.resolvedLoans.get(loan.id);
    const bal = snap.byLoan.get(loan.id)?.balance;
    if (!r || r.finished || bal === undefined || bal <= 0) continue;
    const rate = loan.ratePct ?? r.impliedRatePct;
    if (rate !== undefined) {
      rateSum += rate * bal;
      rateWeight += bal;
    }
    if (r.endMonth !== undefined) {
      durSum += ((r.endMonth - p.nowMonth) / 12) * bal;
      durWeight += bal;
    }
  }
  const debt = t.debt;
  const debtIn = (years: number) => p.years[years]?.debt;
  const amortized = (years: number) => (debt > 0 && debtIn(years) !== undefined ? (1 - debtIn(years)! / debt) * 100 : undefined);

  // Concentration : poids de la première société dans les loyers.
  const rents = data.companies.map((c) => snap.ownByCompany.get(c.id)?.rentMonthly ?? 0).concat(snap.ownByCompany.get(NO_COMPANY)?.rentMonthly ?? 0);
  const topShare = t.rentMonthly > 0 ? (Math.max(0, ...rents) / t.rentMonthly) * 100 : undefined;
  const occupied = t.units > 0 ? ((t.units - t.vacantUnits) / t.units) * 100 : undefined;

  // Même règle que le tableau de bord et le dossier : un ratio bâti sur des estimations est signalé, sans verdict.
  const chargesMissing = data.buildings.some((b) => {
    const bf = snap.byBuilding.get(b.id);
    return !!bf && bf.rentMonthly > 0 && bf.chargesAnnual === 0;
  });
  const flowMark: Indicator["approx"] = t.unknownPayment > 0 ? "env." : chargesMissing ? "max." : undefined;
  const flowIds = new Set(["dscr", "cf-margin", "net-yield"]);
  const paymentIds = new Set(["effort", "debt-years"]);
  const list: Indicator[] = [
    {
      id: "dscr",
      group: "Endettement",
      label: "Couverture de la dette (DSCR)",
      value: debtService > 0 ? noi / debtService : undefined,
      format: "ratio",
      level: level(debtService > 0 ? noi / debtService : undefined, (v) => v >= 1.3, (v) => v >= 1.1),
      explain: "Loyers nets de charges ÷ mensualités des crédits locatifs. Au-dessus de 1,3 : confortable pour une banque.",
    },
    {
      id: "effort",
      group: "Endettement",
      label: "Poids des crédits dans les loyers",
      value: rentYear > 0 ? (debtService / rentYear) * 100 : undefined,
      format: "pct",
      level: level(rentYear > 0 ? (debtService / rentYear) * 100 : undefined, (v) => v <= 65, (v) => v <= 80),
      explain: "Part des loyers absorbée par les mensualités.",
    },
    {
      id: "ltv",
      group: "Endettement",
      label: "LTV (dette / valeur)",
      value: valued ? (debt / t.value) * 100 : undefined,
      format: "pct",
      level: level(valued ? (debt / t.value) * 100 : undefined, (v) => v <= 60, (v) => v <= 80),
      explain: "Capital restant dû rapporté à la valeur des biens. Plus il est bas, plus la marge de manœuvre est grande.",
    },
    {
      id: "debt-years",
      group: "Endettement",
      label: "Années de loyers nets pour rembourser",
      value: noi > 0 && debt - t.personalDebt > 0 ? (debt - t.personalDebt) / noi : undefined,
      format: "years",
      level: level(noi > 0 && debt - t.personalDebt > 0 ? (debt - t.personalDebt) / noi : undefined, (v) => v <= 10, (v) => v <= 15),
      explain: "Dette locative ÷ loyers nets annuels : le nombre d'années théoriques pour la rembourser.",
    },
    {
      id: "gross-yield",
      group: "Rentabilité",
      label: "Rendement brut",
      value: yieldBase ? (rentYear / yieldBase) * 100 : undefined,
      format: "pct",
      level: level(yieldBase ? (rentYear / yieldBase) * 100 : undefined, (v) => v >= 7, (v) => v >= 5),
      explain: "Loyers annuels ÷ valeur des biens locatifs (hors résidence principale).",
    },
    {
      id: "net-yield",
      group: "Rentabilité",
      label: "Rendement net de charges",
      value: yieldBase ? (noi / yieldBase) * 100 : undefined,
      format: "pct",
      level: level(yieldBase ? (noi / yieldBase) * 100 : undefined, (v) => v >= 5.5, (v) => v >= 4),
      explain: "(Loyers − charges) ÷ valeur des biens locatifs.",
    },
    {
      id: "cf-margin",
      group: "Rentabilité",
      label: "Taux de transformation en cash-flow",
      value: rentYear > 0 ? ((noi - debtService) / rentYear) * 100 : undefined,
      format: "pct",
      level: level(rentYear > 0 ? ((noi - debtService) / rentYear) * 100 : undefined, (v) => v >= 20, (v) => v >= 5),
      explain: "Part des loyers qui reste après charges et crédits.",
    },
    {
      id: "rent-per-unit",
      group: "Occupation",
      label: "Loyer moyen par lot",
      value: t.units - t.vacantUnits > 0 && t.rentMonthly > 0 ? t.rentMonthly / (t.units - t.vacantUnits) : undefined,
      format: "eur",
      level: "neutral",
      explain: "Loyer mensuel moyen des lots occupés.",
    },
    {
      id: "occupancy",
      group: "Occupation",
      label: "Taux d'occupation",
      value: occupied,
      format: "pct",
      level: level(occupied, (v) => v >= 95, (v) => v >= 88),
      explain: "Lots occupés ÷ lots détaillés.",
    },
    {
      id: "vacancy-loss",
      group: "Occupation",
      label: "Vacance financière",
      value: potentialYear > 0 ? ((potentialYear - rentYear) / potentialYear) * 100 : undefined,
      format: "pct",
      level: level(potentialYear > 0 ? ((potentialYear - rentYear) / potentialYear) * 100 : undefined, (v) => v <= 3, (v) => v <= 8),
      explain: "Loyers non perçus (lots vacants) ÷ loyers potentiels.",
    },
    {
      id: "concentration",
      group: "Occupation",
      label: "Poids de la 1re société dans les loyers",
      value: topShare,
      format: "pct",
      level: level(topShare, (v) => v <= 35, (v) => v <= 55),
      explain: "Diversification : plus c'est bas, moins le groupe dépend d'un seul actif.",
    },
    {
      id: "avg-rate",
      group: "Structure de la dette",
      label: "Taux moyen pondéré",
      value: rateWeight > 0 ? rateSum / rateWeight : undefined,
      format: "pct",
      level: "neutral",
      explain:
        rateWeight > 0 && debt > 0
          ? `Calculé sur ${Math.round((rateWeight / debt) * 100)} % de l'encours (crédits au taux connu).`
          : "Renseignez les taux des crédits.",
    },
    {
      id: "avg-duration",
      group: "Structure de la dette",
      label: "Durée résiduelle moyenne",
      value: durWeight > 0 ? durSum / durWeight : undefined,
      format: "years",
      level: "neutral",
      explain: "Durée restante des crédits, pondérée par le capital restant dû.",
    },
    {
      id: "amortized-5",
      group: "Structure de la dette",
      label: "Dette remboursée d'ici 5 ans",
      value: amortized(5),
      format: "pct",
      level: "neutral",
      explain: "Part de l'encours actuel amortie dans les 5 prochaines années.",
    },
    {
      id: "amortized-10",
      group: "Structure de la dette",
      label: "Dette remboursée d'ici 10 ans",
      value: amortized(10),
      format: "pct",
      level: "neutral",
      explain: "Part de l'encours actuel amortie dans les 10 prochaines années.",
    },
  ];
  for (const ind of list) {
    const mark = flowIds.has(ind.id) ? flowMark : paymentIds.has(ind.id) && t.unknownPayment > 0 ? "env." : undefined;
    if (mark && ind.value !== undefined) {
      ind.approx = mark;
      ind.level = "neutral";
      ind.explain = `${ind.explain} Valeur ${mark === "env." ? "estimée (mensualités non confirmées)" : "maximale (charges non renseignées)"}.`;
    }
  }
  return list;
}

// ——— Comptes annuels ———

export interface StatementRatios {
  ebe?: number;
  caf?: number;
  netMargin?: number;
  roe?: number;
  gearing?: number;
  debtToCaf?: number;
  interestCoverage?: number;
}

/** Ratios d'un exercice (EBE et CAF approchés à partir des postes principaux). */
export function statementRatios(f: StatementFigures): StatementRatios {
  const ebe = f.operatingResult !== undefined ? f.operatingResult + (f.depreciation ?? 0) : undefined;
  const caf = f.netResult !== undefined ? f.netResult + (f.depreciation ?? 0) : undefined;
  return {
    ebe,
    caf,
    netMargin: f.netResult !== undefined && f.revenue ? (f.netResult / f.revenue) * 100 : undefined,
    roe: f.netResult !== undefined && f.equity && f.equity > 0 ? (f.netResult / f.equity) * 100 : undefined,
    gearing: f.bankDebt !== undefined && f.equity && f.equity > 0 ? f.bankDebt / f.equity : undefined,
    debtToCaf: f.bankDebt !== undefined && caf && caf > 0 ? f.bankDebt / caf : undefined,
    interestCoverage: ebe !== undefined && f.financialCharges && f.financialCharges > 0 ? ebe / f.financialCharges : undefined,
  };
}

/** Dernier exercice et précédent pour une société. */
export function latestStatements(data: AppData, companyId: string): { last?: Statement; prev?: Statement } {
  const list = data.statements.filter((s) => s.companyId === companyId).sort((a, b) => b.year - a.year);
  return { last: list[0], prev: list[1] };
}

export function evolution(cur?: number, prev?: number): number | undefined {
  if (cur === undefined || prev === undefined || prev === 0) return undefined;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** Indicateurs agrégés des derniers comptes annuels de toutes les sociétés. */
export function groupStatementIndicators(data: AppData, p: Projection): Indicator[] {
  const lasts = data.companies.map((c) => latestStatements(data, c.id).last).filter((s): s is Statement => !!s);
  // Annuités des seules sociétés dont on a les comptes (périmètre cohérent).
  const debtService = lasts.reduce((acc, s) => acc + rentalPayments(p.snapshot.ownByCompany.get(s.companyId) ?? ({ paymentsMonthly: 0, personalPaymentsMonthly: 0 } as Figures)) * 12, 0);
  if (lasts.length === 0) return [];
  const sum = (k: keyof StatementFigures) => {
    const vals = lasts.map((s) => s.figures[k]).filter((v): v is number => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
  };
  const f: StatementFigures = {
    revenue: sum("revenue"),
    operatingResult: sum("operatingResult"),
    depreciation: sum("depreciation"),
    financialCharges: sum("financialCharges"),
    netResult: sum("netResult"),
    equity: sum("equity"),
    bankDebt: sum("bankDebt"),
    cash: sum("cash"),
  };
  const r = statementRatios(f);
  const years = [...new Set(lasts.map((s) => s.year))].sort().join(", ");
  const scope = `Derniers comptes (${lasts.length} société${lasts.length > 1 ? "s" : ""}, exercice ${years}).`;
  return [
    { id: "st-caf", group: "Comptes annuels", label: "Capacité d'autofinancement (CAF)", value: r.caf, format: "eur", level: level(r.caf, (v) => v > 0, () => false), explain: `Résultat net + dotations aux amortissements. ${scope}` },
    { id: "st-ebe", group: "Comptes annuels", label: "Excédent brut d'exploitation (EBE)", value: r.ebe, format: "eur", level: level(r.ebe, (v) => v > 0, () => false), explain: `Résultat d'exploitation + dotations. ${scope}` },
    { id: "st-net", group: "Comptes annuels", label: "Résultat net cumulé", value: f.netResult, format: "eur", level: "neutral", explain: scope },
    {
      id: "st-dscr",
      group: "Comptes annuels",
      label: "EBE / annuités de crédit",
      value: r.ebe !== undefined && debtService > 0 ? r.ebe / debtService : undefined,
      format: "ratio",
      level: level(r.ebe !== undefined && debtService > 0 ? r.ebe / debtService : undefined, (v) => v >= 1.2, (v) => v >= 1),
      explain: "EBE des sociétés dont les comptes sont importés ÷ leurs mensualités annuelles actuelles.",
    },
    {
      id: "st-gearing",
      group: "Comptes annuels",
      label: "Dettes bancaires / capitaux propres",
      value: r.gearing,
      format: "ratio",
      level: "neutral",
      explain: "Levier financier. Souvent élevé en SCI (fonds propres faibles, comptes courants importants) : à lire avec les comptes courants.",
    },
    {
      id: "st-debt-caf",
      group: "Comptes annuels",
      label: "Capacité de remboursement",
      value: r.debtToCaf,
      format: "years",
      level: level(r.debtToCaf, (v) => v <= 12, (v) => v <= 18),
      explain: "Dettes bancaires ÷ CAF : années de CAF nécessaires pour rembourser.",
    },
    {
      id: "st-interest",
      group: "Comptes annuels",
      label: "Couverture des intérêts",
      value: r.interestCoverage,
      format: "ratio",
      level: level(r.interestCoverage, (v) => v >= 3, (v) => v >= 1.5),
      explain: "EBE ÷ charges financières.",
    },
  ];
}

export const LEVEL_LABEL: Record<Level, string> = {
  good: "Solide",
  watch: "À surveiller",
  alert: "Point d'attention",
  neutral: "",
};

export function formatIndicator(i: Pick<Indicator, "value" | "format" | "approx">): string {
  const v = i.value;
  if (v === undefined || !Number.isFinite(v)) return "—";
  if (i.approx) return `${i.approx} ${formatIndicator({ ...i, approx: undefined })}`;
  const nf = (d: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  switch (i.format) {
    case "pct":
      return `${nf(1).format(v)} %`;
    case "ratio":
      return `${nf(2).format(v)}×`;
    case "eur":
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
    case "years":
      return `${nf(1).format(v)} ans`;
    case "months":
      return `${nf(0).format(v)} mois`;
    case "count":
      return nf(0).format(v);
  }
}
