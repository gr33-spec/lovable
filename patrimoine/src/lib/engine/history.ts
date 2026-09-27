import type { AppData, Building } from "../types";
import { buildingValue } from "./snapshot";

// Historique des valeurs et plus-values latentes. Aucune estimation n'est
// inventée : une année n'est « complète » que si chaque immeuble détenu a une
// valeur connue (prix d'achat, valeur historique saisie ou valeur actuelle).

export interface ValueMark {
  year: number;
  value: number;
  source: "achat" | "historique" | "actuelle";
}

function acquisitionYear(b: Building): number | undefined {
  const m = b.acquisitionDate ? /^(\d{4})/.exec(b.acquisitionDate) : null;
  return m ? Number(m[1]) : undefined;
}

/** Points de valeur connus d'un immeuble, triés par année (un par année, le plus récent l'emporte). */
export function valueMarks(data: AppData, b: Building, currentYear: number): ValueMark[] {
  const byYear = new Map<number, ValueMark>();
  const acq = acquisitionYear(b);
  if (acq !== undefined && b.acquisitionPrice) byYear.set(acq, { year: acq, value: b.acquisitionPrice, source: "achat" });
  for (const p of b.valueHistory ?? []) {
    if (Number.isFinite(p.year) && Number.isFinite(p.value) && p.year <= currentYear) {
      byYear.set(p.year, { year: p.year, value: p.value, source: "historique" });
    }
  }
  const current = buildingValue(b, data.units.filter((u) => u.buildingId === b.id));
  if (current !== undefined) byYear.set(currentYear, { year: currentYear, value: current, source: "actuelle" });
  return [...byYear.values()].sort((a, b2) => a.year - b2.year);
}

export interface HistoryRow {
  year: number;
  value: number;
  /** Immeubles détenus cette année-là sans valeur connue. */
  missing: number;
  owned: number;
}

/** Valeur totale année par année, de `fromYear` à `currentYear`. */
export function valueHistory(data: AppData, currentYear: number, fromYear?: number): HistoryRow[] {
  const marks = data.buildings.map((b) => ({ b, acq: acquisitionYear(b), marks: valueMarks(data, b, currentYear) }));
  const firstKnown = Math.min(
    ...marks.flatMap((m) => [m.acq ?? Infinity, ...m.marks.map((x) => x.year)]),
    currentYear,
  );
  const start = fromYear ?? firstKnown;
  const rows: HistoryRow[] = [];
  for (let year = start; year <= currentYear; year++) {
    let value = 0;
    let missing = 0;
    let owned = 0;
    for (const { acq, marks: list } of marks) {
      // Pas encore acquis cette année-là.
      if (acq !== undefined && year < acq) continue;
      // Sans date d'acquisition : détenu seulement à partir de la première valeur connue.
      if (acq === undefined && (list.length === 0 || year < list[0].year)) {
        if (list.length === 0 && year === currentYear) {
          owned += 1;
          missing += 1;
        }
        continue;
      }
      owned += 1;
      const known = [...list].reverse().find((x) => x.year <= year);
      if (known) value += known.value;
      else missing += 1;
    }
    rows.push({ year, value, missing, owned });
  }
  return rows;
}

export interface LatentGain {
  building: Building;
  purchase?: number;
  current?: number;
  gain?: number;
  gainPct?: number;
  /** Plus-value par an depuis l'acquisition (moyenne géométrique, %). */
  cagrPct?: number;
}

export function latentGain(data: AppData, b: Building, currentYear: number): LatentGain {
  const current = buildingValue(b, data.units.filter((u) => u.buildingId === b.id));
  const purchase = b.acquisitionPrice || undefined;
  const out: LatentGain = { building: b, purchase, current };
  if (current !== undefined && purchase) {
    out.gain = current - purchase;
    out.gainPct = (out.gain / purchase) * 100;
    const acq = acquisitionYear(b);
    const years = acq !== undefined ? currentYear - acq : 0;
    if (years >= 1 && current > 0) out.cagrPct = (Math.pow(current / purchase, 1 / years) - 1) * 100;
  }
  return out;
}

export function latentGains(data: AppData, currentYear: number) {
  const lines = data.buildings.map((b) => latentGain(data, b, currentYear));
  const known = lines.filter((l) => l.gain !== undefined);
  const purchase = known.reduce((s, l) => s + (l.purchase ?? 0), 0);
  const gain = known.reduce((s, l) => s + (l.gain ?? 0), 0);
  return {
    lines,
    known: known.length,
    missing: lines.length - known.length,
    purchase,
    gain,
    gainPct: purchase > 0 ? (gain / purchase) * 100 : undefined,
  };
}
