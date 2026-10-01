import {
  artisanView,
  assessTakeoffLine,
  computeWithAnswers,
  DEFAULT_EXTRACTION_POLICY,
  mergeChunkLines,
  planQuote,
  planReading,
  priceTableAt,
  splitChunk,
  reviewExtractedTakeoff,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  type ArtisanView,
  type EngineAnswer,
  type CorrectionAction,
  type ExtractionPolicy,
  type ReadingChunk,
  type LineSnapshot,
  type LineValidation,
  type TakeoffIssue,
  type TakeoffValidation,
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
  policy?: ExtractionPolicy;
  /** Coût estimé au-delà duquel un document n'est pas un devis normal (micro-dollars). */
  maxAnalysisMicroUsd?: number;
  now?: () => Date;
}

/** Plafond par défaut (≈ 2,8 €) : environ 5 fois un devis de 500 lignes scanné (≈ 0,6 €). */
export const DEFAULT_MAX_ANALYSIS_MICRO_USD = 3_000_000;

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
  /** Ce que voit l'artisan : compteurs ✓/⚠/?, décisions regroupées, éléments prêts et leur preuve. */
  view: ArtisanView;
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

    const read = await this.readPlan(tenant, doc, prepared, analysisId, plan.chunks, policy);
    if (read.ok === false) {
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "The AI could not read this quote", { reason: read.reason });
    }
    const output: ExtractionOutput =
      read.parts.length === 1 && read.parts[0]!.chunk.context.length === 0
        ? read.parts[0]!.output
        : {
            lines: mergeChunkLines(read.parts.map((p) => ({ chunk: p.chunk, lines: p.output.lines }))).lines,
            notes: [...new Set(read.parts.flatMap((p) => p.output.notes))],
          };
    const success = { model: read.model, output };

    const takeoff = await this.takeoffs.create(tenant, {
      projectId: doc.projectId,
      documentId,
      analysisId,
      trade: doc.trade,
      promptId: TAKEOFF_PROMPT.id,
      promptVersion: TAKEOFF_PROMPT.version,
      model: success.model,
      notes: success.output.notes,
      lines: success.output.lines.map((l) => ({
        designation: l.designation.trim(),
        quantityRaw: l.quantity?.trim() || null,
        unitRaw: l.unit?.trim() || null,
        reference: l.reference?.trim() || null,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section.map((t) => t.trim()).filter((t) => t.length > 0),
        aiDoubt: l.doubt?.trim() || null,
      })),
    });
    await this.meter.complete(analysisId);
    return this.review(tenant, takeoff);
  }

  async forProject(tenant: TenantContext, projectId: string): Promise<ReviewedTakeoff | null> {
    const takeoff = await this.takeoffs.findLatestByProject(tenant, projectId);
    return takeoff ? this.review(tenant, takeoff) : null;
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

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const known = new Set(takeoff.lines.map((l) => l.id));
    await this.takeoffs.addLine(tenant, takeoff.id, fields);
    const after = await this.reload(tenant, takeoff.id);
    const added = after.takeoff.lines.find((l) => !known.has(l.id));
    if (added) await this.recordGesture(tenant, "add", added.id, null, after);
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
    const source = line && line.sourceRefs.length > 0 ? await this.aiInput.sourceLines(tenant, after.takeoff.documentId) : new Map<string, string>();
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
  async answer(tenant: TenantContext, takeoffId: string, key: string, value: EngineAnswer): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const previous = takeoff.answers[key];
    await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
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
    const { validation, view } = await this.review(tenant, takeoff);
    if (validation.counts.blocking > 0) {
      throw validationFailed("Blocking issues remain", { reason: "blocking_issues", count: validation.counts.blocking });
    }
    if (validation.counts.toVerify > 0) {
      throw validationFailed("Lines to check remain", { reason: "lines_to_check", count: validation.counts.toVerify });
    }
    // Un ⚠ sur une ligne du devis attend une décision (article inconnu…) : rien ne part sans elle.
    const open = view.items.filter((i) => i.kind === "line" && i.state === "to_confirm").length;
    if (open > 0) throw validationFailed("Decisions remain", { reason: "decisions_remaining", count: open });
    await this.takeoffs.setStatus(tenant, takeoff.id, "validated");
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
  private async review(tenant: TenantContext, takeoff: TakeoffRecord): Promise<ReviewedTakeoff> {
    const profile = tradeProfile(takeoff.trade);
    const source = await this.aiInput.sourceLines(tenant, takeoff.documentId);
    const { validation } = reviewExtractedTakeoff(
      takeoff.lines.map((l: TakeoffLineRecord) => ({
        id: l.id,
        designation: l.designation,
        quantity: l.quantityRaw,
        unit: l.unitRaw,
        reference: l.reference,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section,
        enteredByArtisan: l.origin === "manual" || l.edited,
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
      enteredByArtisan: l.origin === "manual" || l.edited,
    }));
    const plan = planQuote(lines.map((l) => ({ ref: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit, section: l.section })), ROOFING_REFERENTIAL, profile);
    const engine = plan.inputs.length > 0 ? computeWithAnswers(ROOFING_REFERENTIAL, plan, takeoff.answers, await this.memory.forEngine(tenant), {}, slotsGivenByQuote(plan, validation)) : { needs: [], questions: [], declined: [] };
    return { takeoff, validation, view: artisanView(lines, validation, engine) };
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
  ): Promise<{ ok: true; model: string; parts: ChunkParts } | ChunkFailure> {
    if (!this.extractor || chunks.length === 0) return { ok: false, reason: "nothing_to_read" };
    const extractor = this.extractor;
    const hints = this.tradeHints(doc.trade);
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
        await this.record(tenant, doc, pages, prepared.processingId, analysisId, call, result);
        if (result.status === "success" && result.output) {
          model = result.model;
          return { ok: true, parts: [{ chunk, output: result.output }] };
        }
        if (tooLong(result)) {
          // Jamais la même demande : deux moitiés, chacune avec son contexte.
          const halves = depth < 2 ? splitChunk(chunk, prepared.pages, policy) : null;
          if (!halves) return { ok: false, reason: "page_too_dense" };
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
  private tradeHints(trade: string): { tradeLabel: string; materialFamilies: string[] } {
    const profile = tradeProfile(trade);
    return { tradeLabel: profile.label, materialFamilies: profile.families.map((f) => f.label) };
  }

  private async record(
    tenant: TenantContext,
    doc: DocumentWithProcessing,
    pages: { text: number; vision: number },
    processingId: string | null,
    analysisId: string,
    attempt: number,
    result: ExtractionAttempt,
  ): Promise<void> {
    try {
      await this.recorder.record({
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
    } catch (error) {
      // La mesure du coût ne doit jamais faire perdre une lecture réussie ; l'écart est journalisé.
      this.onRecordFailure(error);
    }
  }
}

export type { LineValidation, TakeoffIssue };
