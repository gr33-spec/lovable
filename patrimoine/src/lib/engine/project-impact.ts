import type { AppData, Project } from "../types";
import { parseMonth, yearOf, type MonthIndex } from "./dates";
import { project, type YearRow } from "./projection";

// Effet d'un projet sur le groupe : projections sans / avec le projet,
// comparées sur la première année pleine après la mise en location.

export interface ImpactSide {
  cashflowMonthly: number;
  debt: number;
  value?: number;
  ltvPct?: number;
  /** Capacité de remboursement du groupe : (loyers − charges) ÷ mensualités (même règle que le DSCR). */
  dscr?: number;
}

export interface ProjectImpact {
  year: number;
  before: ImpactSide;
  after: ImpactSide;
}

function side(row: YearRow, valued: boolean): ImpactSide {
  return {
    cashflowMonthly: row.cashflow / 12,
    debt: row.debt,
    value: valued ? row.value : undefined,
    ltvPct: valued && row.value > 0 ? (row.debt / row.value) * 100 : undefined,
    dscr: row.payments > 0 && row.rent > 0 ? (row.rent - row.charges) / row.payments : undefined,
  };
}

export function projectImpact(data: AppData, nowMonth: MonthIndex, p: Project): ProjectImpact | undefined {
  const withFlag = (on: boolean): AppData => ({ ...data, projects: (data.projects ?? []).map((x) => (x.id === p.id ? { ...x, inProjection: on } : x)) });
  const start = Math.max(nowMonth, parseMonth(p.rentStartDate) ?? parseMonth(p.purchaseDate) ?? nowMonth);
  const year = yearOf(start) + 1;
  const base = project(withFlag(false), nowMonth);
  const before = base.years.find((r) => r.year === year);
  const after = project(withFlag(true), nowMonth).years.find((r) => r.year === year);
  if (!before || !after) return undefined;
  // Valeur et LTV comparables seulement si tous les biens ont une valeur.
  const valued = base.snapshot.total.unvalued === 0;
  return { year, before: side(before, valued), after: side(after, valued) };
}
