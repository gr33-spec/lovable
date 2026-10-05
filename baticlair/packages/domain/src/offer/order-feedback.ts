import { normalizeText } from "../trades/trade-profile.js";

/**
 * §47.5 COUCHE 5, LA RÉALITÉ : le retour fournisseur. Quand le négoce a répondu, l'artisan dit d'un tap « commandé tel
 * quel » ou « modifié » ; modifié, il colle ou photographie son bon de commande. Les écarts entre la liste envoyée et le
 * bon de commande entrent au journal comme des corrections, marquées « bon de commande » : une correction venue d'une
 * commande réelle pèse plus que les confirmations d'écran. Rien n'est calculé par l'IA : le code lit les quantités et
 * compare ; la photo, lue par l'IA, ne donne que des lignes telles qu'imprimées.
 */

/** Une ligne de la liste envoyée au fournisseur (copie figée de la demande). */
export interface SentLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/** Une ligne du bon de commande : collée par l'artisan, ou lue sur la photo (avec la ligne demandée qu'elle reprend). */
export interface OrderedLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** Rang (à partir de 0) de la ligne envoyée qu'elle reprend, quand la lecture l'a dit. */
  requestIndex?: number | null;
}

export type OrderGapKind = "same" | "changed" | "removed" | "added";

export interface OrderGap {
  kind: OrderGapKind;
  /** Rang de la ligne envoyée (null pour une ligne ajoutée au bon de commande). */
  index: number | null;
  designation: string;
  /** Quantité envoyée et quantité commandée, telles qu'écrites. */
  sent: string | null;
  ordered: string | null;
  unit: string | null;
  /** Écart en %, quand les deux quantités se lisent (« 9 271 » → « 9 000 » : −2,9). */
  gapPercent: number | null;
}

/** « 9 271 pièces », « 4 longueurs de 4 m », « 12,5 » → 9271, 4, 12.5 ; rien de lisible → null. */
export function quantityNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /\d[\d\s  ]*(?:[.,]\d+)?/.exec(text);
  if (!m) return null;
  const n = Number(m[0].replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const UNIT = String.raw`(?:pi[eè]ces?|pcs?|u|unit[eé]s?|ml|m2|m²|m|kg|l|rouleaux?|rlx|longueurs?(?: de [\d,.]+ ?m)?|bo[iî]tes?(?: de \d+)?|sacs?|palettes?|bottes?(?: de \d+ ?ml)?|cartouches?|paquets?|feuilles?|barres?)`;
/** Un nombre écrit à la française : « 9 000 », « 2 100 », « 12,5 » (les milliers par groupes de trois chiffres). */
const NUMBER = String.raw`(?:\d{1,3}(?:[ \u202f\u00a0]\d{3})+|\d+)(?:[.,]\d+)?`;
/** Une quantité en fin de ligne : « … : 9 000 pièces », « … 12 ml », « … x 4 », « … 4 u ». */
// « × » collé (« 27×40 350 ») est une dimension, jamais le signe d'une quantité : « x » ne compte qu'entre deux espaces.
const TRAILING = new RegExp(String.raw`(?:[:;\-–]\s*|\s[x×*]\s+|\s)(${NUMBER})\s*(${UNIT})?\s*$`, "i");
/** Une quantité en tête : « 9 000 x Ardoises… », « 12 ml de bande… ». */
const LEADING = new RegExp(String.raw`^(${NUMBER})\s*(${UNIT})?\s*(?:x|×|\*|de|d')?\s+(.+)$`, "i");
/** En-têtes d'un bon de commande : jamais un article. */
const HEADER = /^(bon de commande|bon de livraison|commande|facture|devis|client|date|ref(?:erence)?|n°)\b/i;

/**
 * Le bon de commande collé, une ligne par article : la quantité en fin (« Ardoises 30×22 : 9 000 pièces ») ou en tête
 * (« 9 000 x Ardoises 30×22 »). Les lignes sans quantité (en-têtes, totaux sans article) sont ignorées ; un prix
 * (« … 12,50 € ») n'est jamais une quantité.
 */
export function parseOrderText(text: string): OrderedLine[] {
  const out: OrderedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .replace(/\s+/g, " ")
      .replace(/\s*[-–]?\s*\d[\d\s,.]*\s*(?:€|eur|euros?)(?:\s*(?:ht|ttc))?\s*/gi, " ")
      .trim();
    if (!line || HEADER.test(line) || /^(total|sous-total|tva|net a payer|net à payer|montant)\b/i.test(line)) continue;
    const end = TRAILING.exec(line);
    if (end && end.index > 0) {
      const designation = line.slice(0, end.index).replace(/[\s:;\-–]+$/, "").trim();
      if (/[a-z]/i.test(designation)) {
        out.push({ designation, quantity: end[1]!.trim(), unit: end[2]?.trim() ?? null });
        continue;
      }
    }
    const start = LEADING.exec(line);
    if (start && /[a-z]/i.test(start[3]!)) out.push({ designation: start[3]!.trim(), quantity: start[1]!.trim(), unit: start[2]?.trim() ?? null });
  }
  return out;
}

const STOP = new Set(["de", "des", "du", "la", "le", "les", "et", "en", "pour", "avec", "sur", "a", "au", "aux", "d", "l", "un", "une"]);
const words = (s: string) =>
  new Set(
    normalizeText(s)
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 2 && !STOP.has(w))
      .map((w) => w.replace(/(?<=..)(s|x)$/, "")),
  );
/** Part des mots de la plus courte désignation retrouvés dans l'autre (0 à 1). */
function likeness(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  const [small, big] = wa.size <= wb.size ? [wa, wb] : [wb, wa];
  let common = 0;
  for (const w of small) if (big.has(w)) common++;
  return common / small.size;
}
/** Seuil de ressemblance : au moins la moitié des mots de la désignation la plus courte. */
const SAME_ARTICLE = 0.5;

/**
 * Les écarts entre la liste envoyée et le bon de commande : chaque ligne envoyée est retrouvée (par son rang quand la
 * lecture l'a dit, sinon par ses mots), puis comparée ; une ligne envoyée absente du bon est « retirée », une ligne du
 * bon sans ligne envoyée est « ajoutée ». Une quantité égale à moins de 0,5 % près est la même.
 */
export function orderGaps(sent: readonly SentLine[], ordered: readonly OrderedLine[]): OrderGap[] {
  const taken = new Set<number>();
  const matchOf = new Map<number, number>();
  // 1. Les rangs dits par la lecture.
  ordered.forEach((o, j) => {
    const i = o.requestIndex;
    if (i !== null && i !== undefined && i >= 0 && i < sent.length && !matchOf.has(i)) {
      matchOf.set(i, j);
      taken.add(j);
    }
  });
  // 2. Les mots, la meilleure ressemblance d'abord.
  const pairs: { i: number; j: number; score: number }[] = [];
  sent.forEach((s, i) => {
    if (matchOf.has(i)) return;
    ordered.forEach((o, j) => {
      if (taken.has(j)) return;
      const score = likeness(s.designation, o.designation);
      if (score >= SAME_ARTICLE) pairs.push({ i, j, score });
    });
  });
  for (const p of pairs.sort((a, b) => b.score - a.score)) {
    if (matchOf.has(p.i) || taken.has(p.j)) continue;
    matchOf.set(p.i, p.j);
    taken.add(p.j);
  }
  const gaps: OrderGap[] = sent.map((s, i) => {
    const j = matchOf.get(i);
    if (j === undefined) return { kind: "removed", index: i, designation: s.designation, sent: s.quantity, ordered: null, unit: s.unit, gapPercent: -100 };
    const o = ordered[j]!;
    const a = quantityNumber(s.quantity);
    const b = quantityNumber(o.quantity);
    const gapPercent = a && b !== null ? Math.round(((b - a) / a) * 1000) / 10 : null;
    const same = a !== null && b !== null && Math.abs(b - a) <= Math.abs(a) * 0.005;
    return { kind: same ? "same" : "changed", index: i, designation: s.designation, sent: s.quantity, ordered: o.quantity, unit: s.unit ?? o.unit, gapPercent: same ? 0 : gapPercent };
  });
  ordered.forEach((o, j) => {
    if (!taken.has(j)) gaps.push({ kind: "added", index: null, designation: o.designation, sent: null, ordered: o.quantity, unit: o.unit, gapPercent: null });
  });
  return gaps;
}

/** §47.5 : « une correction venue d'une commande réelle vaut trois confirmations d'écran ». */
export const ORDER_WEIGHT = 3;
