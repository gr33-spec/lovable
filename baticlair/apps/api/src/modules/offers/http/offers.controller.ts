import { Throttle } from "@nestjs/throttler";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { lineAmount, Money, type ComparisonResult, type Quantity } from "@baticlair/domain";
import { z } from "zod";
import { ZodPipe } from "../../../platform/http/zod.js";
import { Tenant, TenantGuard, type TenantContext } from "../../tenancy/index.js";
import { decimalText, percentToRate, toSupplierOffer } from "../application/offer-mapping.js";
import type { OfferLineFields } from "../application/offer.repository.js";
import { OffersService, type ComparisonView, type OfferView } from "../application/offers.service.js";
import { PriceRequestsService, priceRequestDto } from "../../price-requests/index.js";

const money = (m: Money | null | undefined): string | null => (m ? m.roundToCents().amount.toFixed(2) : null);
const cents = (decimal: string | null): string | null => (decimal ? money(Money.of(decimal)) : null);
const quantity = (q: Quantity | null): { value: string; unit: string } | null => (q ? { value: q.value.toString(), unit: q.unit } : null);

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const lineBody = z
  .object({
    kind: z.enum(["main", "substitution", "variant", "option", "fee", "deposit", "info"]).optional(),
    designation: z.string().trim().min(1).max(300).optional(),
    quantity: optionalText(40),
    unit: optionalText(20),
    unitPrice: optionalText(40),
    discountPercent: optionalText(20),
    lineTotal: optionalText(40),
    /** Numéro (à partir de 1) de la ligne demandée, ou null : « ne correspond à rien ». */
    requestLine: z.number().int().min(1).nullable().optional(),
  })
  .strict();

function offerDto(recipientId: string, v: OfferView) {
  const domain = toSupplierOffer("offer", v.offer);
  const amounts = new Map(domain.lines.map((l) => [l.id, lineAmount(l)]));
  return {
    recipientId,
    id: v.offer.id,
    documentId: v.offer.documentId,
    model: v.offer.model,
    notes: v.offer.notes,
    printed: { totalHT: cents(v.offer.totalHT), totalVAT: cents(v.offer.totalVAT), totalTTC: cents(v.offer.totalTTC) },
    deliveryIncluded: v.offer.deliveryIncluded,
    computedTotalHT: money(v.computedTotalHT),
    arithmetic: {
      status: v.arithmetic.status,
      issues: v.arithmetic.issues.map((i) => ({
        code: i.code,
        lineId: "lineId" in i ? i.lineId : null,
        computed: money(i.computed),
        printed: money(i.printed),
      })),
    },
    requestedCount: v.requestedCount,
    answeredCount: v.answeredCount,
    lines: v.offer.lines.map((l) => ({
      id: l.id,
      position: l.position,
      kind: l.kind,
      designation: l.designation,
      reference: l.reference,
      quantity: l.quantityRaw,
      unit: l.unitRaw,
      unitPrice: l.unitPrice,
      discountRate: l.discountRate,
      lineTotal: l.lineTotal,
      amount: money(amounts.get(l.id)),
      requestLine: l.requestIndex === null ? null : l.requestIndex + 1,
      matchConfidence: l.matchConfidence,
      matchConfirmed: l.matchConfirmed,
      aiDoubt: l.aiDoubt,
      edited: l.edited,
    })),
  };
}

function comparisonDto({ request, suppliers, result }: ComparisonView) {
  const bySupplier = new Map(result.suppliers.map((s) => [s.supplierId, s]));
  return {
    engineVersion: result.engineVersion,
    classifiedAt: request.classifiedAt?.toISOString() ?? null,
    retainedSupplierIds: request.retainedSupplierIds,
    suppliers: suppliers.map((s) => {
      const r = bySupplier.get(s.supplierId)!;
      return {
        ...s,
        computedTotalHT: money(r.computedTotalHT),
        printedTotalHT: money(r.printedTotalHT),
        feesHT: money(r.feesHT),
        comparableTotalHT: money(r.comparableTotalHT),
        estimatedPartHT: money(r.estimatedPartHT),
        coveredCount: r.coveredCount,
        missingCount: r.missingCount,
        uncertainCount: r.uncertainCount,
        /** Lignes proposées qui ne correspondent à aucun article demandé. */
        extrasCount: result.findings.find((f) => f.code === "EXTRA_LINES" && f.supplierId === s.supplierId)?.count ?? 0,
        extrasHT: money(r.extrasHT),
        comparability: r.comparability,
        arithmetic: r.arithmetic.status,
      };
    }),
    items: result.items.map((item, index) => ({
      index: index + 1,
      designation: request.lines[index]?.designation ?? "",
      quantity: request.lines[index]?.quantity ?? null,
      unit: request.lines[index]?.unit ?? null,
      lowestSupplierId: item.lowestSupplierId,
      offers: item.offers.map((o) => ({
        supplierId: o.supplierId,
        status: o.status,
        confidence: o.confidence,
        comparableAmount: money(o.comparableAmount),
        effectiveUnitPrice: money(o.effectiveUnitPrice),
        offeredQuantity: quantity(o.offeredQuantity),
        estimatedAmount: money(o.estimatedAmount),
        flags: o.flags,
        lineIds: o.lineIds,
      })),
    })),
    findings: result.findings.map((f: ComparisonResult["findings"][number]) => ({
      code: f.code,
      nature: f.nature,
      severity: f.severity,
      supplierId: f.supplierId ?? null,
      otherSupplierId: f.otherSupplierId ?? null,
      count: f.count ?? null,
      amount: money(f.amount),
      itemIndexes: (f.itemIds ?? []).map((id) => Number(id.replace("item-", "")) + 1),
    })),
  };
}

@Controller("v1")
@UseGuards(TenantGuard)
export class OffersController {
  constructor(
    @Inject(OffersService) private readonly offers: OffersService,
    @Inject(PriceRequestsService) private readonly requests: PriceRequestsService,
  ) {}

  /** §47.5 : « Lire le bon de commande » photographié : l'IA lit les lignes, le code fait les écarts et le journal. */
  @Throttle({ default: HOURLY(30) })
  @Post("price-requests/:id/order/analysis")
  @HttpCode(201)
  async readOrder(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    const lines = await this.offers.readOrderLines(tenant, id);
    return priceRequestDto(await this.requests.completeOrderReading(tenant, id, lines));
  }

  /** Lit le devis reçu d'un fournisseur par l'IA (1 analyse), ou renvoie la lecture déjà faite. */
  @Throttle({ default: HOURLY(30) })
  @Post("price-request-recipients/:id/analysis")
  @HttpCode(201)
  async analyze(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return offerDto(id, await this.offers.analyze(tenant, id));
  }

  /**
   * « Lire et comparer » : tous les devis reçus pas encore lus, en une fois.
   * Le lot compte pour une seule analyse.
   */
  @Throttle({ default: HOURLY(30) })
  @Post("price-requests/:id/analysis")
  @HttpCode(201)
  async analyzeAll(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    const result = await this.offers.analyzeAll(tenant, id);
    const views = await this.offers.forRequest(tenant, id);
    return {
      read: result.read,
      failed: result.failed,
      aiAvailable: this.offers.aiAvailable,
      items: [...views.entries()].map(([recipientId, v]) => offerDto(recipientId, v)),
    };
  }

  @Get("price-requests/:id/offers")
  async list(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    const views = await this.offers.forRequest(tenant, id);
    return { aiAvailable: this.offers.aiAvailable, items: [...views.entries()].map(([recipientId, v]) => offerDto(recipientId, v)) };
  }

  @Patch("offer-lines/:id")
  async updateLine(@Tenant() tenant: TenantContext, @Param("id") id: string, @Body(new ZodPipe(lineBody)) body: z.infer<typeof lineBody>) {
    const changes: Partial<OfferLineFields> = {};
    if (body.kind !== undefined) changes.kind = body.kind;
    if (body.designation !== undefined) changes.designation = body.designation;
    if (body.quantity !== undefined) changes.quantityRaw = body.quantity || null;
    if (body.unit !== undefined) changes.unitRaw = body.unit || null;
    if (body.unitPrice !== undefined) changes.unitPrice = decimalText(body.unitPrice);
    if (body.discountPercent !== undefined) changes.discountRate = percentToRate(body.discountPercent);
    if (body.lineTotal !== undefined) changes.lineTotal = decimalText(body.lineTotal);
    if (body.requestLine !== undefined) changes.requestIndex = body.requestLine === null ? null : body.requestLine - 1;
    const view = await this.offers.updateLine(tenant, id, changes);
    return offerDto("", view);
  }

  /** Comparaison ligne à ligne et totaux (calculés par le code). */
  @Get("price-requests/:id/comparison")
  async compare(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return comparisonDto(await this.offers.compare(tenant, id));
  }
}
