import {
  type OrderedLine,
  compareOffers,
  computedTotalHT,
  verifyOfferArithmetic,
  type ArithmeticCheck,
  type ComparisonResult,
  type Money,
} from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";
import type { DocumentAiInput, DocumentRepository } from "../../documents/index.js";
import type { PriceRequestRecord, PriceRequestRepository } from "../../price-requests/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import type { OfferExtractor } from "./offer-extractor.js";
import { offerMatches, requestedItems, toSupplierOffer, type RequestedLine } from "./offer-mapping.js";
import type { OfferLineFields, OfferRecord, OfferRepository } from "./offer.repository.js";

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

export const PHRASE_LECTURE_RETIREE = "Mobiiz ne lit plus les devis de tes négoces : ouvre le devis, puis retiens le négoce de ton choix.";

/**
 * Devis des fournisseurs : les lectures déjà faites (IA, jusqu'au 28 octobre 2026) restent comparées par le code ;
 * aucun nouveau devis n'est lu (point 7).
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

  /**
   * DEVIS REÇUS DES NÉGOCES DE L'ARTISAN : PLUS DE LECTURE IA (Greg, 28 octobre 2026, point 7 : « l'artisan sait lire le
   * devis de son négoce »). Le devis reçu s'ouvre tel quel ; la comparaison reste seulement quand le négoce répond par le
   * lien (prix ligne par ligne, Excel), faite par le code. L'IA ne lit plus que le devis de l'artisan (sa liste) et les
   * offres PDF des achats groupés (validées par l'admin). Les lectures déjà faites restent visibles.
   */
  get aiAvailable(): boolean {
    return false;
  }

  private refuserLecture(): never {
    throw new DomainError("conflict", "Supplier quotes are no longer read by AI", { reason: "lecture_devis_negoce_retiree", message: PHRASE_LECTURE_RETIREE });
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
    return this.refuserLecture();
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
    return this.refuserLecture();
  }

  /**
   * §47.5 : la photo (ou le PDF) du bon de commande, lue par l'IA comme un devis : les lignes telles qu'imprimées et la
   * ligne demandée qu'elles reprennent. Rien n'est calculé ici : les écarts sont faits par le code (`orderGaps`).
   */
  async readOrderLines(tenant: TenantContext, requestId: string): Promise<OrderedLine[]> {
    assertCanWrite(tenant);
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    // Point 7 (28 octobre 2026) : le bon de commande d'un négoce ne se lit plus par l'IA ; il se colle (lu par le code).
    return this.refuserLecture();
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


}
