import { normalizeText } from "../trades/trade-profile.js";
import { parseUnit } from "../quantity/unit.js";

/**
 * LA DOUBLE LECTURE (décision du fondateur, 2026-10-05 : « on met une IA puissante pour vérifier, double lecture
 * s'il faut ; une fois bien entraîné, on redescendra en puissance »). Le devis est lu deux fois, indépendamment ; le
 * CODE compare, jamais l'IA. Deux lectures d'accord sur une ligne : elle est sûre, même si une lecture hésitait. Deux
 * lectures en désaccord : la ligne garde la première lecture et dit les deux valeurs (orange). Une ligne lue une seule
 * fois : gardée, orange, jamais perdue ni ajoutée en silence.
 */
export interface ReadLine {
  designation: string;
  quantity?: string | null | undefined;
  unit?: string | null | undefined;
  sourceRefs: readonly string[];
  sourcePages: readonly number[];
  section: readonly string[];
  doubt?: string | null | undefined;
}

export interface Reconciled<T extends ReadLine> {
  lines: T[];
  /** Lignes lues pareil par les deux lectures. */
  agreed: number;
  /** Lignes où les deux lectures donnent une quantité ou une unité différente. */
  disagreed: number;
  /** Lignes lues par une seule des deux lectures. */
  single: number;
}

const words = (s: string) => new Set(normalizeText(s).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1));
function likeness(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.max(wa.size, wb.size);
}
/** Seuil : au moins 60 % des mots en commun (« Prise 2P+T 16A » ≈ « Prise 2P+T 16 A cuisine »). */
const SAME_LINE = 0.6;

const amount = (q: string | null | undefined) => {
  if (!q) return null;
  const n = q.replace(/[\s  ]/g, "").replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(n) ? Number(n) : normalizeText(q);
};
const unitKey = (u: string | null | undefined) => (u ? (parseUnit(u) ?? normalizeText(u)) : null);
const sameValue = (a: ReadLine, b: ReadLine) => amount(a.quantity) === amount(b.quantity) && unitKey(a.unit) === unitKey(b.unit);
const written = (l: ReadLine) => [l.quantity, l.unit].filter(Boolean).join(" ") || "sans quantité";

/** Messages de lecture (« lisible » : un doute de LECTURE, toujours montré à l'artisan, jamais pris pour un calcul). */
export const disagreementDoubt = (a: ReadLine, b: ReadLine) => `Chiffre peu lisible : les deux lectures donnent « ${written(a)} » et « ${written(b)} ». Lequel est le bon ?`;
export const SINGLE_READ_DOUBT = "Ligne peu lisible : lue par une seule des deux lectures. Est-elle bien dans le devis ?";

/** La place d'une ligne dans le devis (« 2:14 » → [2, 14]) pour garder l'ordre du devis. */
const position = (l: ReadLine): [number, number] => {
  const ref = l.sourceRefs[0];
  const m = ref ? /^(\d+):(\d+)/.exec(ref) : null;
  return m ? [Number(m[1]), Number(m[2])] : [l.sourcePages[0] ?? Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
};

export function reconcileReadings<T extends ReadLine>(first: readonly T[], second: readonly T[]): Reconciled<T> {
  const used = new Set<number>();
  const pick = (a: T): number => {
    let best = -1;
    let score = 0;
    second.forEach((b, j) => {
      if (used.has(j)) return;
      // Même cellule du devis : la même ligne, même si les mots diffèrent un peu.
      const sameRef = a.sourceRefs.some((r) => b.sourceRefs.includes(r));
      const s = likeness(a.designation, b.designation) + (sameRef ? 0.5 : 0) + (normalizeText(a.section.join(">")) === normalizeText(b.section.join(">")) ? 0.1 : 0);
      if ((sameRef || likeness(a.designation, b.designation) >= SAME_LINE) && s > score) {
        best = j;
        score = s;
      }
    });
    return best;
  };
  let agreed = 0;
  let disagreed = 0;
  let single = 0;
  const lines: T[] = first.map((a) => {
    const j = pick(a);
    if (j < 0) {
      single++;
      return { ...a, doubt: SINGLE_READ_DOUBT };
    }
    used.add(j);
    const b = second[j]!;
    if (sameValue(a, b)) {
      agreed++;
      // D'accord à deux : sûr. Un doute ne reste que si les deux lectures l'ont eu.
      return { ...a, doubt: a.doubt && b.doubt ? a.doubt : null };
    }
    disagreed++;
    return { ...a, doubt: disagreementDoubt(a, b) };
  });
  // Les lignes que seule la seconde lecture a vues : gardées, à leur place dans le devis, orange.
  second.forEach((b, j) => {
    if (used.has(j)) return;
    single++;
    const line = { ...b, doubt: SINGLE_READ_DOUBT };
    const [p, r] = position(b);
    const at = lines.findIndex((l) => {
      const [lp, lr] = position(l);
      return lp > p || (lp === p && lr > r);
    });
    if (at < 0) lines.push(line);
    else lines.splice(at, 0, line);
  });
  return { lines, agreed, disagreed, single };
}
