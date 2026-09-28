import type { Company, Tenancy } from "../types";
import { addMonthsIso, daysBetween, isValidIso } from "../engine/leases";

// Règles de la location nue à usage de résidence principale (loi n° 89-462
// du 6 juillet 1989). Seules des règles certaines et stables sont codées ;
// tout le reste est saisi et reste modifiable.

/**
 * Durée minimale du bail (art. 10) : 3 ans si le bailleur est une personne
 * physique ou une SCI familiale, 6 ans si c'est une personne morale.
 */
export function minDurationYears(landlord: Company | undefined): 3 | 6 {
  if (!landlord) return 3;
  if (landlord.familySci) return 3;
  return 6;
}

/** Durée proposée pour les nouveaux baux (réglage du propriétaire). */
export const DEFAULT_LEASE_YEARS = 3;

export function leaseYears(settings: { leaseYears?: number } | undefined): number {
  return settings?.leaseYears && settings.leaseYears > 0 ? settings.leaseYears : DEFAULT_LEASE_YEARS;
}

/** Dépôt de garantie maximal (art. 22) : un mois de loyer hors charges. */
export function maxDeposit(rent: number | undefined): number | undefined {
  return rent && rent > 0 ? Math.round(rent * 100) / 100 : undefined;
}

/**
 * Délai de restitution du dépôt de garantie (art. 22) à compter de la remise
 * des clés : un mois si l'état des lieux de sortie est conforme à celui
 * d'entrée, deux mois sinon.
 */
export function depositDeadline(keysReturnedDate: string | undefined, exitConform: boolean): string | undefined {
  if (!isValidIso(keysReturnedDate)) return undefined;
  return addMonthsIso(keysReturnedDate, exitConform ? 1 : 2);
}

/**
 * Majoration pour restitution tardive (art. 22) : 10 % du loyer mensuel hors
 * charges pour chaque période mensuelle commencée en retard.
 */
export function lateDepositPenalty(rent: number | undefined, deadline: string | undefined, returnedDate: string | undefined): number {
  if (!rent || !deadline || !returnedDate || returnedDate <= deadline) return 0;
  let months = 0;
  let cursor = deadline;
  while (cursor < returnedDate && months < 120) {
    months += 1;
    cursor = addMonthsIso(deadline, months);
  }
  return Math.round(rent * 0.1 * months * 100) / 100;
}

export interface DepositSettlement {
  held: number;
  deductions: number;
  toReturn: number;
  /** Retenues supérieures au dépôt : reste dû par le locataire. */
  tenantOwes: number;
}

export function depositSettlement(t: Pick<Tenancy, "deposit" | "deductions">): DepositSettlement {
  const held = t.deposit ?? 0;
  const deductions = (t.deductions ?? []).reduce((s, d) => s + (d.amount ?? 0), 0);
  return {
    held,
    deductions,
    toReturn: Math.max(0, Math.round((held - deductions) * 100) / 100),
    tenantOwes: Math.max(0, Math.round((deductions - held) * 100) / 100),
  };
}

/** Jours d'occupation d'un mois (AAAA-MM) entre deux dates incluses. */
export function occupiedDays(month: string, start?: string, end?: string): { days: number; total: number } {
  const [y, m] = month.split("-").map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${month}-01`;
  const last = `${month}-${String(total).padStart(2, "0")}`;
  const from = isValidIso(start) && start > first ? start : first;
  const to = isValidIso(end) && end < last ? end : last;
  if (to < from) return { days: 0, total };
  return { days: daysBetween(from, to) + 1, total };
}
