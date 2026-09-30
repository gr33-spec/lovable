import { parseUnit } from "../quantity/unit.js";
import { containsKeyword, normalizeText, type TradeProfile } from "../trades/trade-profile.js";

/**
 * Routage déterministe page par page (sans IA) : quelle page peut être lue
 * à partir de son texte, laquelle doit être vue en image, laquelle ne
 * contient rien d'utile.
 *
 * Règle de précision (PD-026) : dans le doute, on choisit la voie la plus
 * sûre. Une page n'est **écartée** que si elle est clairement sans intérêt ;
 * une page au texte douteux part en **image**, jamais en texte approximatif.
 */
export type PageRoute = "text" | "vision" | "skip";

export type PageRouteReason =
  | "clean_text"
  | "no_text_layer"
  | "too_little_text"
  | "garbled_text"
  | "no_commercial_content"
  | "boilerplate";

export interface PageInput {
  /** Numéro de page, à partir de 1. */
  pageNumber: number;
  /** Lignes de texte reconstituées dans l'ordre de lecture. */
  lines: readonly string[];
  /** Taille de la page en points PDF (pour estimer le coût d'une image). */
  widthPt: number;
  heightPt: number;
}

export interface PageMetrics {
  /** Caractères non blancs. */
  chars: number;
  /** Part des caractères lisibles (lettres, chiffres, ponctuation usuelle). */
  readableRatio: number;
  /** Montants au format commercial (« 1 234,56 », « 12,50 € »). */
  amounts: number;
  /** Mots reconnus comme unités (m², ml, u, botte…). */
  units: number;
  /** Mots du vocabulaire matériaux du métier. */
  materialHits: number;
  /** Marqueurs de conditions générales / mentions légales. */
  boilerplateHits: number;
}

export interface PageRouting {
  pageNumber: number;
  route: PageRoute;
  reason: PageRouteReason;
  metrics: PageMetrics;
}

export const PAGE_ROUTING_RULES = {
  /** En dessous : pas assez de texte pour être sûr (souvent un scan avec un en-tête). */
  minChars: 200,
  /** En dessous : texte « cassé » (polices mal encodées, OCR douteux intégré). */
  minReadableRatio: 0.9,
  /** Marqueurs nécessaires pour écarter une page de conditions générales. */
  minBoilerplateHits: 2,
} as const;

const AMOUNT = /\d{1,3}(?:[  .]\d{3})*,\d{2}(?!\d)|\d+[.,]\d{2}\s?(?:€|eur\b)/gi;
// Lisible : lettres (y compris accentuées), chiffres, ponctuation et symboles courants.
const READABLE = /[\p{L}\p{N}.,;:!?'"’()[\]/%€$&+\-*=°²³@#_<>«»–—…]/u;

export function pageMetrics(lines: readonly string[], profile: TradeProfile): PageMetrics {
  const raw = lines.join("\n");
  const visible = [...raw].filter((c) => !/\s/.test(c));
  const readable = visible.filter((c) => READABLE.test(c)).length;
  const normalized = normalizeText(raw);

  const words = normalized.split(/[\s|;]+/);
  let units = 0;
  for (const w of words) {
    // Unités isolées seulement (« m2 », « ml », « u ») : évite de compter les mots ordinaires.
    if (w.length <= 7 && /^[a-z0-9²³.]+$/.test(w) && !/^\d+([.,]\d+)?$/.test(w) && parseUnit(w)) units++;
  }

  return {
    chars: visible.length,
    readableRatio: visible.length === 0 ? 0 : readable / visible.length,
    amounts: (raw.match(AMOUNT) ?? []).length,
    units,
    materialHits: profile.materialKeywords.filter((k) => containsKeyword(normalized, k)).length,
    boilerplateHits: profile.boilerplateMarkers.filter((k) => containsKeyword(normalized, k)).length,
  };
}

export function routePage(page: PageInput, profile: TradeProfile): PageRouting {
  const m = pageMetrics(page.lines, profile);
  const r = PAGE_ROUTING_RULES;
  const at = (route: PageRoute, reason: PageRouteReason): PageRouting => ({
    pageNumber: page.pageNumber,
    route,
    reason,
    metrics: m,
  });

  if (m.chars === 0) return at("vision", "no_text_layer");
  if (m.readableRatio < r.minReadableRatio) return at("vision", "garbled_text");

  const commercial = m.amounts > 0 || m.units > 0;
  // Écarter uniquement ce qui est à coup sûr sans ligne de matériaux.
  if (!commercial && m.boilerplateHits >= r.minBoilerplateHits) return at("skip", "boilerplate");
  // Peu de texte sans montant ni unité : probablement un scan avec un simple
  // en-tête en texte. On regarde l'image. (Une courte page de totaux, elle,
  // a des montants et reste en texte.)
  if (m.chars < r.minChars && !commercial) return at("vision", "too_little_text");
  if (!commercial && m.materialHits === 0) return at("skip", "no_commercial_content");
  return at("text", "clean_text");
}

export interface NumberedLine {
  /** Identifiant stable « page:ligne », ex. « 2:014 ». Cité par l'IA à la place du texte. */
  ref: string;
  pageNumber: number;
  lineNumber: number;
  text: string;
}

/**
 * Numérote les lignes : l'IA citera « 2:014 » au lieu de recopier le texte
 * source (sortie plus courte, donc moins chère) ; la preuve est retrouvée
 * ici, par le code, à l'identique.
 */
export function numberLines(page: PageInput): NumberedLine[] {
  const out: NumberedLine[] = [];
  let n = 0;
  for (const text of page.lines) {
    const t = text.trim();
    if (t.length === 0) continue;
    n++;
    out.push({ ref: `${page.pageNumber}:${String(n).padStart(3, "0")}`, pageNumber: page.pageNumber, lineNumber: n, text: t });
  }
  return out;
}
