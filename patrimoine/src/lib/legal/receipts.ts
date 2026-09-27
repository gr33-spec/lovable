import type { RentPayment, Tenancy, Unit } from "../types";
import { monthKey, shiftMonthKey } from "../engine/leases";
import { occupiedDays } from "./rules";

// Quittances et reçus (art. 21 de la loi du 6 juillet 1989) :
// - la quittance est délivrée gratuitement, sur demande, et distingue le
//   loyer et les charges ;
// - elle n'est établie que pour une période intégralement payée ;
// - en cas de paiement partiel, le bailleur délivre un reçu.

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface MonthDue {
  rent: number;
  charges: number;
  total: number;
  /** Occupation partielle du mois (entrée ou sortie en cours de mois). */
  prorata?: { days: number; total: number };
}

/** Montant appelé pour un mois, au prorata en cas d'entrée ou de sortie en cours de mois. */
export function monthDue(t: Pick<Tenancy, "rent" | "charges" | "startDate" | "endDate">, month: string): MonthDue {
  const { days, total } = occupiedDays(month, t.startDate, t.endDate);
  const ratio = total ? days / total : 0;
  const rent = r2((t.rent ?? 0) * ratio);
  const charges = r2((t.charges ?? 0) * ratio);
  return { rent, charges, total: r2(rent + charges), prorata: days < total ? { days, total } : undefined };
}

/** Détail loyer / charges d'un paiement pointé (ou, à défaut, du montant appelé). */
export function paymentSplit(p: RentPayment | undefined, due: MonthDue): { rent: number; charges: number; total: number } {
  const total = p?.due ?? due.total;
  const charges = p?.charges ?? (p?.rent !== undefined ? r2(total - p.rent) : Math.min(due.charges, total));
  const rent = p?.rent ?? r2(total - charges);
  return { rent, charges, total: r2(rent + charges) };
}

export function paymentFor(unit: Unit, t: Tenancy, month: string): RentPayment | undefined {
  const p = unit.payments?.[month];
  if (!p) return undefined;
  if (p.tenancyId && p.tenancyId !== t.id) return undefined;
  return p;
}

export type MonthReceipt =
  | { kind: "quittance"; month: string; rent: number; charges: number; total: number; paidDate?: string; prorata?: MonthDue["prorata"] }
  | { kind: "recu"; month: string; received: number; rent: number; charges: number; total: number; remaining: number; paidDate?: string; prorata?: MonthDue["prorata"] }
  | { kind: "aucun"; month: string; reason: string };

export function monthReceipt(unit: Unit, t: Tenancy, month: string): MonthReceipt {
  const due = monthDue(t, month);
  if (due.total <= 0) return { kind: "aucun", month, reason: "Aucun loyer n'est dû pour ce mois au titre de ce bail." };
  const p = paymentFor(unit, t, month);
  if (!p) return { kind: "aucun", month, reason: "Le paiement de ce mois n'a pas encore été pointé (onglet Loyers)." };
  const split = paymentSplit(p, due);
  if (p.status === "paye") return { kind: "quittance", month, ...split, paidDate: p.paidDate, prorata: due.prorata };
  if (p.status === "partiel" && (p.paid ?? 0) > 0) {
    return { kind: "recu", month, received: r2(p.paid ?? 0), ...split, remaining: r2(split.total - (p.paid ?? 0)), paidDate: p.paidDate, prorata: due.prorata };
  }
  return { kind: "aucun", month, reason: "Aucun paiement n'a été reçu pour ce mois : ni quittance ni reçu ne peuvent être établis." };
}

export interface StatementLine {
  month: string;
  due: number;
  rent: number;
  charges: number;
  paid: number;
  status: "paye" | "partiel" | "impaye" | "non_pointe";
}

export interface RentStatement {
  kind: "attestation" | "recu" | "incomplet";
  from: string;
  to: string;
  lines: StatementLine[];
  totalDue: number;
  totalPaid: number;
  totalRent: number;
  totalCharges: number;
  remaining: number;
  unpointed: string[];
}

/**
 * Situation des paiements sur une période (mois AAAA-MM inclus).
 * - tous les mois payés → attestation de loyers à jour (vaut quittance) ;
 * - des impayés ou paiements partiels → reçu des sommes effectivement versées ;
 * - des mois non pointés → aucune attestation possible tant qu'ils ne le sont pas.
 */
export function rentStatement(unit: Unit, t: Tenancy, fromMonth: string, toMonth: string): RentStatement {
  const lines: StatementLine[] = [];
  const start = t.startDate ? monthKey(t.startDate) : fromMonth;
  let m = fromMonth < start ? start : fromMonth;
  const endBound = t.endDate ? monthKey(t.endDate) : toMonth;
  const last = toMonth > endBound ? endBound : toMonth;
  let guard = 0;
  while (m <= last && guard < 600) {
    guard += 1;
    const due = monthDue(t, m);
    if (due.total > 0) {
      const p = paymentFor(unit, t, m);
      const split = paymentSplit(p, due);
      const paid = !p ? 0 : p.status === "paye" ? split.total : p.status === "partiel" ? p.paid ?? 0 : 0;
      lines.push({ month: m, due: split.total, rent: split.rent, charges: split.charges, paid: r2(paid), status: p ? p.status : "non_pointe" });
    }
    m = shiftMonthKey(m, 1);
  }
  const totalDue = r2(lines.reduce((s, l) => s + l.due, 0));
  const totalPaid = r2(lines.reduce((s, l) => s + l.paid, 0));
  const unpointed = lines.filter((l) => l.status === "non_pointe").map((l) => l.month);
  const allPaid = lines.length > 0 && lines.every((l) => l.status === "paye");
  return {
    kind: unpointed.length > 0 ? "incomplet" : allPaid ? "attestation" : "recu",
    from: lines[0]?.month ?? fromMonth,
    to: lines[lines.length - 1]?.month ?? toMonth,
    lines,
    totalDue,
    totalPaid,
    totalRent: r2(lines.reduce((s, l) => s + (l.status === "paye" ? l.rent : 0), 0)),
    totalCharges: r2(lines.reduce((s, l) => s + (l.status === "paye" ? l.charges : 0), 0)),
    remaining: r2(totalDue - totalPaid),
    unpointed,
  };
}
