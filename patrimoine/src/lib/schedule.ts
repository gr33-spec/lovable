import type { Loan, LoanScheduleRow } from "./types";
import { monthIndex, parseMonth } from "./engine/dates";

// Tableau d'amortissement de la banque : contrôles de cohérence avant
// enregistrement, et champs du crédit qui s'en déduisent.

const TOL = 2; // € d'écart toléré (arrondis de la banque)

export interface ScheduleCheck {
  count: number;
  firstMonth?: string;
  lastMonth?: string;
  initialAmount?: number;
  totalInterest: number;
  totalInsurance: number;
  /** Écarts relevés (continuité du capital, échéance ≠ capital + intérêts, mois manquants). */
  issues: string[];
}

const ym = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;

/** Lignes triées par mois, doublons retirés. */
export function normalizeRows(rows: LoanScheduleRow[]): LoanScheduleRow[] {
  const byMonth = new Map<number, LoanScheduleRow>();
  for (const r of rows) {
    const m = parseMonth(r.month);
    if (m === undefined || ![r.payment, r.interest, r.principal, r.balance].every(Number.isFinite)) continue;
    byMonth.set(m, { ...r, month: ym(m) });
  }
  return [...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}

export function checkSchedule(input: LoanScheduleRow[]): ScheduleCheck {
  const rows = normalizeRows(input);
  const issues: string[] = [];
  if (rows.length < 2) issues.push("Moins de deux échéances lues.");
  let breaks = 0;
  let sums = 0;
  let gaps = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (Math.abs(r.principal + r.interest - r.payment) > TOL) sums++;
    if (i > 0) {
      const prev = rows[i - 1];
      if (Math.abs(prev.balance - r.principal - r.balance) > TOL) breaks++;
      if (parseMonth(r.month)! - parseMonth(prev.month)! !== 1) gaps++;
    }
  }
  if (sums) issues.push(`${sums} échéance(s) où capital + intérêts ≠ échéance hors assurance.`);
  if (breaks) issues.push(`${breaks} ligne(s) où le capital restant dû ne suit pas la ligne précédente.`);
  if (gaps) issues.push(`${gaps} mois manquant(s) ou échéances non mensuelles.`);
  const last = rows[rows.length - 1];
  if (last && last.balance > TOL) issues.push(`Capital restant après la dernière ligne : ${Math.round(last.balance)} € (tableau incomplet ou prêt in fine).`);
  const first = rows[0];
  return {
    count: rows.length,
    firstMonth: first?.month,
    lastMonth: last?.month,
    initialAmount: first ? Math.round(first.balance + first.principal) : undefined,
    totalInterest: Math.round(rows.reduce((a, r) => a + r.interest, 0)),
    totalInsurance: Math.round(rows.reduce((a, r) => a + (r.insurance ?? 0), 0)),
    issues,
  };
}

/** Champs du crédit repris du tableau (montant, dates, durée, échéance, taux, assurance). */
export function loanFieldsFromSchedule(input: LoanScheduleRow[]): Partial<Loan> {
  const rows = normalizeRows(input);
  if (rows.length < 2) return {};
  const first = rows[0];
  const last = rows[rows.length - 1];
  const initial = first.balance + first.principal;
  // Échéance la plus fréquente (les premières ou dernières peuvent différer).
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(Math.round(r.payment * 100), (counts.get(Math.round(r.payment * 100)) ?? 0) + 1);
  const payment = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] / 100;
  const m0 = parseMonth(first.month)!;
  const m1 = parseMonth(last.month)!;
  const ratePct = initial > 0 ? Math.round((first.interest / initial) * 1200 * 1000) / 1000 : undefined;
  const d = (m: number) => `${ym(m)}-01`;
  return {
    initialAmount: Math.round(initial * 100) / 100,
    // Déblocage le mois précédant la première échéance.
    startDate: d(m0 - 1),
    endDate: d(m1),
    durationMonths: m1 - m0 + 1,
    monthlyPayment: payment,
    ratePct,
    insuranceMonthly: first.insurance !== undefined ? first.insurance : undefined,
    kind: last.principal > initial * 0.5 ? "in_fine" : "amortissable",
    // Le solde vient du tableau : on retire l'ancien point de repère saisi à la main.
    remaining: undefined,
    remainingDate: undefined,
  };
}

/** Capital restant dû d'après le tableau au 1er du mois donné. */
export function scheduleBalanceAt(rows: LoanScheduleRow[], year: number, month: number): number | undefined {
  const target = monthIndex(year, month);
  const sorted = normalizeRows(rows);
  const past = sorted.filter((r) => parseMonth(r.month)! < target);
  if (!past.length) return sorted[0] ? sorted[0].balance + sorted[0].principal : undefined;
  return past[past.length - 1].balance;
}
