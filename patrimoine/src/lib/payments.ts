import type { AppData, RentPayment, Unit } from "./types";
import { expectedMonthly, monthKey, shiftMonthKey } from "./engine/leases";
import { monthDue } from "./legal/receipts";

// Pointage des loyers : montant attendu d'un mois, et mise « à jour »
// (tous les mois non pointés depuis l'entrée du locataire marqués payés).

/** Bail couvrant le mois (le montant appelé est alors calculé au prorata des jours d'occupation). */
export function tenancyForMonth(data: AppData, unit: Unit, month: string) {
  const first = `${month}-01`;
  const last = `${month}-31`;
  return data.tenancies.find(
    (t) => t.unitId === unit.id && t.status !== "brouillon" && (!t.startDate || t.startDate <= last) && (!t.endDate || t.endDate >= first),
  );
}

/** Montant attendu pour le mois, avec le détail loyer / charges. */
export function dueFor(data: AppData, unit: Unit, month: string): Pick<RentPayment, "due" | "rent" | "charges" | "tenancyId"> {
  const t = tenancyForMonth(data, unit, month);
  if (!t) return { due: expectedMonthly(unit), rent: unit.rent, charges: unit.charges };
  const d = monthDue(t, month);
  return { due: d.total, rent: d.rent, charges: d.charges, tenancyId: t.id };
}

/** Plafond de la remise à jour : les 3 dernières années. */
export const UP_TO_DATE_MAX_MONTHS = 36;

/** Date d'entrée du locataire actuel (bail en cours, sinon fiche du logement). */
export function entryDate(data: AppData, unit: Unit): string | undefined {
  const active = data.tenancies.find((t) => t.unitId === unit.id && t.status === "actif");
  return active?.startDate ?? unit.leaseStart ?? unit.entryDate;
}

/**
 * Locataire « à jour » : chaque mois non pointé, de son entrée (au plus
 * 3 ans en arrière, 12 mois si l'entrée est inconnue) jusqu'au mois en cours,
 * est marqué payé. Les mois déjà pointés (impayé, partiel, payé) ne changent pas.
 */
export function upToDate(data: AppData, unit: Unit, today: string): { payments: Record<string, RentPayment>; months: string[] } {
  if (unit.status === "vacant") return { payments: unit.payments ?? {}, months: [] };
  const current = monthKey(today);
  const floor = shiftMonthKey(current, -(UP_TO_DATE_MAX_MONTHS - 1));
  const entry = entryDate(data, unit);
  let from = entry ? monthKey(entry) : shiftMonthKey(current, -11);
  if (from < floor) from = floor;
  const payments = { ...(unit.payments ?? {}) };
  const months: string[] = [];
  for (let k = from; k <= current; k = shiftMonthKey(k, 1)) {
    if (payments[k]) continue;
    const due = dueFor(data, unit, k);
    if (!due.due) continue;
    payments[k] = { ...due, status: "paye" };
    months.push(k);
  }
  return { payments, months };
}
