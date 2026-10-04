import {
  applyLineRoles,
  applyPurchaseOverrides,
  artisanView,
  assessTakeoffLine,
  climateZone,
  isCoastal,
  factsFromReading,
  readSiteNotes,
  readExclusions,
  exclusionFor,
  type Referential,
  computeWithAnswers,
  postalCodeIn,
  purchaseView,
  DEFAULT_EXTRACTION_POLICY,
  mergeChunkLines,
  planQuote,
  scanBoundaryRisks,
  planReading,
  proposeLineRoles,
  priceTableAt,
  splitChunk,
  reviewExtractedTakeoff,
  ROOFING_REFERENTIAL,
  REFERENTIALS,
  referentialFor,
  slotsGivenByQuote,
  tradeProfile,
  type ArtisanView,
  type EngineAnswer,
  type PurchaseView,
  type SiteFact,
  type CorrectionAction,
  type ExtractionPolicy,
  type LineRole,
  type RoleProposal,
  type ReadingChunk,
  type LineSnapshot,
  type LineValidation,
  type TakeoffIssue,
  type TakeoffValidation,
  siteBrief,
  communeOf,
  METIER_NAMES,
  MAX_SUGGESTIONS,
  tradeIdOf,
  type SiteBrief,
} from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";
import type { DocumentAiInput, DocumentRepository, DocumentWithProcessing, PreparedDocument } from "../../documents/index.js";
import type { CompanyMemory, CorrectionJournal } from "../../learning/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { TAKEOFF_PROMPT } from "./prompt.js";
import type { ExtractionAttempt, ExtractionOutput, TakeoffExtractor } from "./takeoff-extractor.js";
import type { LineFields, TakeoffLineRecord, TakeoffRecord, TakeoffRepository } from "./takeoff.repository.js";

/**
 * Lecture d'un devis par l'IA (PD-046) :
 * - un seul appel pour un devis normal ; un très gros devis est lu en blocs
 *   de pages, décidés avant tout appel par le plan de lecture ;
 * - une réponse coupée (trop longue) n'est JAMAIS redemandée à l'identique :
 *   le bloc est relu en deux moitiés ; une page seule trop dense échoue ;
 * - une réponse illisible ou une panne passagère : une seule relance ;
 * - un document dont le coût estimé est anormal pour un devis est refusé
 *   avant tout appel, et le nombre d'appels est plafonné.
 */
export interface ReadingOptions {
  /** Compte autorisé à voir les calculs des règles en brouillon (marqués « provisoire »), pour les valider. */
  isValidator?: (tenant: TenantContext) => Promise<boolean>;
  /** Adresse du chantier (code postal → zone climatique), sans rien demander à l'artisan. */
  projectAddress?: (tenant: TenantContext, projectId: string) => Promise<string | null>;
  /** Infos chantier facultatives : la note de l'artisan (texte libre, commentaires de croquis), lue à chaque calcul. */
  projectNotes?: (tenant: TenantContext, projectId: string) => Promise<string | null>;
  /**
   * Version figée par chantier (plan v3 §3) : le référentiel est enregistré à sa version quand le quantitatif naît,
   * et chaque recalcul relit CETTE version. Sans ce port, le référentiel du jour sert (tests unitaires).
   */
  referentials?: { ensure(ref: Referential): Promise<void>; load(version: string): Promise<Referential | null> };
  /** Mesures de chaque lecture (journal du serveur), en plus de leur enregistrement avec l'analyse. */
  onStats?: (stats: ReadingStats) => void;
  policy?: ExtractionPolicy;
  /** Coût estimé au-delà duquel un document n'est pas un devis normal (micro-dollars). */
  maxAnalysisMicroUsd?: number;
  now?: () => Date;
  /**
   * Lecture longue (gros devis scanné) : au-delà de ce délai, la réponse part (« lecture en cours »)
   * et la lecture continue en arrière-plan ; l'écran suit son état. Audit de lancement, B3.
   */
  answerWithinMs?: number;
  /** Lecture échouée (IA en panne, réponse inutilisable, erreur imprévue) : prévenir l'équipe (B5). */
  onReadingFailed?: (reason: string) => void;
  /** Garde la lecture en vie après la réponse (Vercel : waitUntil). Par défaut : elle continue seule. */
  keepAlive?: (work: Promise<unknown>) => void;
  /** §45.8 : la mémoire des consommables de l'entreprise (« On ajoute ? »). */
  consumables?: ConsumableHabits;
}

/**
 * §45.8 : ce que l'entreprise a fait des suggestions. Refusée trois chantiers d'affilée : plus proposée ; une ligne
 * ajoutée à la main sur deux chantiers différents devient une suggestion.
 */
export interface ConsumableHabits {
  hidden(tenant: TenantContext): Promise<Set<string>>;
  manual(tenant: TenantContext): Promise<{ key: string; designation: string; quantity: string | null; unit: string | null }[]>;
  answered(tenant: TenantContext, entry: { key: string; designation: string; accepted: boolean; projectId: string }): Promise<void>;
  addedByHand(tenant: TenantContext, entry: { designation: string; quantity: string | null; unit: string | null; projectId: string }): Promise<void>;
}

/** Clé d'une ligne ajoutée à la main (« Bâche de protection 4 × 5 m » → « manual:bache de protection 4 x 5 m »). */
export const manualKey = (designation: string) =>
  `manual:${designation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/×/g, "x").replace(/\s+/g, " ").trim()}`;

/** Une lecture « en cours » depuis plus longtemps a été interrompue (fonction coupée) : elle compte comme échouée. */
export const STALE_READING_MS = 6 * 60 * 1000;

/** Où en est la lecture du devis client d'un chantier, tant que la liste n'existe pas. */
export interface ReadingState {
  status: "reading" | "failed";
  /** Raison de l'échec (« interrupted », « abnormal_size »…), ou null. */
  reason: string | null;
}

export type StartResult = { state: "ready"; result: ReviewedTakeoff } | { state: "reading" };

/** Plafond par défaut (≈ 2,8 €) : environ 5 fois un devis de 500 lignes scanné (≈ 0,6 €). */
export const DEFAULT_MAX_ANALYSIS_MICRO_USD = 3_000_000;

/**
 * MESURES D'UNE LECTURE (télémétrie, PD-046), enregistrées avec l'analyse :
 * de quoi vérifier sur de vrais devis que le découpage ne perd ni ne double
 * rien, et ce que coûte réellement une lecture. Sans effet sur le résultat.
 */
export interface ReadingStats {
  version: 1;
  outcome: "completed" | "failed";
  failure?: string;
  strategy: "single" | "split";
  /** « text » : PDF texte ; « scan » : pages en image (scan, photos) ; « mixed » : les deux. */
  document: "text" | "scan" | "mixed";
  pages: { text: number; scan: number };
  plannedBlocks: number;
  calls: number;
  /** Issue de chaque appel : success, truncated (réponse coupée), timeout, invalid_output, provider_error, refused. */
  callOutcomes: Record<string, number>;
  /** Blocs relus en deux moitiés après une réponse coupée. */
  splits: number;
  linesBeforeMerge: number;
  linesAfterMerge: number;
  droppedOutsideBlock: number;
  droppedDuplicates: number;
  /** Frontières entre blocs scannés où une ligne coupée a pu être relue (constat seulement). */
  scanBoundaryRisks: { pages: [number, number]; signals: string[] }[];
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  costMicroUsd: number;
  estimatedMicroUsd: number;
  durationMs: number;
}

interface CallTally {
  calls: number;
  outcomes: Record<string, number>;
  splits: number;
  tokens: ReadingStats["tokens"];
  costMicroUsd: number;
}

type ChunkParts = { chunk: ReadingChunk; output: ExtractionOutput }[];
type ChunkFailure = { ok: false; reason: string };
type ChunkResult = { ok: true; parts: ChunkParts } | ChunkFailure;

/** Une réponse coupée ou trop longue à venir : la même demande échouerait pareil. */
const tooLong = (a: ExtractionAttempt) => a.status === "timeout" || (a.status === "invalid_output" && a.errorCode === "max_tokens");
/** Échec imprévisible (réponse mal formée, panne passagère) : une relance a un sens. */
const transient = (a: ExtractionAttempt) =>
  (a.status === "invalid_output" && a.errorCode !== "max_tokens") ||
  (a.status === "provider_error" && (a.errorCode === "http_429" || !/^http_4\d\d$/.test(a.errorCode ?? "")));

export interface ReviewedTakeoff {
  takeoff: TakeoffRecord;
  validation: TakeoffValidation;
  /** Rôle de la quantité de chaque ligne, avec sa raison. */
  roles: ReadonlyMap<string, RoleProposal>;
  /** Ce que voit l'artisan : compteurs ✓/⚠/?, décisions regroupées, éléments prêts et leur preuve. */
  view: ArtisanView;
  /** LA LISTE D'ACHATS : à acheter, à faire chiffrer, hypothèses, questions. */
  purchase: PurchaseView;
  /**
   * Lignes exclues par une phrase de la note (§44.2, « garage non compris ») : hors du calcul et du « À commander »,
   * gardées dans le détail sans prix avec la mention « exclu par l'artisan ». Ligne → phrase citée.
   */
  excluded: ReadonlyMap<string, string>;
  /**
   * Deux sources qui se contredisent (§44.3 : devis et document) et dont la question est encore ouverte : rien ne
   * part au fournisseur tant qu'elle l'est (clés des données : « pente »…).
   */
  openContradictions: readonly string[];
  /** Le chantier en bref (§45.3) : les faits confirmés seulement, jamais une hypothèse de l'app. */
  brief: SiteBrief;
}


type Prepared = PreparedDocument;

/**
 * Quantitatif du devis client : proposé par l'IA, relu par le code, corrigé
 * et validé par l'artisan. Rien n'est commandé ni envoyé à partir d'une
 * liste non validée.
 */
export class TakeoffService {
  constructor(
    private readonly takeoffs: TakeoffRepository,
    private readonly documents: DocumentRepository,
    private readonly extractor: TakeoffExtractor | null,
    private readonly meter: AnalysisMeter,
    private readonly recorder: AiUsageRecorder,
    private readonly aiInput: DocumentAiInput,
    private readonly journal: CorrectionJournal,
    private readonly memory: CompanyMemory,
    private readonly onRecordFailure: (error: unknown) => void = () => {},
    private readonly reading: ReadingOptions = {},
  ) {}

  get aiAvailable(): boolean {
    return this.extractor !== null;
  }

  /**
   * Lance la lecture et répond vite : la liste si elle est prête dans le délai, sinon « lecture en
   * cours » (la lecture continue, l'écran interroge `readingState`). Une lecture déjà en cours n'est
   * jamais relancée (double appui, rechargement) : rien n'est payé deux fois.
   */
  async start(tenant: TenantContext, documentId: string): Promise<StartResult> {
    assertCanWrite(tenant);
    const running = await this.meter.current(tenant.companyId, documentId);
    if (running?.status === "started" && !this.stale(running.startedAt)) return { state: "reading" };
    const work = this.extract(tenant, documentId);
    const wait = this.reading.answerWithinMs ?? 8000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"later">((resolve) => {
      timer = setTimeout(() => resolve("later"), wait);
    });
    try {
      const first = await Promise.race([work.then((result) => ({ result })), timeout]);
      if (first !== "later") return { state: "ready", result: first.result };
    } finally {
      clearTimeout(timer);
    }
    // Trop long pour une réponse : la lecture continue ; son échec éventuel est enregistré avec l'analyse.
    const background = work.catch((error: unknown) => this.onRecordFailure(error));
    (this.reading.keepAlive ?? (() => {}))(background);
    return { state: "reading" };
  }

  /** La lecture du devis client du chantier : en cours, échouée, ou rien (pas commencée, ou liste prête). */
  async readingState(tenant: TenantContext, projectId: string): Promise<ReadingState | null> {
    const quote = (await this.documents.listByProject(tenant, projectId)).find((d) => d.purpose === "client_quote");
    return quote ? this.readingStateOf(tenant, quote.id) : null;
  }

  /** La lecture d'un devis précis (porte /v1/quantitatifs) : en cours, échouée, ou rien. */
  async readingStateOf(tenant: TenantContext, documentId: string): Promise<ReadingState | null> {
    const analysis = await this.meter.current(tenant.companyId, documentId);
    if (!analysis || analysis.status === "completed") return null;
    if (analysis.status === "started") return this.stale(analysis.startedAt) ? { status: "failed", reason: "interrupted" } : { status: "reading", reason: null };
    return { status: "failed", reason: "analysis_failed" };
  }

  private stale(startedAt: Date): boolean {
    return (this.reading.now ?? (() => new Date()))().getTime() - startedAt.getTime() > STALE_READING_MS;
  }

  async extract(tenant: TenantContext, documentId: string): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    const doc = await this.documents.findById(tenant, documentId);
    if (!doc) throw notFound("Document");
    if (doc.purpose !== "client_quote") throw validationFailed("Only a client quote gives a materials list");

    const existing = await this.takeoffs.findByDocument(tenant, documentId);
    if (existing) return this.review(tenant, existing);
    if (!this.extractor) throw new DomainError("ai_unavailable", "AI reading is not configured");

    const prepared = await this.aiInput.prepare(tenant, doc);
    const policy = this.reading.policy ?? DEFAULT_EXTRACTION_POLICY;
    const plan = planReading(prepared.pages, policy, priceTableAt((this.reading.now ?? (() => new Date()))()));
    // Garde-fou : un document au coût anormal pour un devis n'est pas envoyé (rien n'est dépensé ni décompté).
    if (plan.estimate.totalMicroUsd > (this.reading.maxAnalysisMicroUsd ?? DEFAULT_MAX_ANALYSIS_MICRO_USD)) {
      throw new DomainError("unreadable_document", "Estimated reading cost is abnormal for a quote", { reason: "abnormal_size" });
    }
    const begin = await this.meter.begin({
      companyId: tenant.companyId,
      userId: tenant.userId,
      projectId: doc.projectId,
      documentId,
      kind: "client_quote",
    });
    if (begin.status === "already_done") throw new DomainError("conflict", "Analysis already completed for this document");
    const analysisId = begin.analysis.id;
    try {
      return await this.readAndSave(tenant, doc, prepared, plan, policy, analysisId);
    } catch (error) {
      const known = error instanceof DomainError && error.code === "analysis_failed";
      if (!known) await this.meter.fail(analysisId).catch(() => undefined);
      this.reading.onReadingFailed?.(known ? String((error.details as { reason?: string } | undefined)?.reason ?? "analysis_failed") : "unexpected_error");
      throw error;
    }
  }

  private async readAndSave(
    tenant: TenantContext,
    doc: NonNullable<Awaited<ReturnType<DocumentRepository["findById"]>>>,
    prepared: Prepared,
    plan: ReturnType<typeof planReading>,
    policy: ExtractionPolicy,
    analysisId: string,
  ): Promise<ReviewedTakeoff> {
    const documentId = doc.id;
    const started = Date.now();
    const tally: CallTally = { calls: 0, outcomes: {}, splits: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, costMicroUsd: 0 };
    const read = await this.readPlan(tenant, doc, prepared, analysisId, plan.chunks, policy, tally);
    const pages = {
      text: prepared.pages.filter((p) => p.route === "text").length,
      scan: prepared.pages.filter((p) => p.route === "vision").length,
    };
    const stats = (extra: Pick<ReadingStats, "outcome" | "linesBeforeMerge" | "linesAfterMerge" | "droppedOutsideBlock" | "droppedDuplicates" | "scanBoundaryRisks"> & { failure?: string }): ReadingStats => ({
      version: 1,
      ...extra,
      strategy: plan.strategy,
      document: pages.text > 0 && pages.scan > 0 ? "mixed" : pages.scan > 0 ? "scan" : "text",
      pages,
      plannedBlocks: plan.chunks.length,
      calls: tally.calls,
      callOutcomes: tally.outcomes,
      splits: tally.splits,
      tokens: tally.tokens,
      costMicroUsd: tally.costMicroUsd,
      estimatedMicroUsd: plan.estimate.totalMicroUsd,
      durationMs: Date.now() - started,
    });
    if (read.ok === false) {
      await this.saveStats(analysisId, stats({ outcome: "failed", failure: read.reason, linesBeforeMerge: 0, linesAfterMerge: 0, droppedOutsideBlock: 0, droppedDuplicates: 0, scanBoundaryRisks: [] }));
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "The AI could not read this quote", { reason: read.reason });
    }
    const blocks = read.parts.map((p) => ({ chunk: p.chunk, lines: p.output.lines }));
    const whole = read.parts.length === 1 && read.parts[0]!.chunk.context.length === 0;
    const merged = whole ? { lines: read.parts[0]!.output.lines, droppedOutsideBlock: 0, droppedDuplicates: 0 } : mergeChunkLines(blocks);
    const output: ExtractionOutput = whole ? read.parts[0]!.output : { lines: merged.lines, notes: [...new Set(read.parts.flatMap((p) => p.output.notes))] };
    await this.saveStats(
      analysisId,
      stats({
        outcome: "completed",
        linesBeforeMerge: blocks.reduce((n, b) => n + b.lines.length, 0),
        linesAfterMerge: output.lines.length,
        droppedOutsideBlock: merged.droppedOutsideBlock,
        droppedDuplicates: merged.droppedDuplicates,
        scanBoundaryRisks: whole ? [] : scanBoundaryRisks(blocks, new Set(prepared.pages.filter((p) => p.route === "vision").map((p) => p.pageNumber!))),
      }),
    );
    const success = { model: read.model, output };

    // Le référentiel du métier du devis (§22 : un métier = un tiroir), figé avec le quantitatif.
    const ref = referentialFor(doc.trade);
    if (ref) await this.reading.referentials?.ensure(ref);
    const takeoff = await this.takeoffs.create(tenant, {
      projectId: doc.projectId,
      documentId,
      analysisId,
      referentialVersion: ref?.version ?? null,
      trade: doc.trade,
      promptId: TAKEOFF_PROMPT.id,
      promptVersion: TAKEOFF_PROMPT.version,
      model: success.model,
      notes: success.output.notes,
      context: success.output.context ?? null,
      lines: success.output.lines.map((l) => ({
        designation: l.designation.trim(),
        quantityRaw: l.quantity?.trim() || null,
        unitRaw: l.unit?.trim() || null,
        reference: l.reference?.trim() || null,
        material: l.material ?? null,
        dimensions: l.dimensions ?? null,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section.map((t) => t.trim()).filter((t) => t.length > 0),
        aiDoubt: l.doubt?.trim() || null,
      })),
    });
    await this.meter.complete(analysisId);
    return this.review(tenant, takeoff);
  }

  /**
   * Quantitatif à partir de lignes envoyées par un partenaire (§38) : pas de PDF, pas d'IA, rien de
   * décompté ; le même calcul que pour un devis lu. Le prix suit la ligne, il ne sert à aucun calcul.
   */
  async fromLines(
    tenant: TenantContext,
    projectId: string,
    trade: string,
    lines: readonly { designation: string; quantity: string | null; unit: string | null; price: string | null }[],
  ): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    const ref = referentialFor(trade);
    if (ref) await this.reading.referentials?.ensure(ref);
    const takeoff = await this.takeoffs.create(tenant, {
      projectId,
      documentId: null,
      source: "lignes",
      referentialVersion: ref?.version ?? null,
      analysisId: null,
      trade,
      promptId: "partenaire",
      promptVersion: 0,
      model: "aucun",
      notes: [],
      lines: lines.map((l) => ({
        designation: l.designation.trim(),
        quantityRaw: l.quantity?.trim() || null,
        unitRaw: l.unit?.trim() || null,
        reference: null,
        sourceRefs: [],
        sourcePages: [],
        section: [],
        aiDoubt: null,
        priceRaw: l.price?.trim() || null,
        origin: "partner",
      })),
    });
    return this.review(tenant, takeoff);
  }

  /** Le quantitatif d'un devis déposé, s'il est prêt. */
  async forDocument(tenant: TenantContext, documentId: string): Promise<ReviewedTakeoff | null> {
    const takeoff = await this.takeoffs.findByDocument(tenant, documentId);
    return takeoff ? this.review(tenant, takeoff) : null;
  }

  async forProject(tenant: TenantContext, projectId: string): Promise<ReviewedTakeoff | null> {
    const takeoff = await this.takeoffs.findLatestByProject(tenant, projectId);
    return takeoff ? this.review(tenant, takeoff) : null;
  }

  /** La liste d'achats d'un quantitatif (pour la demande de prix), recalculée avec les règles du jour. */
  async reviewed(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    return this.reload(tenant, takeoffId);
  }

  // Chaque geste de l'artisan est journalisé avec l'AVANT (ce que BatiClair avait compris et
  // montré) et l'APRÈS. Le journal ne touche ni la liste ni le référentiel (PD-045).

  async updateLine(tenant: TenantContext, lineId: string, fields: LineFields): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.updateLine(tenant, lineId, fields);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "edit", lineId, before, after);
    return after;
  }

  /** « C'est bon » : l'artisan a regardé la ligne douteuse et la garde telle quelle. */
  async confirmLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.confirmLine(tenant, lineId);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "confirm", lineId, before, after);
    return after;
  }

  async deleteLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.deleteLine(tenant, lineId);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "delete", lineId, before, after);
    return after;
  }

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields, options: { keepStatus?: boolean } = {}): Promise<ReviewedTakeoff> {
    // « + Ajouter une ligne » de l'aperçu (§45.9) : une ligne de l'artisan, sans doute ; la liste validée le reste.
    const takeoff = options.keepStatus ? await this.itemEditable(tenant, await this.takeoffs.findById(tenant, takeoffId)) : await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const known = new Set(takeoff.lines.map((l) => l.id));
    await this.takeoffs.addLine(tenant, takeoff.id, fields);
    const after = await this.reload(tenant, takeoff.id);
    const added = after.takeoff.lines.find((l) => !known.has(l.id));
    if (added) await this.recordGesture(tenant, "add", added.id, null, after);
    // §45.8 : une ligne ajoutée à la main sur deux chantiers devient une suggestion.
    if (added) await this.reading.consumables?.addedByHand(tenant, { designation: added.designation, quantity: added.quantityRaw, unit: added.unitRaw, projectId: takeoff.projectId });
    return after;
  }

  /** Ce que BatiClair avait compris d'une ligne, ou ce que l'artisan en a fait : texte, lecture, état ✓/⚠/?. */
  private snapshot(reviewed: ReviewedTakeoff, lineId: string): LineSnapshot | null {
    const line = reviewed.takeoff.lines.find((l) => l.id === lineId);
    const v = reviewed.validation.lines.find((x) => x.lineId === lineId);
    if (!line || !v) return null;
    const assessment = assessTakeoffLine(v, {
      documentIssues: reviewed.validation.issues,
      confirmedByArtisan: line.confirmed,
      enteredByArtisan: line.origin === "manual" || line.edited,
    });
    return {
      designation: line.designation,
      quantity: line.quantityRaw,
      unit: line.unitRaw,
      reference: line.reference,
      kind: v.kind,
      family: v.family,
      basis: v.basis,
      state: assessment?.state ?? null,
    };
  }

  private async recordGesture(
    tenant: TenantContext,
    action: CorrectionAction,
    lineId: string,
    before: ReviewedTakeoff | null,
    after: ReviewedTakeoff,
  ): Promise<void> {
    const line = (before ?? after).takeoff.lines.find((l) => l.id === lineId);
    const source = line && line.sourceRefs.length > 0 && after.takeoff.documentId ? await this.aiInput.sourceLines(tenant, after.takeoff.documentId) : new Map<string, string>();
    await this.journal.record(tenant, {
      projectId: after.takeoff.projectId,
      takeoffId: after.takeoff.id,
      takeoffLineId: lineId,
      action,
      before: before ? this.snapshot(before, lineId) : null,
      after: action === "delete" ? null : this.snapshot(after, lineId),
      documentExcerpt: (line?.sourceRefs ?? []).flatMap((ref) => (source.has(ref) ? [`[${ref}] ${source.get(ref)}`] : [])),
      context: {
        trade: after.takeoff.trade,
        section: line?.section ?? [],
        promptId: after.takeoff.promptId,
        promptVersion: after.takeoff.promptVersion,
        model: after.takeoff.model,
      },
    });
  }

  /**
   * UNE décision de l'artisan qui règle toutes les lignes visées en un geste :
   * « Oui, à la pièce » (unité « u » sur les seules lignes SANS unité, puis
   * gardées) ou « Oui, tels qu'écrits » / « C'est bon » (gardées). Chaque ligne
   * est journalisée (avant / après).
   */
  async decide(tenant: TenantContext, takeoffId: string, input: { action: "pieces" | "keep"; lineIds: string[]; pieceLineIds: string[] }): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const before = await this.review(tenant, takeoff);
    const own = new Map(takeoff.lines.map((l) => [l.id, l]));
    const lineIds = [...new Set(input.lineIds)].filter((id) => own.has(id));
    if (lineIds.length === 0) throw notFound("TakeoffLine");
    const pieces = input.action === "pieces" ? [...new Set(input.pieceLineIds)].filter((id) => lineIds.includes(id) && !own.get(id)!.unitRaw?.trim()) : [];
    for (const id of pieces) {
      const l = own.get(id)!;
      await this.takeoffs.updateLine(tenant, id, { designation: l.designation, quantityRaw: l.quantityRaw, unitRaw: "u", reference: l.reference });
    }
    for (const id of lineIds) await this.takeoffs.confirmLine(tenant, id);
    const after = await this.reload(tenant, takeoff.id);
    for (const id of pieces) await this.recordGesture(tenant, "edit", id, before, after);
    for (const id of lineIds) await this.recordGesture(tenant, "confirm", id, before, after);
    return after;
  }

  /**
   * Réponse à une question du calcul, pour CE chantier : elle sert à tous les
   * ouvrages qui en dépendent, et la question n'est plus reposée.
   */
  /**
   * §45.6 : les sept champs d'une entrée du journal (métier, département, matériau, quantité calculée, quantité corrigée,
   * règle utilisée, version du référentiel). Aucun ratio ne bouge : c'est la matière de l'export mensuel, pas une règle.
   */
  private async journalFacts(
    tenant: TenantContext,
    takeoff: TakeoffRecord,
    item: { materiau: string; calculee: string | null; corrigee: string | null; regle: string },
  ): Promise<Record<string, string | null>> {
    const address = (await this.reading.projectAddress?.(tenant, takeoff.projectId)) ?? null;
    const cp = postalCodeIn(address);
    return {
      metier: METIER_NAMES[tradeIdOf(takeoff.trade)] ?? takeoff.trade,
      departement: cp ? (cp.startsWith("97") ? cp.slice(0, 3) : cp.slice(0, 2)) : null,
      materiau: item.materiau,
      quantite_calculee: item.calculee,
      quantite_corrigee: item.corrigee,
      regle: item.regle,
      version_referentiel: takeoff.referentialVersion ?? referentialFor(takeoff.trade)?.version ?? null,
    };
  }

  async answer(tenant: TenantContext, takeoffId: string, key: string, value: EngineAnswer): Promise<ReviewedTakeoff> {
    // Une correction d'article (§41.4, §45.8, §45.9 : depuis l'aperçu avant envoi) ne lève aucun doute : la liste validée le reste.
    const itemOnly = /^(quantite|libelle|precision|retire|ajout):/.test(key);
    const takeoff = itemOnly ? await this.itemEditable(tenant, await this.takeoffs.findById(tenant, takeoffId)) : await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const previous = takeoff.answers[key];
    // §45.8 : « On ajoute ? » — Oui / Non d'un tap, mémorisé pour l'entreprise.
    if (key.startsWith("ajout:")) {
      const itemKey = key.slice("ajout:".length);
      if (value !== "oui" && value !== "non") throw validationFailed("Answer oui or non", { reason: "invalid_answer" });
      const offered = (await this.review(tenant, takeoff)).purchase.suggestions.find((s) => s.key === itemKey);
      const designation = offered?.label ?? itemKey;
      await this.reading.consumables?.answered(tenant, { key: itemKey, designation, accepted: value === "oui", projectId: takeoff.projectId });
      // Une ligne habituelle de l'entreprise (ajoutée à la main ailleurs) devient une vraie ligne de ce chantier.
      if (itemKey.startsWith("manual:") && value === "oui" && offered) {
        return this.addLine(tenant, takeoff.id, { designation: offered.label, quantityRaw: offered.order?.count ?? null, unitRaw: offered.order?.unit ?? null, reference: null }, { keepStatus: true });
      }
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
      return this.reload(tenant, takeoff.id);
    }
    // §45.6 : une correction d'un tap sur un article calculé (quantité, désignation) va au journal avec ses sept champs ;
    // la « quantité calculée » est celle du moteur, avant toute correction de l'artisan sur cet article.
    const corrected = /^(quantite|libelle|precision|retire):(.+)$/.exec(key);
    if (corrected) {
      const itemKey = corrected[2]!;
      if (corrected[1] === "retire" && value !== "oui" && value !== null) throw validationFailed("Answer oui", { reason: "invalid_answer" });
      const answers = { ...takeoff.answers };
      for (const k of ["quantite", "libelle", "precision", "retire"]) delete answers[`${k}:${itemKey}`];
      const engine = (await this.review(tenant, { ...takeoff, answers })).purchase.toBuy.find((b) => b.key === itemKey);
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
      const after = await this.reload(tenant, takeoff.id);
      const now = after.purchase.toBuy.find((b) => b.key === itemKey);
      if (engine) {
        await this.journal.record(tenant, {
          projectId: takeoff.projectId,
          takeoffId: takeoff.id,
          takeoffLineId: null,
          action: "correct",
          before: { designation: engine.label, quantity: engine.quantity, unit: engine.order?.unit ?? null, reference: null },
          after: { designation: now?.label ?? engine.label, quantity: now?.quantity ?? engine.quantity, unit: now?.order?.unit ?? null, reference: null },
          documentExcerpt: [],
          context: {
            trade: takeoff.trade,
            promptVersion: takeoff.promptVersion,
            ...(await this.journalFacts(tenant, takeoff, {
              materiau: engine.label,
              calculee: engine.quantity,
              // Retirée d'un tap (croix de l'aperçu) : corrigée à zéro.
              corrigee: now ? now.quantity : "0",
              regle: engine.needIds.join(" + ") || itemKey,
            })),
          },
        });
      }
      return after;
    }
    await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
    // Mémoire de l'entreprise : un produit choisi, ou une réponse d'habitude (« je façonne », épaisseur du zinc),
    // compte pour SON entreprise ; établie au deuxième chantier différent, elle n'est plus demandée (dite, modifiable).
    const [kind, name] = key.split(":") as [string, string];
    if (kind === "product" && typeof value === "string" && value !== "") {
      await this.memory.recordChoice(tenant, { kind: "product", key: `slot:${name}`, value, projectId: takeoff.projectId });
    }
    if (kind === "param" && value && typeof value === "object") {
      const def = REFERENTIALS.flatMap((r) => r.workItems.flatMap((w) => w.params)).find((p) => p.key === name);
      if (def?.kind === "artisan_preference") await this.memory.recordChoice(tenant, { kind: "param", key: `param:${name}`, value: value.value, projectId: takeoff.projectId });
    }
    const after = await this.reload(tenant, takeoff.id);
    const text = (v: EngineAnswer | undefined) => (v === undefined ? null : v === null ? "aucun" : typeof v === "string" ? v : `${v.value} ${v.unit}`);
    await this.journal.record(tenant, {
      projectId: takeoff.projectId,
      takeoffId: takeoff.id,
      takeoffLineId: null,
      action: "answer",
      before: previous === undefined ? null : { designation: key, quantity: null, unit: null, reference: text(previous) },
      after: { designation: key, quantity: null, unit: null, reference: text(value) },
      documentExcerpt: [],
      context: { trade: takeoff.trade, promptVersion: takeoff.promptVersion },
    });
    return after;
  }

  /**
   * L'artisan valide : seulement quand aucune ligne n'est bloquante (quantité
   * absente ou illisible) et que chaque doute a été vu (corrigé ou confirmé).
   * Rien ne part chez un fournisseur avec un doute non levé.
   */
  async validate(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const { validation, purchase, openContradictions } = await this.review(tenant, takeoff);
    // §44.3 : deux documents qui se contredisent font une question ; rien ne part au fournisseur tant qu'elle est ouverte.
    if (openContradictions.length > 0) {
      throw validationFailed("A contradiction between documents is still open", { reason: "contradiction_open", count: openContradictions.length });
    }
    if (validation.counts.blocking > 0) {
      throw validationFailed("Blocking issues remain", { reason: "blocking_issues", count: validation.counts.blocking });
    }
    if (validation.counts.toVerify > 0) {
      throw validationFailed("Lines to check remain", { reason: "lines_to_check", count: validation.counts.toVerify });
    }
    // Une question qui porte sur une ligne du devis (ambiguïté, article inconnu) attend sa réponse : rien ne part sans elle.
    // Une question du calcul restée sans réponse ne bloque pas : l'article part « à faire chiffrer ».
    if (!purchase.canValidate) {
      const open = purchase.questions.filter((q) => q.lineIds.length > 0).length + purchase.toBuy.filter((b) => b.state !== "ready").length;
      throw validationFailed("Decisions remain", { reason: "decisions_remaining", count: open });
    }
    await this.takeoffs.setStatus(tenant, takeoff.id, "validated");
    // §45.6 : chaque ligne tombée en « à préciser avec vous » est journalisée, avec la raison.
    for (const q of purchase.toQuote) {
      await this.journal.record(tenant, {
        projectId: takeoff.projectId,
        takeoffId: takeoff.id,
        takeoffLineId: q.lineIds[0] ?? null,
        action: "to_quote",
        before: { designation: q.label, quantity: q.measure || null, unit: null, reference: null },
        after: null,
        documentExcerpt: [],
        reason: q.reason,
        context: { trade: takeoff.trade, ...(await this.journalFacts(tenant, takeoff, { materiau: q.label, calculee: null, corrigee: null, regle: q.key })) },
      });
    }
    return this.reload(tenant, takeoff.id);
  }

  async reopen(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    const takeoff = await this.takeoffs.findById(tenant, takeoffId);
    if (!takeoff) throw notFound("Takeoff");
    await this.takeoffs.setStatus(tenant, takeoff.id, "draft");
    return this.reload(tenant, takeoff.id);
  }

  /**
   * Toute modification d'une liste validée la rouvre : l'artisan la valide à
   * nouveau. Les demandes de prix déjà préparées gardent leur copie figée.
   */
  /** Une correction d'article : la liste reste dans son état (validée ou non). */
  private async itemEditable(tenant: TenantContext, takeoff: TakeoffRecord | null): Promise<TakeoffRecord> {
    assertCanWrite(tenant);
    if (!takeoff) throw notFound("Takeoff");
    return takeoff;
  }

  private async editable(tenant: TenantContext, takeoff: TakeoffRecord | null): Promise<TakeoffRecord> {
    assertCanWrite(tenant);
    if (!takeoff) throw notFound("Takeoff");
    if (takeoff.status !== "draft") await this.takeoffs.setStatus(tenant, takeoff.id, "draft");
    return takeoff;
  }

  private async reload(tenant: TenantContext, id: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.takeoffs.findById(tenant, id);
    if (!takeoff) throw notFound("Takeoff");
    return this.review(tenant, takeoff);
  }

  /** Relecture déterministe, recalculée à chaque lecture (règles métier à jour). */
  private async review(tenant: TenantContext, record: TakeoffRecord): Promise<ReviewedTakeoff> {
    // §44.2 : une phrase d'exclusion de la note (« garage non compris ») retire la ligne qui la nomme du calcul.
    const notes = (await this.reading.projectNotes?.(tenant, record.projectId)) ?? null;
    const exclusions = readExclusions(notes);
    const excluded = new Map<string, string>();
    for (const l of record.lines) {
      const e = exclusionFor(l.designation, exclusions);
      if (e) excluded.set(l.id, e.phrase);
    }
    let takeoff = excluded.size > 0 ? { ...record, lines: record.lines.filter((l) => !excluded.has(l.id)) } : record;
    const profile = tradeProfile(takeoff.trade);
    const source = takeoff.documentId ? await this.aiInput.sourceLines(tenant, takeoff.documentId) : new Map<string, string>();
    const { validation: read } = reviewExtractedTakeoff(
      takeoff.lines.map((l: TakeoffLineRecord) => ({
        id: l.id,
        designation: l.designation,
        quantity: l.quantityRaw,
        unit: l.unitRaw,
        reference: l.reference,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section,
        // Une ligne de l'artisan ou d'un partenaire est sa propre source : rien à retrouver dans un document.
        enteredByArtisan: l.origin !== "ai" || l.edited,
        aiDoubt: l.aiDoubt,
        confirmedByArtisan: l.confirmed,
      })),
      source,
      profile,
    );
    // Ce que voit l'artisan : la lecture, plus le calcul des matériaux là où BatiClair sait le faire
    // (données VÉRIFIÉES seulement), avec les réponses de ce chantier et les habitudes de l'entreprise.
    const lines = takeoff.lines.map((l) => ({
      id: l.id,
      designation: l.designation,
      quantity: l.quantityRaw,
      unit: l.unitRaw,
      section: l.section,
      confirmed: l.confirmed,
      enteredByArtisan: l.origin !== "ai" || l.edited,
    }));
    // Version figée : les règles de la version enregistrée avec le quantitatif, jamais celles du jour.
    // Le tiroir du métier ; un métier sans tiroir ne calcule rien (le plan ne couvre pas son métier), jamais avec les règles du couvreur.
    const current = referentialFor(takeoff.trade) ?? ROOFING_REFERENTIAL;
    const ref = (takeoff.referentialVersion && takeoff.referentialVersion !== current.version ? await this.reading.referentials?.load(takeoff.referentialVersion) : null) ?? current;
    // La zone climatique vient du code postal du chantier (jamais demandée) ; le devis l'emporte s'il l'écrit.
    const address = (await this.reading.projectAddress?.(tenant, takeoff.projectId)) ?? null;
    const zone = climateZone(postalCodeIn(address));
    const extraFacts: SiteFact[] = zone ? [{ key: "zone", value: String(zone), unit: "u", evidence: `Code postal du chantier (${postalCodeIn(address)})`, origin: "document" }] : [];
    // Département littoral : crochet d'ardoise inox 2,7 mm d'office (Cupa, §34).
    if (isCoastal(postalCodeIn(address))) {
      extraFacts.push({ key: "diametre_crochet", value: "2.7", unit: "mm", evidence: `Département littoral (${postalCodeIn(address)}) : crochet inox 2,7 mm`, origin: "document" });
    }
    // Prompt A (§41.1) : la pente, le rampant, l'épaisseur lus par l'IA dans la ligne ou l'en-tête entrent dans
    // le calcul (après le texte lu par le code, avant les hypothèses par défaut).
    extraFacts.push(...factsFromReading(ref, takeoff.lines.map((l) => ({ ref: l.id, dimensions: l.dimensions })), takeoff.context));
    // Infos chantier facultatives : les mesures nommées de la note de l'artisan passent devant le devis (l'explication dit les deux).
    extraFacts.push(...readSiteNotes(ref, notes));
    const plan = planQuote(lines.map((l) => ({ ref: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit, section: l.section })), ref, profile, undefined, extraFacts);
    // Niveau 1 : le rôle de chaque quantité (mesure d'ouvrage ou à commander), proposé par le code
    // et ENREGISTRÉ avec la ligne ; une mesure ne devient jamais une quantité d'achat.
    const proposals = proposeLineRoles(takeoff.lines.map((l) => ({ ref: l.id, reference: l.reference, designation: l.designation })), plan, read, ref);
    const roles = new Map<string, LineRole>([...proposals].map(([id, p]) => [id, p.role]));
    // L'artisan a tranché une ambiguïté (« 6 : ardoises ou jouées ? ») : sa réponse fait foi pour ce chantier.
    for (const [key, value] of Object.entries(takeoff.answers)) {
      const id = key.startsWith("role:") ? key.slice(5) : null;
      if (id && roles.has(id) && (value === "measure" || value === "purchase")) roles.set(id, value);
    }
    const asks = new Map([...proposals].filter(([id, p]) => p.ask && roles.get(id) === "undetermined").map(([id, p]) => [id, p.ask!]));
    const changed = new Map([...roles].filter(([id, role]) => takeoff.lines.find((l) => l.id === id)?.role !== role));
    if (changed.size > 0) {
      await this.takeoffs.setRoles(tenant, changed);
      takeoff = { ...takeoff, lines: takeoff.lines.map((l) => (changed.has(l.id) ? { ...l, role: changed.get(l.id)! } : l)) };
    }
    const validation = applyLineRoles(read, roles);
    // Mode validateur (fondateur) : les calculs des règles EN BROUILLON sont montrés, marqués « provisoire »,
    // jamais ✓ et jamais envoyés au fournisseur (la demande de prix ne reprend que les lignes du devis).
    const acceptDraft = (await this.reading.isValidator?.(tenant)) ?? false;
    const engine =
      plan.inputs.length > 0
        ? computeWithAnswers(ref, plan, takeoff.answers, await this.memory.forEngine(tenant), { acceptDraft }, slotsGivenByQuote(plan, validation))
        : { needs: [], questions: [], declined: [] };
    // Le quantitatif renvoyé garde TOUTES ses lignes (les exclues aussi, pour le détail sans prix) ; seul le calcul les ignore.
    const kept = excluded.size > 0 ? { ...takeoff, lines: record.lines.map((l) => takeoff.lines.find((x) => x.id === l.id) ?? l) } : takeoff;
    const openContradictions = plan.contradictions.map((c) => c.key).filter((k) => engine.questions.some((q) => q.key === `param:${k}`));
    const reviewed = { takeoff: kept, validation, roles: new Map([...proposals].map(([id, p]) => [id, { ...p, role: roles.get(id) ?? p.role }])), excluded, openContradictions };
    const view = artisanView(lines, validation, engine, { plan, roles, ref, asks });
    // §45.8 : « On ajoute ? » — les réponses de ce chantier, et ce que l'entreprise ne veut plus voir.
    const said = (v: string) => new Set(Object.entries(takeoff.answers).filter(([k, a]) => k.startsWith("ajout:") && a === v).map(([k]) => k.slice("ajout:".length)));
    const hidden = (await this.reading.consumables?.hidden(tenant)) ?? new Set<string>();
    const consumables = { accepted: said("oui"), refused: said("non"), hidden };
    // § 41.4 : les mots de l'artisan (libellé, quantité réécrits d'un tap) remplacent ceux de BatiClair.
    const brief = siteBrief({
      ref,
      plan,
      answers: takeoff.answers,
      lines: takeoff.lines.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantityRaw, unit: l.unitRaw, material: l.material ?? null })),
      context: takeoff.context ?? {},
      ville: communeOf(address),
    });
    const purchase = applyPurchaseOverrides(purchaseView(view, engine, { plan, roles, ref, validation, consumables }), takeoff.answers);
    // Une ligne que l'entreprise ajoute à la main d'un chantier à l'autre est proposée aussi, si le devis ne l'a pas déjà.
    const present = new Set(takeoff.lines.map((l) => manualKey(l.designation)));
    for (const m of (await this.reading.consumables?.manual(tenant)) ?? []) {
      if (purchase.suggestions.length >= MAX_SUGGESTIONS) break;
      if (present.has(m.key) || consumables.refused.has(m.key) || hidden.has(m.key)) continue;
      purchase.suggestions.push({
        key: m.key,
        label: m.designation,
        quantity: [m.quantity, m.unit].filter(Boolean).join(" ") || null,
        order: m.quantity ? { count: m.quantity, unit: m.unit ?? "u" } : null,
        approx: null,
        kind: "direct",
        needIds: [],
        lineIds: [],
        state: "ready",
        assumptionKeys: [],
        consumable: true,
      });
    }
    return { ...reviewed, view, brief, purchase };
  }

  /**
   * Exécute le plan : les blocs en parallèle (un seul bloc pour un devis
   * normal). Toutes les pages doivent être lues : un bloc en échec fait
   * échouer la lecture, jamais une liste incomplète présentée comme entière.
   */
  private async readPlan(
    tenant: TenantContext,
    doc: DocumentWithProcessing,
    prepared: Prepared,
    analysisId: string,
    chunks: readonly ReadingChunk[],
    policy: ExtractionPolicy,
    tally: CallTally,
  ): Promise<{ ok: true; model: string; parts: ChunkParts } | ChunkFailure> {
    if (!this.extractor || chunks.length === 0) return { ok: false, reason: "nothing_to_read" };
    const extractor = this.extractor;
    // §44.2 filet : la note de l'artisan accompagne la lecture IA, comme contexte.
    const siteNotes = doc.projectId ? ((await this.reading.projectNotes?.(tenant, doc.projectId)) ?? null) : null;
    const hints = { ...this.tradeHints(doc.trade), ...(siteNotes ? { siteNotes } : {}) };
    const allPages = prepared.pages.length;
    const maxCalls = Math.max(policy.maxCallsPerAnalysis, chunks.length);
    let calls = 0;
    let model = "";

    const readChunk = async (chunk: ReadingChunk, depth: number): Promise<ChunkResult> => {
      const whole = chunk.context.length === 0 && chunk.pages.length === allPages;
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (calls >= maxCalls) return { ok: false, reason: "too_many_calls" };
        // Numéro pris avant toute attente : les blocs lus en parallèle ont chacun le leur.
        const call = ++calls;
        const input = whole ? prepared.input : await prepared.slice([...chunk.pages, ...chunk.context]);
        const result = await extractor.extract({ ...input, ...hints, ...(whole ? {} : { scope: { pages: chunk.pages } }) });
        const sent = new Set(whole ? prepared.pages.map((p) => p.pageNumber) : [...chunk.pages, ...chunk.context]);
        const routes = prepared.pages.filter((p) => sent.has(p.pageNumber));
        const pages = { text: routes.filter((p) => p.route === "text").length, vision: routes.filter((p) => p.route === "vision").length };
        tally.calls = Math.max(tally.calls, call);
        const outcome = result.errorCode === "max_tokens" ? "truncated" : result.status;
        tally.outcomes[outcome] = (tally.outcomes[outcome] ?? 0) + 1;
        tally.tokens.input += result.usage.inputTokens;
        tally.tokens.output += result.usage.outputTokens;
        tally.tokens.cacheRead += result.usage.cacheReadTokens ?? 0;
        tally.tokens.cacheWrite += (result.usage.cacheWrite5mTokens ?? 0) + (result.usage.cacheWrite1hTokens ?? 0);
        // Valeur lue APRÈS l'attente : les blocs lus en parallèle ajoutent chacun leur coût.
        const cost = await this.record(tenant, doc, pages, prepared.processingId, analysisId, call, result);
        tally.costMicroUsd += cost;
        if (result.status === "success" && result.output) {
          model = result.model;
          return { ok: true, parts: [{ chunk, output: result.output }] };
        }
        if (tooLong(result)) {
          // Jamais la même demande : deux moitiés, chacune avec son contexte.
          const halves = depth < 2 ? splitChunk(chunk, prepared.pages, policy) : null;
          if (!halves) return { ok: false, reason: "page_too_dense" };
          tally.splits++;
          const results = await Promise.all(halves.map((h) => readChunk(h, depth + 1)));
          const failed = results.find((r): r is ChunkFailure => !r.ok);
          return failed ?? { ok: true, parts: results.flatMap((r) => (r.ok ? r.parts : [])) };
        }
        if (!transient(result) || attempt === 2) return { ok: false, reason: result.status };
      }
      return { ok: false, reason: "unknown" };
    };

    const results = await Promise.all(chunks.map((c) => readChunk(c, 0)));
    const failed = results.find((r): r is ChunkFailure => !r.ok);
    if (failed) return failed;
    return { ok: true, model, parts: results.flatMap((r) => (r.ok ? r.parts : [])) };
  }

  /** Ce que l'IA sait du métier : son nom et ses familles de matériaux habituelles (vocabulaire). */
  private tradeHints(trade: string): { tradeLabel: string; materialFamilies: string[]; workItems: { id: string; label: string; synonyms: string[] }[] } {
    const profile = tradeProfile(trade);
    // « RÉFÉRENTIEL CHARGÉ » du prompt A (§41.1) : les ouvrages du métier et leurs synonymes (mots des familles qui les déclenchent).
    const ref = referentialFor(profile.id);
    const workItems = (ref?.workItems ?? []).map((w) => ({
      id: w.id,
      label: w.label,
      synonyms: [...new Set(w.triggers.flatMap((t) => ref!.families.find((f) => f.code === t)?.keywords ?? []))],
    }));
    return { tradeLabel: profile.label, materialFamilies: profile.families.map((f) => f.label), workItems };
  }

  private async record(
    tenant: TenantContext,
    doc: DocumentWithProcessing,
    pages: { text: number; vision: number },
    processingId: string | null,
    analysisId: string,
    attempt: number,
    result: ExtractionAttempt,
  ): Promise<number> {
    try {
      const { costMicroUsd } = await this.recorder.record({
        companyId: tenant.companyId,
        projectId: doc.projectId,
        documentId: doc.id,
        processingId,
        analysisId,
        userId: tenant.userId,
        task: "takeoff_extraction",
        route: pages.vision > 0 ? "vision" : "text",
        provider: result.provider,
        model: result.model,
        promptId: TAKEOFF_PROMPT.id,
        promptVersion: TAKEOFF_PROMPT.version,
        attempt,
        pagesText: pages.text,
        pagesVision: pages.vision,
        usage: result.usage,
        status: result.status,
        errorCode: result.errorCode,
        durationMs: result.durationMs,
      });
      return costMicroUsd;
    } catch (error) {
      // La mesure du coût ne doit jamais faire perdre une lecture réussie ; l'écart est journalisé.
      this.onRecordFailure(error);
      return 0;
    }
  }

  /** Mesures de la lecture : enregistrées avec l'analyse et journalisées ; jamais bloquantes. */
  private async saveStats(analysisId: string, stats: ReadingStats): Promise<void> {
    try {
      await this.meter.recordReading(analysisId, stats);
      this.reading.onStats?.(stats);
    } catch (error) {
      this.onRecordFailure(error);
    }
  }
}

export type { LineValidation, TakeoffIssue };
