import type { AppData, Building, Company, Inspection, Tenancy, Unit } from "./types";
import { addMonthsIso, isValidIso, monthKey, outstanding, todayIso } from "./engine/leases";
import { depositDeadline, minDurationYears } from "./legal/rules";
import { compareInspections } from "./legal/inspection";

// Dossiers de location : lecture de l'état d'un logement et reprise
// automatique des informations déjà connues.

export function tenanciesOf(data: AppData, unitId: string): Tenancy[] {
  return data.tenancies.filter((t) => t.unitId === unitId).sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
}

export function activeTenancy(data: AppData, unitId: string): Tenancy | undefined {
  return tenanciesOf(data, unitId).find((t) => t.status === "actif");
}

/** Locataire en cours de départ (sortie commencée, dossier non clos). */
export function leavingTenancy(data: AppData, unitId: string): Tenancy | undefined {
  return tenanciesOf(data, unitId).find((t) => t.status === "sortie");
}

export function draftTenancy(data: AppData, unitId: string): Tenancy | undefined {
  return tenanciesOf(data, unitId).find((t) => t.status === "brouillon");
}

export function inspectionsOf(data: AppData, tenancyId: string) {
  const list = data.inspections.filter((i) => i.tenancyId === tenancyId);
  return { entry: list.find((i) => i.kind === "entree"), exit: list.find((i) => i.kind === "sortie") };
}

/** Dernière sortie du logement (sert de base au prochain état des lieux d'entrée). */
export function lastExitInspection(data: AppData, unitId: string): Inspection | undefined {
  return data.inspections
    .filter((i) => i.unitId === unitId && i.kind === "sortie")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
}

export function landlordCompany(data: AppData, unit: Unit): Company | undefined {
  const b = data.buildings.find((x) => x.id === unit.buildingId);
  return data.companies.find((c) => c.id === b?.companyId);
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Dossier d'un bail existant, reconstitué à partir des informations du logement. */
export function tenancyFromUnit(unit: Unit, landlord?: Company): Tenancy {
  const start = unit.leaseStart ?? unit.entryDate;
  return {
    id: uid(),
    unitId: unit.id,
    status: "actif",
    imported: true,
    tenants: [{ firstName: unit.tenantFirstName, lastName: unit.tenantLastName }],
    startDate: start,
    signDate: start,
    durationYears: unit.leaseDurationYears ?? minDurationYears(landlord),
    rent: unit.rent,
    charges: unit.charges,
    chargesMode: "provision",
    paymentDay: 5,
    paymentTerm: "a_echoir",
    indexLabel: unit.indexLabel,
    indexValue: unit.indexValue,
    createdAt: new Date().toISOString(),
  };
}

/** Nouveau bail pré-rempli : conditions du bail précédent, durée légale selon le bailleur. */
export function newTenancyDraft(unit: Unit, previous: Tenancy | undefined, landlord: Company | undefined, building: Building | undefined): Tenancy {
  const start = previous?.endDate && isValidIso(previous.endDate) ? addMonthsIso(previous.endDate, 0) : todayIso();
  const lastPaid = previous ? lastPaidMonth(unit, previous) : undefined;
  return {
    id: uid(),
    unitId: unit.id,
    status: "brouillon",
    tenants: [{}],
    startDate: nextDay(start),
    signDate: todayIso(),
    signPlace: building?.city?.replace(/^\d{5}\s*/, ""),
    durationYears: minDurationYears(landlord),
    rent: previous?.rent ?? unit.rent,
    charges: previous?.charges ?? unit.charges,
    chargesMode: previous?.chargesMode ?? "provision",
    paymentDay: previous?.paymentDay ?? 5,
    paymentTerm: previous?.paymentTerm ?? "a_echoir",
    paymentMethod: previous?.paymentMethod,
    deposit: previous?.rent ?? unit.rent,
    indexLabel: undefined,
    previousTenantRent: previous?.rent,
    previousTenantRentDate: lastPaid ? `${lastPaid}-${String(previous?.paymentDay ?? 5).padStart(2, "0")}` : undefined,
    previousRevisionDate: unit.lastRevisionDate,
    clauseInsurance: true,
    annexes: ["notice", "edl"],
    createdAt: new Date().toISOString(),
  };
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function lastPaidMonth(unit: Unit, t: Tenancy): string | undefined {
  return Object.entries(unit.payments ?? {})
    .filter(([, p]) => p.status === "paye" && (!p.tenancyId || p.tenancyId === t.id))
    .map(([k]) => k)
    .sort()
    .pop();
}

/** Informations du bail recopiées sur le logement (loyers, rappels, indicateurs). */
export function unitWithTenancy(unit: Unit, t: Tenancy): Unit {
  const first = t.tenants[0] ?? {};
  return {
    ...unit,
    status: "occupe",
    tenantFirstName: first.firstName,
    tenantLastName: [first.lastName, ...t.tenants.slice(1).map((p) => p.lastName)].filter(Boolean).join(" / ") || undefined,
    entryDate: t.startDate,
    rent: t.rent,
    charges: t.charges,
    leaseType: "nue",
    leaseStart: t.startDate,
    leaseDurationYears: t.durationYears,
    leaseEnd: undefined,
    revision: "annuelle",
    indexLabel: t.indexLabel,
    indexValue: t.indexValue,
    lastRevisionDate: undefined,
  };
}

export function unitVacated(unit: Unit): Unit {
  return { ...unit, status: "vacant", tenantFirstName: undefined, tenantLastName: undefined, leaseStart: undefined, leaseEnd: undefined, entryDate: undefined, lastRevisionDate: undefined };
}

/** Sommes impayées pendant le bail (proposées en retenue sur le dépôt de garantie). */
export function unpaidDuring(unit: Unit, t: Tenancy): { months: string[]; amount: number } {
  const start = t.startDate ? monthKey(t.startDate) : "0000-00";
  const end = t.endDate ? monthKey(t.endDate) : "9999-99";
  const months = Object.entries(unit.payments ?? {})
    .filter(([k, p]) => k >= start && k <= end && (!p.tenancyId || p.tenancyId === t.id) && outstanding(p) > 0)
    .map(([k]) => k)
    .sort();
  return { months, amount: months.reduce((s, k) => s + outstanding(unit.payments![k]), 0) };
}

/** Échéance de restitution du dépôt pour un locataire sorti. */
export function depositDue(data: AppData, t: Tenancy): string | undefined {
  const { entry, exit } = inspectionsOf(data, t.id);
  const conform = exit ? compareInspections(entry, exit).conform : false;
  return depositDeadline(t.keysReturnedDate ?? t.endDate, conform);
}

// ——— Informations nécessaires au bail : on ne demande que ce qui manque ———

export function missingUnitInfo(unit: Unit): (keyof Unit)[] {
  const keys: (keyof Unit)[] = ["surface", "mainRooms", "habitatType", "heating", "hotWater", "dpeClass"];
  return keys.filter((k) => unit[k] === undefined || unit[k] === "");
}

export function missingBuildingInfo(b: Building | undefined): (keyof Building)[] {
  if (!b) return [];
  const keys: (keyof Building)[] = ["address", "city", "legalRegime", "constructionPeriod", "zoneTendue"];
  return keys.filter((k) => b[k] === undefined || b[k] === "");
}

export function missingLandlordInfo(c: Company | undefined): (keyof Company)[] {
  if (!c) return [];
  const keys: (keyof Company)[] = ["address", "representative"];
  if (c.kind === "SCI" && c.familySci === undefined) keys.push("familySci");
  return keys.filter((k) => c[k] === undefined || c[k] === "");
}

export function tenantsName(t: Tenancy | undefined): string {
  if (!t) return "";
  return t.tenants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean).join(" et ");
}
