import type { AppData, Building, Loan, LoanScheduleRow, ProjectLoan, ScheduleMeta } from "./types";
import { monthIndex, parseMonth, type MonthIndex } from "./engine/dates";

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

/**
 * Le tableau commence-t-il à la première échéance du prêt ? Un tableau édité
 * en cours de prêt commence au capital restant dû du moment : le prendre pour
 * le montant emprunté (et son premier mois pour le déblocage) serait faux.
 * « first » : confirmé par l'en-tête (date de début, durée ou montant) ou par
 * un capital de départ rond (les prêts se signent en montants ronds, un
 * capital en cours de prêt ne l'est presque jamais) ; « partial » : l'en-tête
 * montre un prêt commencé avant ; « unknown » : rien ne permet de le dire.
 */
export function scheduleStart(input: LoanScheduleRow[], meta?: ScheduleMeta): "first" | "partial" | "unknown" {
  const rows = normalizeRows(input);
  if (rows.length < 2) return "unknown";
  const fromRows = rows[0].balance + rows[0].principal;
  const m0 = parseMonth(rows[0].month)!;
  if (meta?.initialAmount) {
    if (meta.initialAmount > fromRows * 1.01 + TOL) return "partial";
    if (Math.abs(meta.initialAmount - fromRows) <= Math.max(TOL, fromRows * 0.005)) return "first";
  }
  const declared = parseMonth(meta?.startDate);
  if (declared !== undefined) return m0 - declared > 2 ? "partial" : "first";
  if (meta?.durationMonths) {
    if (meta.durationMonths > rows.length + 1) return "partial";
    if (Math.abs(meta.durationMonths - rows.length) <= 1) return "first";
  }
  return Math.abs(fromRows - Math.round(fromRows / 100) * 100) <= 0.5 ? "first" : "unknown";
}

/**
 * Champs du crédit repris du tableau : montant, dates, durée, échéance, taux,
 * assurance et capital restant dû au 1er du mois courant (tenu à jour chaque mois).
 * `meta` (en-tête du document) complète un tableau partiel — édité en cours de
 * prêt, il ne commence pas à la première échéance : montant, début et durée
 * viennent alors de l'en-tête, jamais recalculés depuis la première ligne.
 */
export function loanFieldsFromSchedule(input: LoanScheduleRow[], nowMonth?: MonthIndex, meta?: ScheduleMeta, assumeFirst = false): Partial<Loan> {
  const rows = normalizeRows(input);
  if (rows.length < 2) return {};
  const first = rows[0];
  const last = rows[rows.length - 1];
  const fromRows = first.balance + first.principal;
  // Échéance la plus fréquente (les premières ou dernières peuvent différer).
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(Math.round(r.payment * 100), (counts.get(Math.round(r.payment * 100)) ?? 0) + 1);
  const payment = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] / 100;
  const m0 = parseMonth(first.month)!;
  const m1 = parseMonth(last.month)!;
  const declaredStart = parseMonth(meta?.startDate);
  const start = assumeFirst ? "first" : scheduleStart(rows, meta);
  const partial = start === "partial";
  // Montant, déblocage et durée : seulement s'ils sont établis (jamais le capital d'un tableau commencé en cours de prêt).
  const initial = partial ? meta?.initialAmount : start === "first" ? fromRows : undefined;
  const computedRate = fromRows > 0 ? Math.round((first.interest / fromRows) * 1200 * 1000) / 1000 : undefined;
  // Taux imprimé retenu s'il est cohérent avec les intérêts (sinon c'est peut-être le TAEG).
  const ratePct = meta?.ratePct && (computedRate === undefined || Math.abs(meta.ratePct - computedRate) <= 0.15) ? meta.ratePct : computedRate;
  const d = (m: number) => `${ym(m)}-01`;
  const startMonth = partial ? (declaredStart ?? (meta?.durationMonths ? m1 - meta.durationMonths + 1 : undefined)) : start === "first" ? m0 : undefined;
  return {
    ...(initial === undefined ? {} : { initialAmount: Math.round(initial * 100) / 100 }),
    // Déblocage le mois précédant la première échéance.
    ...(startMonth === undefined ? {} : { startDate: partial && declaredStart !== undefined ? d(declaredStart) : d(startMonth - 1) }),
    endDate: d(m1),
    ...(start === "unknown" ? {} : { durationMonths: partial ? (meta?.durationMonths ?? (startMonth !== undefined ? m1 - startMonth + 1 : undefined)) : m1 - m0 + 1 }),
    monthlyPayment: payment,
    ratePct,
    insuranceMonthly: first.insurance !== undefined ? first.insurance : undefined,
    kind: last.principal > (initial ?? fromRows) * 0.5 ? "in_fine" : "amortissable",
    ...(nowMonth === undefined ? {} : remainingAt(rows, nowMonth)),
  };
}

/** Capital restant dû au 1er du mois (0 une fois le crédit terminé). */
function remainingAt(rows: LoanScheduleRow[], nowMonth: MonthIndex): Pick<Loan, "remaining" | "remainingDate"> {
  const past = rows.filter((r) => parseMonth(r.month)! < nowMonth);
  const first = rows[0];
  const balance = past.length ? past[past.length - 1].balance : first.balance + first.principal;
  return { remaining: Math.round(Math.max(0, balance) * 100) / 100, remainingDate: `${ym(nowMonth)}-01` };
}

// Le capital restant dû n'est jamais recopié depuis le tableau : il est
// recalculé à chaque affichage (une valeur stockée vieillirait chaque mois).
const SYNCED: (keyof Loan)[] = ["initialAmount", "startDate", "endDate", "durationMonths", "monthlyPayment", "ratePct", "insuranceMonthly", "kind"];

/**
 * Mise en cohérence des fiches avec les tableaux d'amortissement enregistrés :
 * caractéristiques des crédits (montant, dates, durée, mensualité, taux).
 * La date d'acquisition d'un immeuble reste une donnée saisie (le déblocage
 * d'un prêt n'est pas la date de l'acte). Ne renvoie que ce qui change.
 */
export function syncFromSchedules(data: AppData): { loans: Loan[]; buildings: Building[] } {
  const loans: Loan[] = [];
  for (const loan of data.loans) {
    if (!loan.schedule || loan.schedule.rows.length < 2) continue;
    const fields = loanFieldsFromSchedule(loan.schedule.rows, undefined, loan.schedule.meta);
    const next: Loan = { ...loan };
    let changed = false;
    for (const k of SYNCED) {
      const v = fields[k];
      if (v !== undefined && next[k] !== v) {
        (next as unknown as Record<string, unknown>)[k] = v;
        changed = true;
      }
    }
    if (changed) loans.push(next);
  }
  return { loans, buildings: [] as Building[] };
}

/** Capital restant dû d'après le tableau au 1er du mois donné. */
export function scheduleBalanceAt(rows: LoanScheduleRow[], year: number, month: number): number | undefined {
  const target = monthIndex(year, month);
  const sorted = normalizeRows(rows);
  const past = sorted.filter((r) => parseMonth(r.month)! < target);
  if (!past.length) return sorted[0] ? sorted[0].balance + sorted[0].principal : undefined;
  return past[past.length - 1].balance;
}

/** Conditions d'un prêt de projet reprises du tableau (montant, taux, durée, assurance, différé). */
export function projectLoanFromSchedule(input: LoanScheduleRow[]): Partial<ProjectLoan> {
  const rows = normalizeRows(input);
  // Prêt de projet : le tableau de l'offre commence toujours à la première échéance.
  const f = loanFieldsFromSchedule(rows, undefined, undefined, true);
  if (!rows.length) return {};
  let deferral = 0;
  while (deferral < rows.length - 1 && rows[deferral].principal < 0.01) deferral++;
  return {
    amount: f.initialAmount,
    ratePct: f.ratePct,
    durationMonths: f.durationMonths,
    insuranceMonthly: f.insuranceMonthly,
    deferralMonths: deferral || undefined,
  };
}

// ——— Import d'un échéancier en JSON (sans IA) ———

const ROW_KEYS = {
  month: ["month", "mois", "date", "echeance_date", "dateEcheance"],
  payment: ["payment", "echeance", "mensualite", "montant"],
  interest: ["interest", "interets", "intérêts"],
  principal: ["principal", "capital", "amortissement", "capitalAmorti"],
  insurance: ["insurance", "assurance"],
  balance: ["balance", "restant", "capitalRestant", "crd", "capital_restant_du"],
} as const;

const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/\s|€/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

/** « 2021-03 », « 2021-03-05 » ou « 05/03/2021 » → « 2021-03 ». */
const monthOfText = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const iso = /^(\d{4})-(\d{2})/.exec(v.trim());
  if (iso) return `${iso[1]}-${iso[2]}`;
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
  return fr ? `${fr[3]}-${fr[2].padStart(2, "0")}` : undefined;
};

/**
 * Échéancier fourni en JSON : un tableau de lignes, ou un objet { rows | echeances,
 * meta, bank }. Les noms de colonnes courants (français ou anglais) sont
 * reconnus. Les lignes illisibles sont signalées, jamais inventées.
 */
export function parseScheduleJson(text: string): { rows: LoanScheduleRow[]; meta?: ScheduleMeta; bank: string | null; notes: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Fichier JSON illisible.");
  }
  const obj = (Array.isArray(raw) ? { rows: raw } : raw) as Record<string, unknown>;
  const list = (obj.rows ?? obj.echeances ?? obj.lignes) as unknown;
  if (!Array.isArray(list)) throw new Error("Aucune liste d'échéances (« rows ») dans le fichier.");
  const pick = (r: Record<string, unknown>, keys: readonly string[]) => keys.map((k) => r[k]).find((v) => v !== undefined && v !== null && v !== "");
  const rows: LoanScheduleRow[] = [];
  let skipped = 0;
  for (const item of list) {
    const r = (item ?? {}) as Record<string, unknown>;
    const month = monthOfText(pick(r, ROW_KEYS.month));
    const interest = num(pick(r, ROW_KEYS.interest));
    const principal = num(pick(r, ROW_KEYS.principal));
    const balance = num(pick(r, ROW_KEYS.balance));
    const insurance = num(pick(r, ROW_KEYS.insurance));
    const payment = num(pick(r, ROW_KEYS.payment)) ?? (interest !== undefined && principal !== undefined ? interest + principal : undefined);
    if (!month || payment === undefined || interest === undefined || principal === undefined || balance === undefined) {
      skipped++;
      continue;
    }
    rows.push({ month, payment, interest, principal, balance, ...(insurance ? { insurance } : {}) });
  }
  const m = (obj.meta ?? {}) as Record<string, unknown>;
  const meta: ScheduleMeta = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const bank = str(m.bank) ?? str(obj.bank) ?? str(obj.banque);
  if (bank) meta.bank = bank;
  const reference = str(m.reference) ?? str(obj.reference);
  if (reference) meta.reference = reference;
  const borrower = str(m.borrower) ?? str(obj.emprunteur);
  if (borrower) meta.borrower = borrower;
  const initialAmount = num(m.initialAmount ?? obj.montant);
  if (initialAmount) meta.initialAmount = initialAmount;
  const start = str(m.startDate) ?? str(obj.debut);
  if (start && /^\d{4}-\d{2}(-\d{2})?$/.test(start)) meta.startDate = start.length === 7 ? `${start}-01` : start;
  const duration = num(m.durationMonths ?? obj.dureeMois);
  if (duration) meta.durationMonths = Math.round(duration);
  const rate = num(m.ratePct ?? obj.taux);
  if (rate) meta.ratePct = rate;
  const sorted = normalizeRows(rows);
  if (sorted.length < 2) throw new Error("Moins de deux échéances lisibles : vérifiez le fichier (mois, échéance, intérêts, capital, capital restant dû).");
  return { rows: sorted, meta: Object.keys(meta).length ? meta : undefined, bank: bank ?? null, notes: skipped ? [`${skipped} ligne(s) incomplète(s) ignorée(s).`] : [] };
}

/** Chiffres clés d'un tableau : échéance habituelle, échéance du différé, intérêts totaux. */
export function scheduleSummary(input: LoanScheduleRow[]): { payment?: number; deferralPayment?: number; totalInterest: number } {
  const rows = normalizeRows(input);
  const f = loanFieldsFromSchedule(rows);
  const deferred = rows.filter((r) => r.principal < 0.01);
  return {
    payment: f.monthlyPayment,
    deferralPayment: deferred.length && deferred.length < rows.length ? deferred[0].payment : undefined,
    totalInterest: Math.round(rows.reduce((a, r) => a + r.interest, 0) * 100) / 100,
  };
}

/** Premier mois du tableau, et déblocage qu'on en déduirait à tort s'il commence en cours de prêt. */
function derivedStart(rows: LoanScheduleRow[]): { fromRows: number; first: MonthIndex; startDate: string } | undefined {
  const r = normalizeRows(rows);
  if (r.length < 2) return undefined;
  const first = parseMonth(r[0].month)!;
  return { fromRows: r[0].balance + r[0].principal, first, startDate: `${ym(first - 1)}-01` };
}

/**
 * Montant emprunté fiable. Avec un tableau commencé en cours de prêt, la valeur
 * enregistrée peut n'être que le capital du début du tableau (ancienne
 * déduction) : elle est alors écartée, jamais affichée comme montant emprunté.
 */
export function reliableInitial(loan: Loan): { value?: number; partialFrom?: string } {
  if (!loan.schedule) return { value: loan.initialAmount };
  const d = derivedStart(loan.schedule.rows);
  const start = scheduleStart(loan.schedule.rows, loan.schedule.meta);
  if (!d || start === "first") return { value: loan.initialAmount };
  const v = loan.initialAmount;
  if (v !== undefined && Math.abs(v - d.fromRows) > TOL) return { value: v };
  return { partialFrom: ym(d.first) };
}

/** Date de déblocage fiable (même règle que le montant). */
export function reliableStart(loan: Loan): string | undefined {
  if (!loan.schedule || !loan.startDate) return loan.startDate;
  const d = derivedStart(loan.schedule.rows);
  if (!d || scheduleStart(loan.schedule.rows, loan.schedule.meta) === "first") return loan.startDate;
  return loan.startDate.slice(0, 7) === d.startDate.slice(0, 7) ? undefined : loan.startDate;
}
