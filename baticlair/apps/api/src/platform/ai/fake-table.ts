import { isWithoutSupplyUnit, parseUnit } from "@baticlair/domain";

/**
 * Lecture « simulée » d'un tableau de devis (développement et tests
 * uniquement) : une ligne numérotée « [p:lll] réf  désignation  qté unité  …»
 * dont les colonnes sont séparées par au moins deux espaces.
 */
const NUMBER = /^\d[\d\s]*(,\d+)?$/;

export interface FakeRow {
  ref: string;
  cols: string[];
  /** Colonne de la quantité, sa valeur et son unité. */
  index: number;
  quantity: string;
  unit: string;
}

export function isNumberCell(cell: string | undefined): cell is string {
  return cell !== undefined && NUMBER.test(cell.trim());
}

/** Une unité de commande, ou une unité de prestation (h, jour, fft : §49.9) que la vraie lecture rend aussi. */
const unitLike = (text: string) => parseUnit(text) !== null || isWithoutSupplyUnit(text);

export function fakeRows(numberedText: string): FakeRow[] {
  const rows: FakeRow[] = [];
  for (const raw of numberedText.split("\n")) {
    const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
    if (!m) continue;
    const cols = m[2]!.split(/\s{2,}/);
    for (let i = 1; i < cols.length; i++) {
      const cell = cols[i]!;
      if (NUMBER.test(cell) && unitLike(cols[i + 1] ?? "")) {
        rows.push({ ref: m[1]!, cols, index: i, quantity: cell, unit: cols[i + 1]! });
        break;
      }
      const joined = /^(\d[\d\s]*(?:,\d+)?)\s+(\S+)$/.exec(cell);
      if (joined && unitLike(joined[2]!)) {
        rows.push({ ref: m[1]!, cols, index: i, quantity: joined[1]!, unit: joined[2]! });
        break;
      }
    }
  }
  return rows;
}
