import {
  compareOffers,
  computedTotalHT,
  tradeKey,
  tradeProfile,
  verifyOfferArithmetic,
  type ArithmeticCheck,
  type ComparisonResult,
  type Money,
} from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";
import type { DocumentAiInput, DocumentRepository, PreparedDocument } from "../../documents/index.js";
import type { PriceRequestRecord, PriceRequestRepository } from "../../price-requests/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { OfferAttempt, OfferExtractor, OfferOutput } from "./offer-extractor.js";
import { decimalText, offerMatches, percentToRate, requestedItems, toSupplierOffer, type RequestedLine } from "./offer-mapping.js";
import type { NewOfferLine, OfferLineFields, OfferRecord, OfferRepository } from "./offer.repository.js";
import { OFFER_PROMPT } from "./prompt.js";

/** Deux tentatives au plus : une relance si la réponse est inexploitable, jamais plus (coût maîtrisé). */
const MAX_ATTEMPTS = 2;

export interface OfferView {
  offer: OfferRecord;
  /** Total HT recalculé par le code (lignes comptées − remise globale). */
  computedTotalHT: Money;
  arithmetic: ArithmeticCheck;
  requestedCount: number;
  /** Lignes demandées auxquelles le devis répond. */
  answeredCount: number;
}

export interface ComparisonView {
  request: PriceRequestRecord;
  /** Fournisseurs dont le devis est lu, dans l'ordre de la demande. */
  suppliers: { recipientId: string; supplierId: string; name: string }[];
  result: ComparisonResult;
}

/**
 * Devis des fournisseurs : l'IA les lit une fois (1 analyse par devis) et
 * propose les correspondances avec la liste demandée ; le code fait tous
 * les calculs, contrôle les totaux et compare ; l'artisan corrige et tranche.
 */
export class OffersService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly requests: PriceRequestRepository,
    private readonly documents: DocumentRepository,
    private readonly aiInput: DocumentAiInput,
    private readonly extractor: OfferExtractor | null,
    private readonly meter: AnalysisMeter,
    private readonly recorder: AiUsageRecorder,
    private readonly onRecordFailure: (error: unknown) => void = () => {},
  ) {}

  get aiAvailable(): boolean {
    return this.extractor !== null;
  }

  /** Lit le devis reçu d'un fournisseur (ou renvoie la lecture déjà faite, sans nouveau coût). */
  async analyze(tenant: TenantContext, recipientId: string): Promise<OfferView> {
    assertCanWrite(tenant);
    const request = await this.requests.findByRecipient(tenant, recipientId);
    if (!request) throw notFound("Recipient");
    const recipient = request.recipients.find((r) => r.id === recipientId)!;
    if (!recipient.document) throw validationFailed("No quote received yet", { reason: "no_quote" });

    const existing = await this.offers.findByDocument(tenant, recipient.document.id);
    if (existing) return this.view(existing, request);
    if (!this.extractor) throw new DomainError("ai_unavailable", "AI reading is not configured");
    return (await this.readQuote(tenant, request, recipient.document.id, true)).offer;
  }

  /**
   * « Lire et comparer » : tous les devis reçus et pas encore lus de la
   * demande, en une fois et en parallèle. Le lot compte pour UNE analyse,
   * quel que soit le nombre de devis (rien si aucun n'a pu être lu).
   */
  async analyzeAll(tenant: TenantContext, requestId: string): Promise<{ read: number; failed: { recipientId: string; supplier: string }[] }> {
    assertCanWrite(tenant);
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    const already = await this.offersOf(tenant, request);
    const pending = request.recipients.filter((r) => r.document && !already.has(r.id));
    if (pending.length === 0) return { read: 0, failed: [] };
    if (!this.extractor) throw new DomainError("ai_unavailable", "AI reading is not configured");

    const results = await Promise.allSettled(pending.map((r) => this.readQuote(tenant, request, r.document!.id, false)));
    const done = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.analysisId] : []));
    if (done.length > 0) await this.meter.markBillable(done[0]!);
    const failed = pending.flatMap((r, i) => (results[i]!.status === "rejected" ? [{ recipientId: r.id, supplier: r.supplier.name }] : []));
    // Plafond atteint : rien n'a été lu, l'artisan doit le savoir (pas un simple échec de lecture).
    const quota = results.find((r) => r.status === "rejected" && r.reason instanceof DomainError && r.reason.code === "analysis_quota_reached");
    if (done.length === 0 && quota && quota.status === "rejected") throw quota.reason;
    return { read: done.length, failed };
  }

  private async readQuote(
    tenant: TenantContext,
    request: PriceRequestRecord,
    documentId: string,
    billable: boolean,
  ): Promise<{ offer: OfferView; analysisId: string }> {
    const extractor = this.extractor!;
    const doc = await this.documents.findById(tenant, documentId);
    if (!doc) throw notFound("Document");
    const prepared = await this.aiInput.prepare(tenant, doc);
    const begin = await this.meter.begin({
      companyId: tenant.companyId,
      userId: tenant.userId,
      projectId: request.projectId,
      documentId: doc.id,
      kind: "supplier_quote",
    });
    if (begin.status === "already_done") throw new DomainError("conflict", "Analysis already completed for this document");
    const analysisId = begin.analysis.id;

    const profile = tradeProfile(tradeKey(tenant.trades));
    let success: OfferAttempt | null = null;
    let last: OfferAttempt | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !success; attempt++) {
      const result = await extractor.extract({ ...prepared.input, tradeLabel: profile.label, requested: request.lines });
      last = result;
      await this.record(tenant, request.projectId, doc.id, prepared, analysisId, attempt, result);
      if (result.status === "success") success = result;
      else if (result.status === "refused") break;
    }
    if (!success?.output) {
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "The AI could not read this quote", { reason: last?.status ?? "unknown" });
    }

    const out = success.output;
    const offer = await this.offers.create(tenant, {
      documentId: doc.id,
      analysisId,
      promptId: OFFER_PROMPT.id,
      promptVersion: OFFER_PROMPT.version,
      model: success.model,
      totalHT: decimalText(out.totalHT),
      totalVAT: decimalText(out.totalVAT),
      totalTTC: decimalText(out.totalTTC),
      globalDiscountRate: percentToRate(out.globalDiscountPercent),
      globalDiscountAmount: out.globalDiscountPercent ? null : decimalText(out.globalDiscountAmount),
      deliveryIncluded: out.deliveryIncluded,
      notes: out.notes,
      lines: out.lines.map((l) => toNewLine(l, request.lines.length)),
    });
    await this.meter.complete(analysisId, { billable });
    return { offer: this.view(offer, request), analysisId };
  }

  /** Les devis déjà lus d'une demande de prix, par destinataire. */
  async forRequest(tenant: TenantContext, requestId: string): Promise<Map<string, OfferView>> {
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    return this.offersOf(tenant, request);
  }

  /** Correction d'une ligne par l'artisan (valeurs lues, correspondance) : elle fait foi. */
  async updateLine(tenant: TenantContext, lineId: string, changes: Partial<OfferLineFields>): Promise<OfferView> {
    assertCanWrite(tenant);
    const offer = await this.offers.findByLine(tenant, lineId);
    if (!offer) throw notFound("OfferLine");
    const request = await this.requestOfDocument(tenant, offer.documentId);
    const line = offer.lines.find((l) => l.id === lineId)!;
    const fields: OfferLineFields = {
      kind: changes.kind ?? line.kind,
      designation: changes.designation ?? line.designation,
      reference: changes.reference !== undefined ? changes.reference : line.reference,
      quantityRaw: changes.quantityRaw !== undefined ? changes.quantityRaw : line.quantityRaw,
      unitRaw: changes.unitRaw !== undefined ? changes.unitRaw : line.unitRaw,
      unitPrice: changes.unitPrice !== undefined ? changes.unitPrice : line.unitPrice,
      discountRate: changes.discountRate !== undefined ? changes.discountRate : line.discountRate,
      lineTotal: changes.lineTotal !== undefined ? changes.lineTotal : line.lineTotal,
      packagingQuantity: changes.packagingQuantity !== undefined ? changes.packagingQuantity : line.packagingQuantity,
      packagingUnit: changes.packagingUnit !== undefined ? changes.packagingUnit : line.packagingUnit,
      requestIndex: changes.requestIndex !== undefined ? changes.requestIndex : line.requestIndex,
    };
    if (fields.requestIndex !== null && (fields.requestIndex < 0 || fields.requestIndex >= request.lines.length)) {
      throw validationFailed("Unknown requested line", { reason: "unknown_request_line" });
    }
    await this.offers.updateLine(tenant, lineId, fields);
    const updated = await this.offers.findByDocument(tenant, offer.documentId);
    return this.view(updated!, request);
  }

  /** Comparaison ligne à ligne et totaux, calculés par le moteur du domaine (aucune IA). */
  async compare(tenant: TenantContext, requestId: string): Promise<ComparisonView> {
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    const views = await this.offersOf(tenant, request);
    const items = requestedItems(request.lines);
    const suppliers: ComparisonView["suppliers"] = [];
    const offers = [];
    const matches = [];
    for (const r of request.recipients) {
      const v = views.get(r.id);
      if (!v) continue;
      suppliers.push({ recipientId: r.id, supplierId: r.supplier.id, name: r.supplier.name });
      offers.push(toSupplierOffer(r.supplier.id, v.offer));
      matches.push(...offerMatches(r.supplier.id, v.offer, items.length));
    }
    return { request, suppliers, result: compareOffers({ items, offers, matches }) };
  }

  private async offersOf(tenant: TenantContext, request: PriceRequestRecord): Promise<Map<string, OfferView>> {
    const docIds = request.recipients.flatMap((r) => (r.document ? [r.document.id] : []));
    const offers = await this.offers.findByDocuments(tenant, docIds);
    const byDoc = new Map(offers.map((o) => [o.documentId, o]));
    const views = new Map<string, OfferView>();
    for (const r of request.recipients) {
      const offer = r.document ? byDoc.get(r.document.id) : undefined;
      if (offer) views.set(r.id, this.view(offer, request));
    }
    return views;
  }

  private async requestOfDocument(tenant: TenantContext, documentId: string): Promise<PriceRequestRecord> {
    const request = await this.requests.findByDocument(tenant, documentId);
    if (!request) throw notFound("PriceRequest");
    return request;
  }

  private view(offer: OfferRecord, request: { lines: RequestedLine[] }): OfferView {
    const domain = toSupplierOffer("offer", offer);
    const answered = new Set(offer.lines.flatMap((l) => (l.requestIndex !== null && l.kind !== "variant" && l.kind !== "option" ? [l.requestIndex] : [])));
    return {
      offer,
      computedTotalHT: computedTotalHT(domain),
      arithmetic: verifyOfferArithmetic(domain),
      requestedCount: request.lines.length,
      answeredCount: answered.size,
    };
  }

  private async record(
    tenant: TenantContext,
    projectId: string,
    documentId: string,
    prepared: PreparedDocument,
    analysisId: string,
    attempt: number,
    result: OfferAttempt,
  ): Promise<void> {
    try {
      await this.recorder.record({
        companyId: tenant.companyId,
        projectId,
        documentId,
        processingId: prepared.processingId,
        analysisId,
        userId: tenant.userId,
        task: "offer_extraction",
        route: prepared.pagesVision > 0 ? "vision" : "text",
        provider: result.provider,
        model: result.model,
        promptId: OFFER_PROMPT.id,
        promptVersion: OFFER_PROMPT.version,
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

function toNewLine(l: OfferOutput["lines"][number], requestedCount: number): NewOfferLine {
  const index = l.requestLine !== null && l.requestLine >= 1 && l.requestLine <= requestedCount ? l.requestLine - 1 : null;
  return {
    kind: l.kind,
    designation: l.designation.trim(),
    reference: l.reference?.trim() || null,
    quantityRaw: l.quantity?.trim() || null,
    unitRaw: l.unit?.trim() || null,
    unitPrice: decimalText(l.unitPrice),
    discountRate: percentToRate(l.discountPercent),
    lineTotal: decimalText(l.lineTotal),
    packagingQuantity: l.packagingContent ? decimalText(l.packagingContent.quantity) : null,
    packagingUnit: l.packagingContent?.unit.trim() || null,
    requestIndex: index,
    matchConfidence: index === null ? null : (l.matchConfidence ?? "unsure"),
    aiDoubt: l.doubt?.trim() || null,
    sourceRefs: l.sourceRefs,
  };
}
