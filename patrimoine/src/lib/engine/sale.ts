import type { AppData, Building, SaleAction, Unit } from "../types";
import { buildingRent, buildingValue } from "./snapshot";

// Vente d'un immeuble entier ou de certains lots : quote-part des loyers, de
// la valeur, des charges et de la dette qui part avec les lots vendus.
// Aucune règle fiscale : l'impôt sur la plus-value est saisi par l'utilisateur.

export interface SaleShares {
  /** Vente de tout l'immeuble (aucun lot choisi, ou tous les lots restants). */
  whole: boolean;
  units: Unit[];
  /** Loyers perdus (mensuels, hors charges, logements loués seulement). */
  rent: number;
  /** Quote-part des lots vendus (loyers potentiels, sinon nombre de lots) : charges et dette. */
  share: number;
  /** Valeur retirée du patrimoine (valeur des lots, sinon quote-part de la valeur de l'immeuble). */
  value?: number;
  /** Quote-part calculée au nombre de lots faute de loyers détaillés. */
  byCount: boolean;
}

export function saleShares(building: Building, units: Unit[], unitIds: string[] | undefined): SaleShares {
  const chosen = units.filter((u) => unitIds?.includes(u.id));
  const whole = !unitIds?.length || chosen.length >= units.length;
  const total = buildingRent(building, units);
  const value = buildingValue(building, units);
  if (whole) return { whole: true, units, rent: total.rent, share: 1, value, byCount: false };
  const withRent = units.some((u) => (u.rent ?? 0) > 0);
  const potential = chosen.reduce((s, u) => s + (u.rent ?? 0), 0);
  const byCount = !withRent || total.potential <= 0;
  const share = byCount ? chosen.length / Math.max(1, units.length) : potential / total.potential;
  const rent = withRent ? chosen.filter((u) => u.status !== "vacant").reduce((s, u) => s + (u.rent ?? 0), 0) : total.rent * share;
  const lotValues = chosen.every((u) => u.value !== undefined) ? chosen.reduce((s, u) => s + (u.value ?? 0), 0) : undefined;
  return { whole: false, units: chosen, rent, share, value: lotValues ?? (value !== undefined ? value * share : undefined), byCount };
}

/** Prix total : prix de l'immeuble, ou somme des prix des lots (inconnu si un prix manque). */
export function salePrice(a: SaleAction): number | undefined {
  if (!a.lots?.length) return a.price;
  if (a.lots.some((l) => l.price === undefined)) return undefined;
  return a.lots.reduce((s, l) => s + (l.price ?? 0), 0);
}

/** Libellé court : « Immeuble du Port » ou « Immeuble du Port — 3 lots ». */
export function saleLabel(data: AppData, a: SaleAction): string {
  const b = data.buildings.find((x) => x.id === a.buildingId);
  const name = b?.name ?? "Immeuble";
  const units = data.units.filter((u) => u.buildingId === a.buildingId);
  const lots = a.lots?.length ?? 0;
  if (!lots || lots >= units.length) return name;
  const names = a.lots!.map((l) => units.find((u) => u.id === l.unitId)?.name).filter(Boolean);
  return `${name} — ${lots <= 2 ? names.join(", ") : `${lots} lots`}`;
}
