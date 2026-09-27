import type { AppData, Scenario } from "../types";
import type { MonthIndex } from "./dates";
import { yearOf } from "./dates";
import { project, rowForYear, type Projection, type YearRow } from "./projection";

export interface ComparePoint {
  year: number;
  before: YearRow;
  after: YearRow;
}

export interface ScenarioComparison {
  base: Projection;
  sim: Projection;
  /** Année de la première opération. */
  keyYear: number;
  points: ComparePoint[];
}

/** Compare les données réelles (avec opérations validées) et le scénario. */
export function compareScenario(data: AppData, nowMonth: MonthIndex, scenario: Scenario, base?: Projection): ScenarioComparison {
  const y0 = yearOf(nowMonth);
  const baseline = base ?? project(data, nowMonth);
  const sim = project(data, nowMonth, { scenarioActions: scenario.actions });
  const keyYear = Math.max(y0, Math.min(...scenario.actions.map((a) => a.year), y0 + 30));
  const years = [...new Set([keyYear, keyYear + 5, y0 + 10, y0 + 20, y0 + 30])].filter((y) => y <= y0 + 30).sort((a, b) => a - b);
  const points = years
    .map((year) => ({ year, before: rowForYear(baseline, year)!, after: rowForYear(sim, year)! }))
    .filter((p) => p.before && p.after);
  return { base: baseline, sim, keyYear, points };
}

/** Patrimoine total = immobilier net + trésorerie cumulée. */
export function totalWealth(r: YearRow): number {
  return r.net + r.treasury;
}
