import type { Loan } from "../types";
import { parseMonth, type MonthIndex } from "./dates";

// Résolution d'un crédit : à partir des champs connus (souvent incomplets),
// on détermine le capital restant dû au mois courant, la mensualité, le taux
// mensuel et le dernier mois de remboursement. Chaque hypothèse faite est
// signalée dans `notes` et fait passer la qualité à "estimated".

export type LoanQuality = "complete" | "estimated" | "insufficient";

export interface ResolvedLoan {
  id: string;
  kind: "amortissable" | "in_fine";
  /** Premier mois où le crédit existe (≥ mois courant). */
  fromMonth: MonthIndex;
  /** Capital restant dû au début de `fromMonth`. undefined = inconnu. */
  balance?: number;
  /** Taux mensuel (décimal). */
  monthlyRate: number;
  /** Mensualité hors assurance. */
  payment?: number;
  insurance: number;
  /** Dernier mois de paiement. undefined = inconnu. */
  endMonth?: MonthIndex;
  quality: LoanQuality;
  notes: string[];
  /** Taux annuel déduit (%) lorsqu'il a été calculé. */
  impliedRatePct?: number;
  /** Crédit déjà soldé. */
  finished: boolean;
}

const EPS = 0.5;

export function annuityPayment(principal: number, monthlyRate: number, months: number): number {
  if (months <= 0) return principal;
  if (monthlyRate <= 0) return principal / months;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

/** Nombre de mensualités pour solder `principal` avec la mensualité `payment`. */
export function monthsToRepay(principal: number, monthlyRate: number, payment: number): number | undefined {
  if (principal <= EPS) return 0;
  if (payment <= 0) return undefined;
  if (monthlyRate <= 0) return Math.ceil(principal / payment);
  const interest = principal * monthlyRate;
  if (payment <= interest) return undefined; // ne s'amortit jamais
  return Math.ceil(-Math.log(1 - (principal * monthlyRate) / payment) / Math.log(1 + monthlyRate));
}

/** Taux mensuel implicite tel que l'annuité `payment` sur `months` rembourse `principal`. */
export function impliedMonthlyRate(principal: number, payment: number, months: number): number | undefined {
  if (months <= 0 || payment <= 0) return undefined;
  if (payment * months < principal - EPS) return undefined;
  if (Math.abs(payment * months - principal) <= EPS) return 0;
  let lo = 0;
  let hi = 0.05; // 60 % par an : borne très large
  if (annuityPayment(principal, hi, months) < payment) return undefined;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (annuityPayment(principal, mid, months) > payment) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Fait avancer un solde d'un mois `from` jusqu'au mois `to` (exclu). */
function rollForward(
  balance: number,
  monthlyRate: number,
  payment: number,
  kind: "amortissable" | "in_fine",
  from: MonthIndex,
  to: MonthIndex,
  endMonth?: MonthIndex,
): number {
  let b = balance;
  for (let m = from; m < to && b > EPS; m++) {
    if (endMonth !== undefined && m > endMonth) return 0;
    if (kind === "in_fine") {
      if (endMonth !== undefined && m === endMonth) b = 0;
      continue;
    }
    const interest = b * monthlyRate;
    const principal = Math.max(0, Math.min(b, payment - interest));
    if (endMonth !== undefined && m === endMonth) b = 0;
    else b = Math.max(0, b - principal);
  }
  return b;
}

export function resolveLoan(loan: Loan, nowMonth: MonthIndex): ResolvedLoan {
  const notes: string[] = [];
  let quality: LoanQuality = "complete";
  const kind = loan.kind ?? "amortissable";
  const insurance = loan.insuranceMonthly ?? 0;

  const start = parseMonth(loan.startDate);
  let end = parseMonth(loan.endDate);
  const duration = loan.durationMonths && loan.durationMonths > 0 ? Math.round(loan.durationMonths) : undefined;
  if (end === undefined && start !== undefined && duration !== undefined) end = start + duration;
  let rate = loan.ratePct !== undefined && loan.ratePct >= 0 ? loan.ratePct / 1200 : undefined;
  let payment = loan.monthlyPayment && loan.monthlyPayment > 0 ? loan.monthlyPayment : undefined;

  // Mensualité calculable depuis le montant initial.
  const fullDuration =
    start !== undefined && end !== undefined ? end - start : duration;
  if (payment === undefined && loan.initialAmount && rate !== undefined && fullDuration) {
    payment =
      kind === "in_fine" ? loan.initialAmount * rate : annuityPayment(loan.initialAmount, rate, fullDuration);
  }

  // Point d'ancrage du solde.
  let anchorMonth: MonthIndex | undefined;
  let anchorBalance: number | undefined;
  if (loan.remaining !== undefined && loan.remaining >= 0) {
    anchorBalance = loan.remaining;
    anchorMonth = parseMonth(loan.remainingDate) ?? nowMonth;
  } else if (loan.initialAmount && start !== undefined) {
    anchorBalance = loan.initialAmount;
    anchorMonth = start + 1; // première échéance le mois suivant le déblocage
  }

  // Taux implicite si inconnu (amortissable) à partir du solde, de la mensualité et de la fin.
  let impliedRatePct: number | undefined;
  if (rate === undefined && anchorBalance !== undefined && anchorMonth !== undefined) {
    if (kind === "in_fine" && payment !== undefined && anchorBalance > 0) {
      rate = payment / anchorBalance;
      impliedRatePct = rate * 1200;
    } else if (payment !== undefined && end !== undefined) {
      const n = end - anchorMonth + 1;
      const r = impliedMonthlyRate(anchorBalance, payment, n);
      if (r !== undefined) {
        rate = r;
        impliedRatePct = r * 1200;
        notes.push("Taux déduit de la mensualité et de la date de fin");
      }
    }
  }

  // Mensualité calculable depuis le solde, le taux et la fin.
  if (payment === undefined && anchorBalance !== undefined && anchorMonth !== undefined && end !== undefined) {
    const n = Math.max(1, end - anchorMonth + 1);
    if (kind === "in_fine") {
      if (rate !== undefined) payment = anchorBalance * rate;
    } else if (rate !== undefined) {
      payment = annuityPayment(anchorBalance, rate, n);
    } else {
      payment = anchorBalance / n;
      rate = 0;
      quality = "estimated";
      notes.push("Taux et mensualité inconnus : remboursement linéaire supposé");
    }
  }

  // Fin calculable depuis le solde, le taux et la mensualité.
  if (end === undefined && anchorBalance !== undefined && anchorMonth !== undefined && payment !== undefined && kind === "amortissable") {
    const r = rate ?? 0;
    if (rate === undefined) {
      quality = "estimated";
      notes.push("Taux inconnu : date de fin estimée sans intérêts (au plus tôt)");
    }
    const n = monthsToRepay(anchorBalance, r, payment);
    if (n !== undefined) end = anchorMonth + Math.max(0, n - 1);
    rate = r;
  }

  if (rate === undefined && payment !== undefined && anchorBalance !== undefined) {
    // Mensualité + fin connues mais incohérentes (ex. mensualité trop faible) :
    // on suppose un solde remboursé en une fois à l'échéance.
    rate = 0;
    quality = "estimated";
    notes.push("Données incohérentes : solde restant supposé remboursé à l'échéance");
  }

  const base: Omit<ResolvedLoan, "fromMonth" | "balance" | "finished"> = {
    id: loan.id,
    kind,
    monthlyRate: rate ?? 0,
    payment,
    insurance,
    endMonth: end,
    quality,
    notes,
    impliedRatePct,
  };

  if (anchorBalance === undefined || anchorMonth === undefined) {
    return {
      ...base,
      fromMonth: nowMonth,
      balance: undefined,
      quality: "insufficient",
      notes: [...notes, "Capital restant dû inconnu"],
      finished: end !== undefined && end < nowMonth,
    };
  }

  if (payment === undefined && end === undefined) {
    return {
      ...base,
      fromMonth: Math.max(nowMonth, anchorMonth),
      balance: anchorBalance,
      quality: "insufficient",
      notes: [...notes, "Mensualité et date de fin inconnues"],
      finished: false,
    };
  }

  if (anchorMonth >= nowMonth) {
    return { ...base, fromMonth: anchorMonth, balance: anchorBalance, finished: false };
  }

  const balance = rollForward(anchorBalance, rate ?? 0, payment ?? 0, kind, anchorMonth, nowMonth, end);
  const finished = balance <= EPS || (end !== undefined && end < nowMonth);
  return { ...base, fromMonth: nowMonth, balance: finished ? 0 : balance, finished };
}

/** Échéance d'un mois pour un crédit en cours. Modifie `state`. */
export interface LoanState {
  balance: number;
  monthlyRate: number;
  payment: number;
  insurance: number;
  endMonth?: MonthIndex;
  kind: "amortissable" | "in_fine";
  active: boolean;
}

export interface MonthPayment {
  /** Mensualité régulière payée (capital + intérêts + assurance). */
  regular: number;
  interest: number;
  principal: number;
  /** Capital remboursé en une fois à l'échéance (in fine / solde). */
  balloon: number;
  ended: boolean;
}

export function stepLoan(state: LoanState, m: MonthIndex): MonthPayment {
  const none = { regular: 0, interest: 0, principal: 0, balloon: 0, ended: false };
  if (!state.active) return none;
  if (state.balance <= EPS) {
    state.active = false;
    state.balance = 0;
    return { ...none, ended: true };
  }
  const interest = state.balance * state.monthlyRate;
  const isLast = state.endMonth !== undefined && m >= state.endMonth;
  if (state.kind === "in_fine") {
    const balloon = isLast ? state.balance : 0;
    if (isLast) {
      state.balance = 0;
      state.active = false;
    }
    return { regular: interest + state.insurance, interest, principal: 0, balloon, ended: isLast };
  }
  let principal = Math.max(0, state.payment - interest);
  let regular = state.payment + state.insurance;
  if (principal >= state.balance - EPS) {
    // Dernière mensualité (éventuellement plus faible).
    principal = state.balance;
    regular = principal + interest + state.insurance;
    state.balance = 0;
    state.active = false;
    return { regular, interest, principal, balloon: 0, ended: true };
  }
  state.balance -= principal;
  if (isLast) {
    const balloon = state.balance;
    state.balance = 0;
    state.active = false;
    return { regular, interest, principal, balloon, ended: true };
  }
  return { regular, interest, principal, balloon: 0, ended: false };
}

/** Capital restant dû au 31/12 de chaque année, de l'année en cours à +horizon. */
export function yearlyBalances(r: ResolvedLoan, nowMonth: MonthIndex, horizonYears = 30): { year: number; balance: number; paid: number; interest: number }[] {
  const y0 = Math.floor(nowMonth / 12);
  const out: { year: number; balance: number; paid: number; interest: number }[] = [];
  if (r.balance === undefined || r.finished) return out;
  const state: LoanState = {
    balance: r.balance,
    monthlyRate: r.monthlyRate,
    payment: r.payment ?? 0,
    insurance: r.insurance,
    endMonth: r.endMonth,
    kind: r.kind,
    active: true,
  };
  const frozen = r.payment === undefined;
  let paid = 0;
  let interest = 0;
  for (let m = nowMonth; m <= (y0 + horizonYears) * 12 + 11; m++) {
    if (!frozen && m >= r.fromMonth) {
      const p = stepLoan(state, m);
      paid += p.regular + p.balloon;
      interest += p.interest;
    }
    if (m % 12 === 11) {
      out.push({ year: Math.floor(m / 12), balance: state.balance, paid, interest });
      paid = 0;
      interest = 0;
    }
  }
  return out;
}
