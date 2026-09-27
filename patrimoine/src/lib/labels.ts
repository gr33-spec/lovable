import type { CompanyKind, Condition, LeaseType, Priority, UnitType, WithdrawalKind, WorkStatus } from "./types";

export const COMPANY_KINDS: { value: CompanyKind; label: string }[] = [
  { value: "holding", label: "Holding" },
  { value: "SCI", label: "SCI" },
  { value: "SC", label: "SC" },
  { value: "SARL", label: "SARL" },
  { value: "SAS", label: "SAS" },
  { value: "autre", label: "Autre" },
];

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "neuf", label: "Neuf / rénové" },
  { value: "bon", label: "Bon état" },
  { value: "correct", label: "État correct" },
  { value: "a_renover", label: "À rénover" },
];

export const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "T1", label: "T1" },
  { value: "T2", label: "T2" },
  { value: "T3", label: "T3" },
  { value: "T4", label: "T4" },
  { value: "T5+", label: "T5 et +" },
  { value: "commerce", label: "Commerce" },
  { value: "bureau", label: "Bureau" },
  { value: "parking", label: "Parking" },
  { value: "autre", label: "Autre" },
];

export const WORK_STATUSES: { value: WorkStatus; label: string }[] = [
  { value: "envisage", label: "Envisagé" },
  { value: "prevu", label: "Prévu" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "haute", label: "Haute" },
  { value: "normale", label: "Normale" },
  { value: "basse", label: "Basse" },
];

export const WITHDRAWAL_KINDS: { value: WithdrawalKind; label: string }[] = [
  { value: "cca", label: "Remboursement de compte courant" },
  { value: "salaire", label: "Salaire / rémunération" },
  { value: "dividendes", label: "Dividendes" },
  { value: "autre", label: "Autre" },
];

export function labelOf<T extends string>(list: { value: T; label: string }[], value: T | undefined | null): string | undefined {
  return list.find((x) => x.value === value)?.label;
}

export const LEASE_TYPES: { value: LeaseType; label: string }[] = [
  { value: "nue", label: "Location nue" },
  { value: "meuble", label: "Location meublée" },
  { value: "commercial", label: "Bail commercial" },
  { value: "professionnel", label: "Bail professionnel" },
  { value: "autre", label: "Autre" },
];

export const REVISIONS: { value: "annuelle" | "triennale" | "aucune"; label: string }[] = [
  { value: "annuelle", label: "Annuelle" },
  { value: "triennale", label: "Triennale" },
  { value: "aucune", label: "Aucune" },
];
