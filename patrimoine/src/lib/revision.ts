import type { AppData, Tenancy, Unit } from "./types";
import { irlAt, irlLabel, parseIrlLabel, publicationDate, type IrlPoint } from "./irl";
import { REVISION_NOTICE_MONTHS, addMonthsIso, leaseInfo, revisedRent } from "./engine/leases";

// Révision annuelle du loyer (bail d'habitation, IRL) : tout ce qui peut être
// déduit l'est — date, trimestre de référence, indices INSEE, nouveau loyer.
// Seul un indice introuvable reste à saisir.

export interface IndexValue {
  label: string;
  value: number;
}

export interface RevisionPlan {
  unit: Unit;
  tenancy?: Tenancy;
  /** Date de révision prévue (anniversaire). */
  due: string;
  /** Date d'effet : la date prévue, ou aujourd'hui si la révision est demandée en retard. */
  effective: string;
  late: boolean;
  /** Date limite pour la demander. */
  deadline?: string;
  rent?: number;
  charges?: number;
  /** Trimestre de l'IRL retenu (clause du bail, à défaut dernier indice publié à la signature). */
  quarter?: 1 | 2 | 3 | 4;
  reference?: IndexValue;
  index?: IndexValue;
  newRent?: number;
  /** Bail commercial : révision triennale sur un autre indice, non automatisée. */
  commercial: boolean;
  /** Révision interdite (logement classé F ou G). */
  blocked?: string;
}

/** Trimestre de référence : celui du bail, sinon celui du dernier IRL publié à la signature (art. 17-1, loi du 6 juillet 1989). */
export function referenceQuarter(unit: Unit, tenancy: Tenancy | undefined, series: IrlPoint[] | null): 1 | 2 | 3 | 4 | undefined {
  const fromLabel = parseIrlLabel(unit.indexLabel ?? tenancy?.indexLabel);
  if (fromLabel) return fromLabel.quarter;
  const signed = tenancy?.signDate ?? unit.leaseStart ?? tenancy?.startDate;
  if (!series || !signed) return undefined;
  return irlAt(series, signed)?.quarter;
}

/**
 * Indices de la révision : IRL du trimestre de référence publié à la date de
 * révision, comparé au même trimestre un an plus tôt (variation sur un an,
 * même si une révision a été omise).
 */
export function revisionIndices(series: IrlPoint[] | null, quarter: number | undefined, due: string): { reference?: IndexValue; index?: IndexValue } {
  if (!series || !quarter) return {};
  const at = [...series].filter((p) => p.quarter === quarter && publicationDate(p) <= due).sort((a, b) => b.year - a.year)[0];
  if (!at) return {};
  const before = series.find((p) => p.quarter === quarter && p.year === at.year - 1);
  return {
    index: { label: irlLabel(at), value: at.value },
    reference: before ? { label: irlLabel(before), value: before.value } : undefined,
  };
}

export function revisionPlan(data: AppData, unit: Unit, series: IrlPoint[] | null, today: string): RevisionPlan | undefined {
  if (unit.status === "vacant") return undefined;
  const info = leaseInfo(unit, today);
  if (!info.nextRevision) return undefined;
  const tenancy = data.tenancies.find((t) => t.unitId === unit.id && t.status === "actif");
  const commercial = unit.leaseType === "commercial" || unit.revision === "triennale";
  const late = info.nextRevision < today;
  const plan: RevisionPlan = {
    unit,
    tenancy,
    due: info.nextRevision,
    effective: late ? today : info.nextRevision,
    late,
    deadline: info.revisionDeadline,
    rent: unit.rent,
    charges: unit.charges,
    commercial,
  };
  if (unit.dpeClass === "F" || unit.dpeClass === "G") {
    plan.blocked = `Logement classé ${unit.dpeClass} au DPE : le loyer ne peut pas être révisé.`;
    return plan;
  }
  if (commercial) {
    if (unit.indexLabel && unit.indexValue) plan.reference = { label: unit.indexLabel, value: unit.indexValue };
    return plan;
  }
  plan.quarter = referenceQuarter(unit, tenancy, series);
  const { reference, index } = revisionIndices(series, plan.quarter, info.nextRevision);
  // Sans série INSEE : l'indice déjà connu du bail sert de référence, seul le nouvel indice reste à saisir.
  plan.reference = reference ?? (unit.indexLabel && unit.indexValue ? { label: unit.indexLabel, value: unit.indexValue } : undefined);
  plan.index = index;
  plan.newRent = revisedRent(unit.rent, plan.reference?.value, index?.value);
  return plan;
}

/** Unités dont la révision est à faire (rappel ouvert : un mois avant, jusqu'à la date limite). */
export function revisionsDue(data: AppData, series: IrlPoint[] | null, today: string): RevisionPlan[] {
  const limit = addMonthsIso(today, REVISION_NOTICE_MONTHS);
  const dismissed = new Set(data.settings.dismissedReminders ?? []);
  return data.units
    .map((u) => revisionPlan(data, u, series, today))
    .filter((p): p is RevisionPlan => !!p && p.due <= limit && !dismissed.has(`revision:${p.unit.id}:${p.due}`))
    .sort((a, b) => a.due.localeCompare(b.due));
}
