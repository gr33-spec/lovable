import type { AppData, Building, Loan, RentPayment, Unit } from "../types";
import type { ResolvedLoan } from "./loan";
import { monthLabel } from "./dates";

// Baux, révisions de loyer, encaissements et rappels. Aucune règle fiscale ou
// juridique automatique : durées, indices et dates sont saisis par
// l'utilisateur ; l'application se contente de calculer les échéances.

/** Préavis du rappel de fin de bail, en mois. */
export const LEASE_END_NOTICE_MONTHS = 8;
/** Délai avant la date de révision à partir duquel le rappel apparaît. */
export const REVISION_NOTICE_MONTHS = 1;
/** Délai avant la fin d'un crédit à partir duquel le rappel apparaît. */
export const LOAN_END_NOTICE_MONTHS = 12;

// ——— Dates au jour près (AAAA-MM-JJ) ———

function parseIso(iso: string | undefined): { y: number; m: number; d: number } | undefined {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return { y, m, d };
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Ajoute des mois en gardant le jour (borné à la fin du mois). */
export function addMonthsIso(iso: string, months: number): string {
  const p = parseIso(iso);
  if (!p) return iso;
  const total = p.y * 12 + (p.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return fmt(y, m, Math.min(p.d, last));
}

export function todayIso(now: Date = new Date()): string {
  return fmt(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isValidIso(iso: string | undefined): iso is string {
  return !!parseIso(iso);
}

/** Nombre de jours entre deux dates ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  const pa = parseIso(a)!;
  const pb = parseIso(b)!;
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonthKey(key: string, delta: number): string {
  return addMonthsIso(`${key}-01`, delta).slice(0, 7);
}

const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

// ——— Bail ———

export interface LeaseInfo {
  /** Prochaine échéance du bail (renouvellement tacite pris en compte si la durée est connue). */
  end?: string;
  /** Échéance saisie déjà passée, sans durée pour la reconduire. */
  expired?: boolean;
  /** Date du rappel (8 mois avant la fin). */
  noticeDate?: string;
  /** Prochaine date de révision du loyer. */
  nextRevision?: string;
}

/** Première date « base + k × pas (mois) » strictement postérieure à `after`. */
function nextOccurrence(base: string, stepMonths: number, after: string): string {
  let k = 1;
  let d = addMonthsIso(base, stepMonths);
  // Borne de sécurité : 200 pas maximum.
  while (d <= after && k < 200) {
    k += 1;
    d = addMonthsIso(base, stepMonths * k);
  }
  return d;
}

export function leaseInfo(unit: Unit, today: string): LeaseInfo {
  const out: LeaseInfo = {};
  const years = unit.leaseDurationYears && unit.leaseDurationYears > 0 ? unit.leaseDurationYears : undefined;
  if (isValidIso(unit.leaseEnd)) {
    if (unit.leaseEnd >= today) out.end = unit.leaseEnd;
    else if (years) out.end = nextOccurrence(unit.leaseEnd, years * 12, today);
    else {
      out.end = unit.leaseEnd;
      out.expired = true;
    }
  } else if (isValidIso(unit.leaseStart) && years) {
    out.end = nextOccurrence(unit.leaseStart, years * 12, today);
  }
  if (out.end) out.noticeDate = addMonthsIso(out.end, -LEASE_END_NOTICE_MONTHS);

  const step = unit.revision === "triennale" ? 36 : unit.revision === "aucune" ? 0 : 12;
  if (step && isValidIso(unit.leaseStart)) {
    // Sans révision enregistrée, les révisions passées sont supposées faites
    // (seule une échéance des deux derniers mois est encore signalée).
    const recent = addMonthsIso(today, -2);
    const after = isValidIso(unit.lastRevisionDate)
      ? unit.lastRevisionDate > unit.leaseStart ? unit.lastRevisionDate : unit.leaseStart
      : recent > unit.leaseStart ? recent : unit.leaseStart;
    out.nextRevision = nextOccurrence(unit.leaseStart, step, after);
  }
  return out;
}

/** Nouveau loyer = loyer actuel × nouvel indice / indice de référence. */
export function revisedRent(rent: number | undefined, oldIndex: number | undefined, newIndex: number | undefined): number | undefined {
  if (!rent || !oldIndex || !newIndex || oldIndex <= 0 || newIndex <= 0) return undefined;
  return Math.round(((rent * newIndex) / oldIndex) * 100) / 100;
}

// ——— Encaissements ———

export function expectedMonthly(unit: Unit): number {
  return (unit.rent ?? 0) + (unit.charges ?? 0);
}

/** Reste dû sur un mois pointé (0 si payé). */
export function outstanding(p: RentPayment | undefined): number {
  if (!p || p.status === "paye") return 0;
  const due = p.due ?? 0;
  const paid = p.status === "partiel" ? p.paid ?? 0 : 0;
  return Math.max(0, due - paid);
}

export function paidAmount(p: RentPayment | undefined): number {
  if (!p) return 0;
  if (p.status === "paye") return p.due ?? 0;
  if (p.status === "partiel") return p.paid ?? 0;
  return 0;
}

export interface UnpaidLine {
  unit: Unit;
  months: string[];
  amount: number;
}

export function unpaidByUnit(units: Unit[]): UnpaidLine[] {
  const out: UnpaidLine[] = [];
  for (const unit of units) {
    const months = Object.entries(unit.payments ?? {})
      .filter(([, p]) => outstanding(p) > 0)
      .map(([k]) => k)
      .sort();
    if (months.length === 0) continue;
    const amount = months.reduce((s, k) => s + outstanding(unit.payments![k]), 0);
    out.push({ unit, months, amount });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

// ——— Rappels ———

export type ReminderKind = "lease_end" | "revision" | "loan_end" | "unpaid" | "deposit";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  /** Date de l'échéance (AAAA-MM-JJ). */
  date: string;
  title: string;
  detail: string;
  href: string;
  /** Échéance dépassée. */
  late: boolean;
  amount?: number;
}

function unitPlace(data: AppData, unit: Unit): { building?: Building; label: string } {
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const tenant = [unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ");
  return { building, label: [building?.name, unit.name, tenant].filter(Boolean).join(" · ") };
}

function dateLong(iso: string): string {
  const p = parseIso(iso)!;
  return `${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`;
}

function loanLabel(data: AppData, loan: Loan): string {
  const building = data.buildings.find((b) => b.id === loan.buildingId);
  return [loan.name || loan.bank || "Crédit", building?.name].filter(Boolean).join(" · ");
}

export function reminders(
  data: AppData,
  today: string,
  resolvedLoans?: Map<string, ResolvedLoan>,
  options: { includeDismissed?: boolean } = {},
): Reminder[] {
  const out: Reminder[] = [];
  for (const unit of data.units) {
    const { building, label } = unitPlace(data, unit);
    const href = building ? `/patrimoine/logement/${unit.id}` : "/patrimoine";
    if (unit.status !== "vacant") {
      const info = leaseInfo(unit, today);
      if (info.end && info.noticeDate && (info.expired || today >= info.noticeDate)) {
        const days = daysBetween(today, info.end);
        out.push({
          id: `lease:${unit.id}:${info.end}`,
          kind: "lease_end",
          date: info.end,
          title: info.expired ? "Bail arrivé à échéance" : "Fin de bail à anticiper",
          detail: `${label} — ${info.expired ? `échéance du ${dateLong(info.end)} dépassée` : `fin le ${dateLong(info.end)} (dans ${Math.max(0, Math.round(days / 30.44))} mois)`}`,
          href,
          late: !!info.expired,
        });
      }
      if (info.nextRevision && today >= addMonthsIso(info.nextRevision, -REVISION_NOTICE_MONTHS)) {
        out.push({
          id: `revision:${unit.id}:${info.nextRevision}`,
          kind: "revision",
          date: info.nextRevision,
          title: "Révision du loyer",
          detail: `${label} — ${today >= info.nextRevision ? "à appliquer depuis le" : "le"} ${dateLong(info.nextRevision)}`,
          href,
          late: today > info.nextRevision,
        });
      }
    }
  }
  for (const line of unpaidByUnit(data.units)) {
    const { label } = unitPlace(data, line.unit);
    out.push({
      id: `unpaid:${line.unit.id}:${line.months.join(",")}:${Math.round(line.amount)}`,
      kind: "unpaid",
      date: `${line.months[0]}-01`,
      title: "Loyer impayé",
      detail: `${label} — ${line.months.length} mois (${line.months.map(monthKeyLabel).join(", ")})`,
      href: "/loyers",
      late: true,
      amount: line.amount,
    });
  }
  if (resolvedLoans) {
    const limit = addMonthsIso(today, LOAN_END_NOTICE_MONTHS);
    for (const loan of data.loans) {
      const r = resolvedLoans.get(loan.id);
      if (!r || r.finished || r.endMonth === undefined) continue;
      const y = Math.floor(r.endMonth / 12);
      const m = (r.endMonth % 12) + 1;
      const end = fmt(y, m, 1);
      if (end > limit || end < today.slice(0, 8) + "01") continue;
      out.push({
        id: `loan:${loan.id}:${end}`,
        kind: "loan_end",
        date: end,
        title: "Crédit bientôt terminé",
        detail: `${loanLabel(data, loan)} — dernière échéance ${monthLabel(r.endMonth)}${r.quality === "estimated" ? " (estimée)" : ""}`,
        href: `/patrimoine/credit/${loan.id}`,
        late: false,
        amount: r.payment,
      });
    }
  }
  const dismissed = new Set(data.settings.dismissedReminders ?? []);
  return out
    .filter((r) => options.includeDismissed || !dismissed.has(r.id))
    .sort((a, b) => Number(b.late) - Number(a.late) || a.date.localeCompare(b.date));
}
