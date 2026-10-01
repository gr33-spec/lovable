import { computeAiCost, type PriceTable } from "../ai-cost/pricing.js";
import type { PageRoute } from "./page-analysis.js";

/**
 * Estimation du coût d'extraction d'un document **avant** tout appel IA.
 *
 * Sert à deux choses : mesurer sur de vrais devis le volume réellement
 * envoyé (pages en texte, en image, écartées) sans rien dépenser, et
 * refuser proprement un document dont le coût dépasserait un plafond.
 * Ce n'est pas le coût réel : celui-ci est enregistré appel par appel
 * (AIExecution) à partir de la consommation renvoyée par le fournisseur.
 *
 * Les estimations sont volontairement **hautes** (on préfère surestimer).
 */
export interface ExtractionPolicy {
  /** Modèle pour les pages en texte. */
  textModel: string;
  /** Modèle pour les pages en image (scans, photos). */
  visionModel: string;
  /** Consignes + schéma, envoyés à chaque appel. */
  promptTokens: number;
  /** Sortie estimée d'une page lue en image (une page de devis bien remplie). */
  visionOutputTokensPerPage: number;
  /** Sortie fixe par ligne de texte (noms de champ, référence, valeurs vides), en plus de son contenu. */
  outputTokensPerTextLine: number;
  /** Réflexion interne facturée en sortie, par appel. */
  reasoningTokensPerCall: number;
  /** Bord long du rendu des pages envoyées en image, en pixels. */
  visionLongEdgePx: number;
  /**
   * Sortie visible estimée qu'un seul appel peut produire sans risque : la
   * limite de réponse (16 000 tokens) moins une large marge pour la
   * réflexion et l'erreur d'estimation. Au-delà, le devis est lu en blocs.
   */
  outputBudgetPerCall: number;
  /** Plafond d'appels pour une analyse, relectures comprises. */
  maxCallsPerAnalysis: number;
}

/**
 * Politique par défaut (audit coûts IA, 2026-09-30) : Sonnet 5.5 pour tout
 * tant que l'évaluation sur de vrais devis n'a pas prouvé qu'un modèle
 * moins cher fait aussi bien (PD-026 : la précision d'abord). Découpage
 * des gros devis : audit du 2026-10-01 (PD-046).
 */
export const DEFAULT_EXTRACTION_POLICY: ExtractionPolicy = {
  textModel: "claude-sonnet-5-5",
  visionModel: "claude-sonnet-5-5",
  promptTokens: 2000,
  visionOutputTokensPerPage: 1600,
  outputTokensPerTextLine: 15,
  reasoningTokensPerCall: 2000,
  visionLongEdgePx: 1568,
  outputBudgetPerCall: 9000,
  maxCallsPerAnalysis: 12,
};

/** Environ 3 caractères par token pour du français de devis (majoré). */
export function estimateTextTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / 3);
}

/**
 * Tokens d'une page rendue en image : la page est mise à l'échelle pour
 * que son bord long fasse `longEdgePx`, puis découpée en carrés de 28 px
 * (règle publiée par le fournisseur).
 */
export function estimateImageTokens(widthPt: number, heightPt: number, longEdgePx: number): number {
  if (!(widthPt > 0) || !(heightPt > 0)) throw new RangeError("Dimensions de page invalides");
  const scale = longEdgePx / Math.max(widthPt, heightPt);
  const w = Math.round(widthPt * scale);
  const h = Math.round(heightPt * scale);
  return Math.ceil(w / 28) * Math.ceil(h / 28);
}

export interface PageForEstimate {
  pageNumber?: number;
  route: PageRoute;
  /** Caractères envoyés à l'IA pour cette page (texte numéroté). */
  chars: number;
  /** Lignes numérotées de la page (texte). */
  lines?: number;
  widthPt: number;
  heightPt: number;
}

export interface CallEstimate {
  model: string;
  /** Pages dont ce bloc liste les lignes. */
  pages: number;
  /** Pages redonnées en contexte seulement. */
  contextPages: number;
  inputTokens: number;
  imageTokens: number;
  outputTokens: number;
  microUsd: number;
}

export interface DocumentCostEstimate {
  priceTableVersion: string;
  /** « single » : un appel ; « split » : le devis est lu en blocs de pages. */
  strategy: ReadingStrategy;
  pagesText: number;
  pagesVision: number;
  pagesSkipped: number;
  calls: CallEstimate[];
  totalMicroUsd: number;
}

export type ReadingStrategy = "single" | "split";

/** Un bloc de lecture : les pages dont il liste les lignes, et celles qu'il voit pour le contexte. */
export interface ReadingChunk {
  pages: number[];
  context: number[];
}

export interface ReadingPlan {
  strategy: ReadingStrategy;
  chunks: ReadingChunk[];
  estimate: DocumentCostEstimate;
}

const readable = (p: PageForEstimate) => p.route === "text" || p.route === "vision";
const numberOf = (p: PageForEstimate, i: number) => p.pageNumber ?? i + 1;

/**
 * Sortie estimée d'une page (estimation haute) : une page en texte produit au
 * plus son contenu, plus la part fixe de chaque ligne de réponse.
 */
function pageOutput(p: PageForEstimate, policy: ExtractionPolicy): number {
  if (p.route === "vision") return policy.visionOutputTokensPerPage;
  const lines = p.lines ?? Math.ceil(p.chars / 60);
  return estimateTextTokens(p.chars) + lines * policy.outputTokensPerTextLine;
}

function pageInput(p: PageForEstimate, policy: ExtractionPolicy): { text: number; image: number } {
  return p.route === "vision"
    ? { text: 0, image: estimateImageTokens(p.widthPt, p.heightPt, policy.visionLongEdgePx) }
    : { text: estimateTextTokens(p.chars), image: 0 };
}

/**
 * Contexte d'un bloc : TOUTES les pages qui le précèdent (les titres en
 * cours peuvent être écrits plusieurs pages plus haut : lot, logement,
 * marque) et la page qui le suit (ligne coupée en bas de page). Le contexte
 * ne coûte qu'en entrée, cinq fois moins cher que la sortie.
 */
function contextFor(owned: readonly number[], order: readonly PageForEstimate[]): number[] {
  const first = owned[0]!;
  const last = owned[owned.length - 1]!;
  const context = order.filter((p) => p.pageNumber! < first).map((p) => p.pageNumber!);
  const next = order.find((p) => p.pageNumber! > last);
  if (next) context.push(next.pageNumber!);
  return context;
}

function chunkFor(owned: number[], order: readonly PageForEstimate[], whole: boolean): ReadingChunk {
  return { pages: owned, context: whole ? [] : contextFor(owned, order) };
}

/** Pages lisibles, dans l'ordre, numérotées. */
function readableOrder(pages: readonly PageForEstimate[]): PageForEstimate[] {
  return pages.map((p, i) => ({ ...p, pageNumber: numberOf(p, i) })).filter(readable);
}

/**
 * Coupe une suite de pages en blocs consécutifs de tailles voisines, le
 * moins de blocs possible, chacun tenant dans le budget d'un appel. Une
 * page seule au-delà du budget forme son propre bloc.
 */
function cut(order: readonly PageForEstimate[], policy: ExtractionPolicy): number[][] {
  const sizes = order.map((p) => pageOutput(p, policy));
  const total = sizes.reduce((s, x) => s + x, 0);
  for (let n = Math.max(1, Math.ceil(total / policy.outputBudgetPerCall)); ; n++) {
    const target = total / n;
    const blocks: { pages: number[]; size: number }[] = [];
    let current = { pages: [] as number[], size: 0 };
    order.forEach((p, i) => {
      const out = sizes[i]!;
      // Fermer le bloc quand la page suivante l'éloignerait plus de la taille visée qu'elle ne l'en rapproche.
      if (current.pages.length > 0 && blocks.length < n - 1 && Math.abs(current.size + out - target) > Math.abs(current.size - target)) {
        blocks.push(current);
        current = { pages: [], size: 0 };
      }
      current.pages.push(p.pageNumber!);
      current.size += out;
    });
    blocks.push(current);
    if (blocks.every((b) => b.size <= policy.outputBudgetPerCall || b.pages.length === 1) || n >= order.length) return blocks.map((b) => b.pages);
  }
}

function estimateChunk(chunk: ReadingChunk, byNumber: ReadonlyMap<number, PageForEstimate>, policy: ExtractionPolicy, table: PriceTable): CallEstimate {
  let text = 0;
  let image = 0;
  for (const n of [...chunk.pages, ...chunk.context]) {
    const input = pageInput(byNumber.get(n)!, policy);
    text += input.text;
    image += input.image;
  }
  const inputTokens = policy.promptTokens + text;
  const outputTokens = chunk.pages.reduce((s, n) => s + pageOutput(byNumber.get(n)!, policy), 0) + policy.reasoningTokensPerCall;
  const model = image > 0 ? policy.visionModel : policy.textModel;
  return {
    model,
    pages: chunk.pages.length,
    contextPages: chunk.context.length,
    inputTokens,
    imageTokens: image,
    outputTokens,
    microUsd: computeAiCost(model, { inputTokens: inputTokens + image, outputTokens }, table).totalMicroUsd,
  };
}

/**
 * PLAN DE LECTURE d'un devis, décidé avant tout appel et sans IA :
 * un seul appel quand la réponse attendue tient sans risque dans la limite
 * (cas normal) ; sinon des blocs de pages consécutives, chacun avec le
 * contexte nécessaire, dont les lignes sont ensuite réunies par le code.
 */
export function planReading(pages: readonly PageForEstimate[], policy: ExtractionPolicy, table: PriceTable): ReadingPlan {
  const order = readableOrder(pages);
  const byNumber = new Map(order.map((p) => [p.pageNumber!, p]));
  const total = order.reduce((s, p) => s + pageOutput(p, policy), 0);
  const single = total <= policy.outputBudgetPerCall;
  const chunks = order.length === 0 ? [] : single ? [chunkFor(order.map((p) => p.pageNumber!), order, true)] : cut(order, policy).map((b) => chunkFor(b, order, false));
  const calls = chunks.map((c) => estimateChunk(c, byNumber, policy, table));
  const strategy: ReadingStrategy = chunks.length > 1 ? "split" : "single";
  return {
    strategy,
    chunks,
    estimate: {
      priceTableVersion: table.version,
      strategy,
      pagesText: pages.filter((p) => p.route === "text").length,
      pagesVision: pages.filter((p) => p.route === "vision").length,
      pagesSkipped: pages.filter((p) => !readable(p)).length,
      calls,
      totalMicroUsd: calls.reduce((s, c) => s + c.microUsd, 0),
    },
  };
}

/**
 * Relecture d'un bloc dont la réponse a été coupée : jamais le même appel,
 * mais deux moitiés (pages consécutives), chacune avec son contexte. Une
 * page seule ne se coupe plus : `null`.
 */
export function splitChunk(chunk: ReadingChunk, pages: readonly PageForEstimate[], policy: ExtractionPolicy): [ReadingChunk, ReadingChunk] | null {
  if (chunk.pages.length < 2) return null;
  const order = readableOrder(pages);
  const byNumber = new Map(order.map((p) => [p.pageNumber!, p]));
  const sizes = chunk.pages.map((n) => pageOutput(byNumber.get(n)!, policy));
  const half = sizes.reduce((s, x) => s + x, 0) / 2;
  let at = 1;
  for (let acc = sizes[0]!; at < chunk.pages.length - 1 && acc + sizes[at]! <= half; at++) acc += sizes[at]!;
  return [chunkFor(chunk.pages.slice(0, at), order, false), chunkFor(chunk.pages.slice(at), order, false)];
}

/** Une ligne lue, telle que le code la rattache à sa page. */
export interface SourcedLine {
  sourceRefs: readonly string[];
  sourcePages: readonly number[];
}

/** Page où commence une ligne : sa première référence « page:ligne », sinon sa première page image. */
export function linePage(line: SourcedLine): number | null {
  const ref = line.sourceRefs[0];
  if (ref !== undefined) {
    const page = Number.parseInt(ref.split(":")[0]!, 10);
    if (Number.isFinite(page)) return page;
  }
  return line.sourcePages[0] ?? null;
}

/**
 * RÉUNION DÉTERMINISTE des blocs : chaque ligne appartient au bloc de la
 * page où elle commence (une ligne lue dans le contexte d'un autre bloc est
 * écartée), une ligne qui reprend une référence déjà retenue par un autre
 * bloc est un doublon de frontière, l'ordre est celui des pages.
 */
export function mergeChunkLines<T extends SourcedLine>(parts: readonly { chunk: ReadingChunk; lines: readonly T[] }[]): { lines: T[]; dropped: number } {
  const ordered = [...parts].sort((a, b) => a.chunk.pages[0]! - b.chunk.pages[0]!);
  const taken = new Map<string, number>();
  const lines: T[] = [];
  let dropped = 0;
  ordered.forEach((part, index) => {
    const owned = new Set(part.chunk.pages);
    for (const line of part.lines) {
      const page = linePage(line);
      const foreign = page !== null && !owned.has(page);
      const duplicate = line.sourceRefs.some((r) => taken.has(r) && taken.get(r) !== index);
      if (foreign || duplicate) {
        dropped++;
        continue;
      }
      for (const r of line.sourceRefs) taken.set(r, index);
      lines.push(line);
    }
  });
  return { lines, dropped };
}

/** Estimation du coût d'un document avant tout appel : celle du plan de lecture. */
export function estimateDocumentCost(pages: readonly PageForEstimate[], policy: ExtractionPolicy, table: PriceTable): DocumentCostEstimate {
  return planReading(pages, policy, table).estimate;
}
