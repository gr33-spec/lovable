import { normalizeText } from "@baticlair/domain";
import { fakeRows, isNumberCell } from "../../../platform/ai/fake-table.js";
import type { OfferAttempt, OfferExtractionRequest, OfferExtractor, OfferOutput } from "../application/offer-extractor.js";

const FEE_WORDS = ["livraison", "transport", "port", "eco participation", "manutention"];

/**
 * Lecture SIMULÉE d'un devis fournisseur (développement et tests uniquement,
 * refusée en ligne). Règles fixes : colonnes « réf · désignation · qté
 * unité · P.U. · total » ; correspondance par référence (sûre) ou par
 * désignation identique (probable) ; totaux « Total HT … TVA … Total TTC … ».
 */
export class FakeOfferExtractor implements OfferExtractor {
  readonly provider = "fake";

  async extract(request: OfferExtractionRequest): Promise<OfferAttempt> {
    const lines: OfferOutput["lines"] = fakeRows(request.numberedText)
      .filter((row) => row.index >= 1)
      .map((row) => {
        const designation = row.cols[row.index - 1]!;
        const reference = row.index >= 2 ? row.cols[0]! : null;
        const byRef = reference ? request.requested.findIndex((r) => r.reference === reference) : -1;
        const byName = request.requested.findIndex((r) => normalizeText(r.designation) === normalizeText(designation));
        const match = byRef >= 0 ? byRef : byName;
        const isFee = FEE_WORDS.some((w) => normalizeText(designation).includes(w));
        const unitPrice = row.cols[row.index + 1];
        const lineTotal = row.cols[row.index + 2];
        return {
          kind: isFee ? ("fee" as const) : ("main" as const),
          designation,
          reference,
          quantity: row.quantity,
          unit: row.unit,
          unitPrice: isNumberCell(unitPrice) ? unitPrice : null,
          discountPercent: null,
          lineTotal: isNumberCell(lineTotal) ? lineTotal : null,
          packagingContent: null,
          requestLine: !isFee && match >= 0 ? match + 1 : null,
          matchConfidence: !isFee && match >= 0 ? (byRef >= 0 ? ("sure" as const) : ("probable" as const)) : null,
          doubt: null,
          sourceRefs: [row.ref],
        };
      });
    const total = (label: string) => new RegExp(`${label}\\s+(?:\\d+ %\\s+)?(\\d[\\d ]*,\\d{2})`).exec(request.numberedText)?.[1] ?? null;
    const inputTokens = Math.ceil(request.numberedText.length / 3) + 2500;
    return {
      provider: this.provider,
      model: "claude-sonnet-5-5",
      usage: { inputTokens, outputTokens: 80 * lines.length + 60 },
      status: "success",
      output: {
        lines,
        totalHT: total("Total HT"),
        totalVAT: total("TVA"),
        totalTTC: total("Total TTC"),
        globalDiscountPercent: null,
        globalDiscountAmount: null,
        deliveryIncluded: null,
        notes: [],
      },
      errorCode: null,
      durationMs: 1,
    };
  }
}
