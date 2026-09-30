import {
  reviewExtractedTakeoff,
  tradeProfile,
  type LineValidation,
  type TakeoffIssue,
  type TakeoffValidation,
} from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";
import type { DocumentAiInput, DocumentRepository, DocumentWithProcessing, PreparedDocument } from "../../documents/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { TAKEOFF_PROMPT } from "./prompt.js";
import type { ExtractionAttempt, TakeoffExtractor } from "./takeoff-extractor.js";
import type { LineFields, TakeoffLineRecord, TakeoffRecord, TakeoffRepository } from "./takeoff.repository.js";

/** Deux tentatives au plus : une relance si la réponse est inexploitable, jamais plus (coût maîtrisé). */
const MAX_ATTEMPTS = 2;

export interface ReviewedTakeoff {
  takeoff: TakeoffRecord;
  validation: TakeoffValidation;
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
    private readonly onRecordFailure: (error: unknown) => void = () => {},
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
    const begin = await this.meter.begin({
      companyId: tenant.companyId,
      userId: tenant.userId,
      projectId: doc.projectId,
      documentId,
      kind: "client_quote",
    });
    if (begin.status === "already_done") throw new DomainError("conflict", "Analysis already completed for this document");
    const analysisId = begin.analysis.id;

    let success: ExtractionAttempt | null = null;
    let last: ExtractionAttempt | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !success; attempt++) {
      const result = await this.extractor.extract({ ...prepared.input, ...this.tradeHints(doc.trade) });
      last = result;
      await this.record(tenant, doc, prepared, analysisId, attempt, result);
      if (result.status === "success") success = result;
      else if (result.status === "refused") break;
    }

    if (!success?.output) {
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "The AI could not read this quote", { reason: last?.status ?? "unknown" });
    }

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

  async updateLine(tenant: TenantContext, lineId: string, fields: LineFields): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    await this.takeoffs.updateLine(tenant, lineId, fields);
    return this.reload(tenant, takeoff.id);
  }

  /** « C'est bon » : l'artisan a regardé la ligne douteuse et la garde telle quelle. */
  async confirmLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    await this.takeoffs.confirmLine(tenant, lineId);
    return this.reload(tenant, takeoff.id);
  }

  async deleteLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    await this.takeoffs.deleteLine(tenant, lineId);
    return this.reload(tenant, takeoff.id);
  }

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    await this.takeoffs.addLine(tenant, takeoff.id, fields);
    return this.reload(tenant, takeoff.id);
  }

  /**
   * L'artisan valide : seulement quand aucune ligne n'est bloquante (quantité
   * absente ou illisible) et que chaque doute a été vu (corrigé ou confirmé).
   * Rien ne part chez un fournisseur avec un doute non levé.
   */
  async validate(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const { validation } = await this.review(tenant, takeoff);
    if (validation.counts.blocking > 0) {
      throw validationFailed("Blocking issues remain", { reason: "blocking_issues", count: validation.counts.blocking });
    }
    if (validation.counts.toVerify > 0) {
      throw validationFailed("Lines to check remain", { reason: "lines_to_check", count: validation.counts.toVerify });
    }
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
        enteredByArtisan: l.origin === "manual" || l.edited,
        aiDoubt: l.aiDoubt,
        confirmedByArtisan: l.confirmed,
      })),
      source,
      profile,
    );
    return { takeoff, validation };
  }

  /** Ce que l'IA sait du métier : son nom et ses familles de matériaux habituelles (vocabulaire). */
  private tradeHints(trade: string): { tradeLabel: string; materialFamilies: string[] } {
    const profile = tradeProfile(trade);
    return { tradeLabel: profile.label, materialFamilies: profile.families.map((f) => f.label) };
  }

  private async record(
    tenant: TenantContext,
    doc: DocumentWithProcessing,
    prepared: Prepared,
    analysisId: string,
    attempt: number,
    result: ExtractionAttempt,
  ): Promise<void> {
    try {
      await this.recorder.record({
        companyId: tenant.companyId,
        projectId: doc.projectId,
        documentId: doc.id,
        processingId: prepared.processingId,
        analysisId,
        userId: tenant.userId,
        task: "takeoff_extraction",
        route: prepared.pagesVision > 0 ? "vision" : "text",
        provider: result.provider,
        model: result.model,
        promptId: TAKEOFF_PROMPT.id,
        promptVersion: TAKEOFF_PROMPT.version,
        attempt,
        pagesText: prepared.pagesText,
        pagesVision: prepared.pagesVision,
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
