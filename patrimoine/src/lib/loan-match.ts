import type { AppData, Loan, LoanScheduleRow, ScheduleMeta } from "./types";
import { monthLabel, parseMonth, type MonthIndex } from "./engine/dates";
import { checkSchedule, loanFieldsFromSchedule, normalizeRows, scheduleBalanceAt } from "./schedule";

// Rapprochement d'un tableau d'amortissement avec les financements existants.
// Le document fait foi : la société, l'immeuble et le prêt sont retrouvés en
// croisant ce qu'il contient (emprunteur, adresse, banque, référence,
// montant, date de départ, durée, échéance, taux, capital restant dû) avec
// les fiches. Le nom donné au prêt dans l'application (« Prêt 1 »…) n'est
// jamais un indice. Rien n'est écrasé sans être montré : les écarts avec une
// fiche existante sont listés pour confirmation.

export interface ScheduleFacts {
  rows: LoanScheduleRow[];
  meta?: ScheduleMeta;
}

/** Indices donnés par la lecture du document (société, immeuble reconnus par l'IA). */
export interface MatchHints {
  companyId?: string;
  buildingId?: string;
  loanId?: string;
  /** Société et immeuble choisis par l'utilisateur : ils priment sur le document. */
  forced?: boolean;
}

export interface FieldChange {
  key: keyof Loan;
  label: string;
  before?: string;
  after: string;
  /** Valeur existante différente : à confirmer. Sinon, simple complément. */
  conflict: boolean;
}

export interface LoanCandidate {
  loanId: string;
  score: number;
  /** Indices concordants (« montant identique »…). */
  agree: string[];
  /** Indices contradictoires. */
  disagree: string[];
  /** Même échéancier déjà enregistré sur ce prêt. */
  identical: boolean;
}

export type LoanPlan = { kind: "existing"; loanId: string } | { kind: "new" };

export interface LoanMatch {
  companyId?: string;
  companySure: boolean;
  buildingId?: string;
  /** Champs du crédit d'après le document. */
  fields: Partial<Loan>;
  candidates: LoanCandidate[];
  plan: LoanPlan;
  /** Rattachement certain (aucune autre possibilité plausible). */
  sure: boolean;
  /** Échéancier déjà enregistré à l'identique : rien à faire. */
  identicalTo?: string;
  /** Différences avec la fiche du prêt retenu. */
  changes: FieldChange[];
  issues: string[];
}

// ——— Normalisation des textes ———

const STOP = new Set(["sci", "sarl", "sas", "sasu", "eurl", "sa", "scp", "societe", "civile", "immobiliere", "du", "de", "des", "la", "le", "les", "d", "l", "et", "a", "au", "aux", "en", "holding"]);

export function normalizeWords(s: string | undefined | null): string[] {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOP.has(w));
}

/** Part des mots significatifs de `name` présents dans `text` (0 à 1). */
function wordsCovered(name: string | undefined, text: string | undefined): number {
  const n = normalizeWords(name);
  if (!n.length || !text) return 0;
  const t = new Set(normalizeWords(text));
  return n.filter((w) => t.has(w)).length / n.length;
}

const sameBank = (a?: string, b?: string) => {
  const x = normalizeWords(a).filter((w) => !["banque", "bank", "credit", "caisse", "regionale", "mutuel", "mutuelle", "populaire", "epargne"].includes(w));
  const y = new Set(normalizeWords(b));
  if (!x.length || !y.size) return normalizeWords(a).join(" ") === normalizeWords(b).join(" ") && !!normalizeWords(a).length;
  return x.some((w) => y.has(w));
};

const cleanRef = (r?: string) => (r ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();

// ——— Formats ———

const eurFmt = (v?: number) => (v === undefined ? undefined : `${Math.round(v).toLocaleString("fr-FR")} €`);
const eur2 = (v?: number) => (v === undefined ? undefined : `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const monthOf = (d?: string) => parseMonth(d);
const monthFmt = (d?: string) => {
  const m = monthOf(d);
  return m === undefined ? undefined : monthLabel(m);
};
const pctFmt = (v?: number) => (v === undefined ? undefined : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`);

/** Description courte d'un financement, sans son nom : « Crédit Agricole · mars 2021 · 145 000 € ». */
export function describeLoan(l: Partial<Loan>): string {
  return [l.bank, monthFmt(l.startDate), eurFmt(l.initialAmount)].filter(Boolean).join(" · ") || "Financement sans détails";
}

/** Nom d'un nouveau financement : la banque et l'année, jamais un numéro d'ordre. */
export function newLoanName(fields: Partial<Loan>, meta?: ScheduleMeta): string {
  const year = fields.startDate?.slice(0, 4);
  const bank = meta?.bank || fields.bank;
  return ["Prêt", bank, year].filter(Boolean).join(" ") || "Nouveau financement";
}

// ——— Rapprochement ———

/** Même échéancier : mêmes mois de début et de fin, mêmes montants en tête. */
function sameRows(a: LoanScheduleRow[], b: LoanScheduleRow[]): boolean {
  const x = normalizeRows(a);
  const y = normalizeRows(b);
  if (!x.length || !y.length) return false;
  const near = (p: number, q: number) => Math.abs(p - q) <= 1;
  return x[0].month === y[0].month && x[x.length - 1].month === y[y.length - 1].month && near(x[0].balance, y[0].balance) && near(x[0].payment, y[0].payment);
}

/** Même prêt vu par deux échéanciers qui se recouvrent (tableau complet et tableau à date). */
function overlappingRows(a: LoanScheduleRow[], b: LoanScheduleRow[]): boolean {
  const byMonth = new Map(normalizeRows(b).map((r) => [r.month, r]));
  const common = normalizeRows(a).filter((r) => byMonth.has(r.month));
  if (common.length < 3) return false;
  return common.every((r) => Math.abs(r.balance - byMonth.get(r.month)!.balance) <= 2);
}

const WEIGHTS = { reference: 60, rows: 60, amount: 35, start: 20, payment: 20, remaining: 15, duration: 10, rate: 10, end: 10, bank: 10, company: 15, building: 10, hint: 10 };

function companyOf(data: AppData, l: Loan): string | undefined {
  return (l.buildingId ? data.buildings.find((b) => b.id === l.buildingId)?.companyId : undefined) ?? l.companyId ?? undefined;
}

function scoreLoan(data: AppData, loan: Loan, facts: ScheduleFacts, f: Partial<Loan>, ctx: { companyId?: string; companySure: boolean; buildingId?: string; hint?: string; nowMonth: MonthIndex }): LoanCandidate {
  const agree: string[] = [];
  const disagree: string[] = [];
  let score = 0;
  const add = (ok: boolean | undefined, weight: number, yes: string, no: string) => {
    if (ok === undefined) return;
    if (ok) {
      score += weight;
      agree.push(yes);
    } else {
      score -= weight;
      disagree.push(no);
    }
  };
  const meta = facts.meta;
  const identical = !!loan.schedule && sameRows(loan.schedule.rows, facts.rows);
  if (identical) {
    score += WEIGHTS.rows * 2;
    agree.push("même échéancier");
  } else if (loan.schedule && overlappingRows(loan.schedule.rows, facts.rows)) {
    score += WEIGHTS.rows;
    agree.push("échéances communes identiques");
  } else if (loan.schedule) {
    // Un autre échéancier est déjà enregistré sur ce prêt : c'est sans doute un autre financement.
    score -= 25;
    disagree.push("un autre tableau est déjà enregistré sur ce prêt");
  }
  if (meta?.reference && loan.reference) add(cleanRef(meta.reference) === cleanRef(loan.reference), WEIGHTS.reference, "même référence de prêt", "référence différente");
  const lc = companyOf(data, loan);
  if (ctx.companyId && lc) {
    if (lc === ctx.companyId) {
      score += WEIGHTS.company;
      agree.push("même société");
    } else {
      score -= ctx.companySure ? 80 : WEIGHTS.company;
      disagree.push("autre société");
    }
  }
  if (ctx.buildingId && loan.buildingId) add(loan.buildingId === ctx.buildingId, WEIGHTS.building, "même immeuble", "autre immeuble");
  const tol = (a: number, b: number, rel: number, abs: number) => Math.abs(a - b) <= Math.max(abs, Math.abs(b) * rel);
  if (f.initialAmount && loan.initialAmount) add(tol(loan.initialAmount, f.initialAmount, 0.005, 50), WEIGHTS.amount, "même montant emprunté", "montant emprunté différent");
  const s1 = monthOf(f.startDate);
  const s0 = monthOf(loan.startDate);
  if (s1 !== undefined && s0 !== undefined) add(Math.abs(s1 - s0) <= 1, WEIGHTS.start, "même date de départ", "date de départ différente");
  if (f.monthlyPayment && loan.monthlyPayment) add(tol(loan.monthlyPayment, f.monthlyPayment, 0.01, 2), WEIGHTS.payment, "même échéance", "échéance différente");
  if (f.durationMonths && loan.durationMonths) add(Math.abs(loan.durationMonths - f.durationMonths) <= 1, WEIGHTS.duration, "même durée", "durée différente");
  if (f.ratePct !== undefined && loan.ratePct !== undefined) add(Math.abs(loan.ratePct - f.ratePct) <= 0.05, WEIGHTS.rate, "même taux", "taux différent");
  const e1 = monthOf(f.endDate);
  const e0 = monthOf(loan.endDate);
  if (e1 !== undefined && e0 !== undefined) add(Math.abs(e1 - e0) <= 1, WEIGHTS.end, "même date de fin", "date de fin différente");
  if (meta?.bank && loan.bank) add(sameBank(meta.bank, loan.bank), WEIGHTS.bank, "même banque", "autre banque");
  if (loan.remaining !== undefined && !loan.schedule) {
    // Capital restant dû saisi : comparé au tableau à sa date (à défaut, aujourd'hui, avec plus de marge).
    const at = monthOf(loan.remainingDate) ?? ctx.nowMonth;
    const expected = scheduleBalanceAt(facts.rows, Math.floor(at / 12), (at % 12) + 1);
    const firstMonth = parseMonth(normalizeRows(facts.rows)[0]?.month) ?? at;
    if (expected !== undefined && at >= firstMonth) add(loan.remainingDate ? tol(loan.remaining, expected, 0.01, 100) : tol(loan.remaining, expected, 0.05, 3000), WEIGHTS.remaining, "capital restant dû concordant", "capital restant dû différent");
  }
  if (ctx.hint === loan.id) {
    score += WEIGHTS.hint;
    agree.push("désigné par la lecture du document");
  }
  return { loanId: loan.id, score, agree, disagree, identical };
}

const LABELS: Partial<Record<keyof Loan, string>> = {
  initialAmount: "Montant emprunté",
  startDate: "Date de départ",
  endDate: "Date de fin",
  durationMonths: "Durée",
  monthlyPayment: "Échéance hors assurance",
  ratePct: "Taux",
  insuranceMonthly: "Assurance mensuelle",
  remaining: "Capital restant dû",
  bank: "Banque",
  reference: "Référence du prêt",
};

/** Ce que le document change sur la fiche : compléments et écarts (à confirmer). */
export function loanChanges(loan: Partial<Loan> | undefined, f: Partial<Loan>, meta?: ScheduleMeta, rows?: LoanScheduleRow[]): FieldChange[] {
  const out: FieldChange[] = [];
  const push = (key: keyof Loan, before: string | undefined, after: string | undefined, conflict: boolean) => {
    if (after === undefined) return;
    if (before === after) return;
    out.push({ key, label: LABELS[key] ?? key, before, after, conflict: before !== undefined && conflict });
  };
  const l = loan ?? {};
  const differs = (a: number | undefined, b: number | undefined, rel: number, abs: number) => a !== undefined && b !== undefined && Math.abs(a - b) > Math.max(abs, Math.abs(b) * rel);
  if (f.initialAmount !== undefined && (l.initialAmount === undefined || differs(l.initialAmount, f.initialAmount, 0.005, 50))) push("initialAmount", eurFmt(l.initialAmount), eurFmt(f.initialAmount), true);
  const s0 = monthOf(l.startDate);
  const s1 = monthOf(f.startDate);
  if (s1 !== undefined && (s0 === undefined || Math.abs(s0 - s1) > 1)) push("startDate", monthFmt(l.startDate), monthFmt(f.startDate), true);
  const e0 = monthOf(l.endDate);
  const e1 = monthOf(f.endDate);
  if (e1 !== undefined && (e0 === undefined || Math.abs(e0 - e1) > 1)) push("endDate", monthFmt(l.endDate), monthFmt(f.endDate), true);
  if (f.durationMonths !== undefined && (l.durationMonths === undefined || Math.abs(l.durationMonths - f.durationMonths) > 1)) push("durationMonths", l.durationMonths ? `${l.durationMonths} mois` : undefined, `${f.durationMonths} mois`, true);
  if (f.monthlyPayment !== undefined && (l.monthlyPayment === undefined || differs(l.monthlyPayment, f.monthlyPayment, 0.01, 2))) push("monthlyPayment", eur2(l.monthlyPayment), eur2(f.monthlyPayment), true);
  if (f.ratePct !== undefined && (l.ratePct === undefined || Math.abs(l.ratePct - f.ratePct) > 0.05)) push("ratePct", pctFmt(l.ratePct), pctFmt(f.ratePct), true);
  if (f.insuranceMonthly !== undefined && (l.insuranceMonthly === undefined || Math.abs(l.insuranceMonthly - f.insuranceMonthly) > 1)) push("insuranceMonthly", eur2(l.insuranceMonthly), eur2(f.insuranceMonthly), true);
  if (f.remaining !== undefined) {
    // Le capital restant dû de la fiche est comparé au tableau à la même date :
    // l'écart dû au seul passage du temps n'en est pas un.
    const at = monthOf(l.remainingDate);
    const expected = l.remaining !== undefined && at !== undefined && rows ? scheduleBalanceAt(rows, Math.floor(at / 12), (at % 12) + 1) : undefined;
    if (l.remaining === undefined) push("remaining", undefined, eurFmt(f.remaining), false);
    else if (at === undefined) {
      // Saisi sans date : mis à jour d'après le tableau ; écart important à confirmer.
      if (differs(l.remaining, f.remaining, 0.005, 50)) out.push({ key: "remaining", label: "Capital restant dû", before: eurFmt(l.remaining), after: eurFmt(f.remaining)!, conflict: differs(l.remaining, f.remaining, 0.05, 3000) });
    } else if (expected !== undefined && differs(l.remaining, expected, 0.01, 100)) out.push({ key: "remaining", label: `Capital restant dû au ${monthFmt(l.remainingDate)}`, before: eurFmt(l.remaining), after: eurFmt(expected)!, conflict: true });
  }
  if (meta?.bank && !l.bank) push("bank", undefined, meta.bank, false);
  if (meta?.reference && !l.reference) push("reference", undefined, meta.reference, false);
  return out;
}

/**
 * Retrouve la société, l'immeuble et le financement d'un tableau.
 * - Société : emprunteur imprimé sur le document, sinon indice de lecture.
 * - Immeuble : adresse du bien, indice de lecture, ou immeuble unique de la société.
 * - Prêt : score sur tous les indices chiffrés ; un nouveau financement n'est
 *   proposé que si aucun prêt existant ne peut correspondre.
 */
export function matchLoan(data: AppData, facts: ScheduleFacts, hints: MatchHints, nowMonth: MonthIndex): LoanMatch {
  const meta = facts.meta;
  const fields: Partial<Loan> = { ...loanFieldsFromSchedule(facts.rows, nowMonth, meta), ...(meta?.bank ? { bank: meta.bank } : {}), ...(meta?.reference ? { reference: meta.reference } : {}) };
  const issues = checkSchedule(facts.rows).issues;

  // Société
  const byBorrower = meta?.borrower
    ? data.companies.map((c) => ({ id: c.id, cover: wordsCovered(c.name, meta.borrower) })).filter((x) => x.cover >= 0.99)
    : [];
  let companyId: string | undefined;
  let companySure = false;
  if (hints.forced && hints.companyId) {
    companyId = hints.companyId;
    companySure = true;
  } else if (byBorrower.length === 1) {
    companyId = byBorrower[0].id;
    companySure = true;
  } else if (hints.companyId && data.companies.some((c) => c.id === hints.companyId)) {
    companyId = hints.companyId;
    companySure = byBorrower.some((x) => x.id === hints.companyId);
  }

  // Immeuble
  const ofCompany = data.buildings.filter((b) => !companyId || b.companyId === companyId);
  let buildingId: string | undefined = hints.forced ? hints.buildingId : undefined;
  if (!buildingId && meta?.address) {
    const scored = ofCompany.map((b) => ({ id: b.id, cover: wordsCovered([b.address, b.city].filter(Boolean).join(" "), meta.address) })).filter((x) => x.cover >= 0.75);
    if (scored.length === 1) buildingId = scored[0].id;
  }
  if (!buildingId && hints.buildingId && ofCompany.some((b) => b.id === hints.buildingId)) buildingId = hints.buildingId;
  if (!buildingId && companyId && ofCompany.length === 1) buildingId = ofCompany[0].id;
  if (!companyId && buildingId) companyId = data.buildings.find((b) => b.id === buildingId)?.companyId ?? undefined;

  // Prêt
  const hint = hints.loanId && data.loans.some((l) => l.id === hints.loanId) ? hints.loanId : undefined;
  const pool = data.loans.filter((l) => !companySure || companyOf(data, l) === companyId || (!companyOf(data, l) && !l.buildingId));
  const candidates = pool
    .map((l) => scoreLoan(data, l, facts, fields, { companyId, companySure, buildingId, hint, nowMonth }))
    .sort((a, b) => b.score - a.score);
  const identical = candidates.find((c) => c.identical);
  const best = candidates[0];
  const second = candidates[1];
  const strongMismatch = (c: LoanCandidate) => c.disagree.some((d) => d.startsWith("montant") || d.startsWith("date de départ") || d.startsWith("référence") || d.startsWith("autre société") || d.startsWith("un autre tableau"));
  // Prêts « vides » (saisis sans chiffres comparables) : possibles, jamais certains.
  const plausible = candidates.filter((c) => !strongMismatch(c) && c.score >= (companyId ? WEIGHTS.company : 0));

  let plan: LoanPlan;
  let sure: boolean;
  if (identical) {
    plan = { kind: "existing", loanId: identical.loanId };
    sure = true;
  } else if (best && !strongMismatch(best) && ((best.score >= 45 && (!second || best.score - second.score >= 25)) || (best.score >= 30 && !best.disagree.length && best.agree.length >= 2 && (!second || best.score - second.score >= 30)))) {
    plan = { kind: "existing", loanId: best.loanId };
    sure = !!companyId || best.score >= 60;
  } else if (plausible.length) {
    plan = { kind: "existing", loanId: plausible[0].loanId };
    sure = false;
  } else {
    plan = { kind: "new" };
    // Nouveau financement : certain seulement si la société est identifiée sans doute possible.
    sure = companySure;
  }
  const target = plan.kind === "existing" ? data.loans.find((l) => l.id === plan.loanId) : undefined;
  if (target && !buildingId) buildingId = target.buildingId ?? undefined;
  const changes = identical ? [] : loanChanges(target, fields, meta, facts.rows);
  return { companyId, companySure, buildingId, fields, candidates, plan, sure, identicalTo: identical?.loanId, changes, issues };
}

/** Rattachement automatique possible : certain, sans écart à trancher ni anomalie. */
export function autoFileable(m: LoanMatch, data: AppData): boolean {
  if (!m.sure || m.issues.length) return false;
  if (m.identicalTo) return true;
  if (m.changes.some((c) => c.conflict)) return false;
  if (m.plan.kind === "existing") return !data.loans.find((l) => l.id === (m.plan as { loanId: string }).loanId)?.schedule;
  return true;
}
