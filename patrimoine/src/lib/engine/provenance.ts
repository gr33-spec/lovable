import type { Loan } from "../types";
import type { ResolvedLoan } from "./loan";

// Origine de chaque chiffre d'un crédit. Une seule règle, utilisée par le
// moteur (totaux « estimés »), les fiches, les alertes et le dossier banque.
// Le tableau de la banque prime toujours : dès qu'il est importé, une
// estimation antérieure cesse d'alimenter les calculs.

export type Source = "banque" | "saisie" | "calcul" | "estimation" | "inconnue";

export const SOURCE_LABEL: Record<Source, string> = {
  banque: "Tableau de la banque",
  saisie: "Saisi",
  calcul: "Calculé",
  estimation: "Estimé",
  inconnue: "Non communiqué",
};

const hasSchedule = (l: Loan) => (l.schedule?.rows.length ?? 0) >= 2;

/** Mensualité : banque, saisie, calculée (montant + taux + durée, ou taux déduit), estimée (taux inconnu) ou inconnue. */
export function paymentSource(l: Loan, r: ResolvedLoan): Source {
  if (hasSchedule(l)) return "banque";
  if (r.payment === undefined) return "inconnue";
  if (l.monthlyPayment !== undefined) return "saisie";
  if (l.ratePct !== undefined || r.impliedRatePct !== undefined) return "calcul";
  return "estimation";
}

/** Capital restant dû. */
export function balanceSource(l: Loan, r: ResolvedLoan): Source {
  if (hasSchedule(l)) return "banque";
  if (r.balance === undefined) return "inconnue";
  if (l.remaining !== undefined) return l.remainingDate && l.remainingDate.slice(0, 7) !== new Date().toISOString().slice(0, 7) ? "calcul" : "saisie";
  return r.quality === "estimated" ? "estimation" : "calcul";
}

/** Taux. */
export function rateSource(l: Loan, r: ResolvedLoan): Source {
  if (hasSchedule(l)) return "banque";
  if (l.ratePct !== undefined) return "saisie";
  if (r.impliedRatePct !== undefined) return "calcul";
  return "inconnue";
}

/** Date de fin. */
export function endSource(l: Loan, r: ResolvedLoan): Source {
  if (hasSchedule(l)) return "banque";
  if (r.endMonth === undefined) return "inconnue";
  if (l.endDate) return "saisie";
  if (r.quality === "estimated") return "estimation";
  return "calcul";
}

/** Mensualité seulement estimée ou inconnue : les totaux qui l'incluent sont approchés. */
export const paymentUncertain = (l: Loan, r: ResolvedLoan) => {
  const s = paymentSource(l, r);
  return s === "estimation" || s === "inconnue";
};
