import { describe, expect, it } from "vitest";
import { Decimal, Money, Quantity, computedTotalHT, verifyOfferArithmetic, type SupplierOffer } from "../src/index.js";
import { offerA, offerC } from "./fixtures/dupont.js";

const eur = (v: string) => Money.of(v);

describe("verifyOfferArithmetic", () => {
  it("valide une offre cohérente (remise ligne, frais, TVA, TTC)", () => {
    const check = verifyOfferArithmetic(offerA);
    expect(check.status).toBe("consistent");
    expect(computedTotalHT(offerA).toString()).toBe("4897.40 EUR");
  });

  it("explique un total imprimé qui additionne une option", () => {
    const check = verifyOfferArithmetic(offerC);
    expect(check.status).toBe("inconsistent");
    const issue = check.issues.find((i) => i.code === "TOTAL_HT_MISMATCH");
    expect(issue).toMatchObject({
      explanation: { code: "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES", lineIds: ["c7"] },
    });
    expect(computedTotalHT(offerC).toString()).toBe("5093.50 EUR");
  });

  it("signale une ligne dont le total ne correspond pas à qté × PU", () => {
    const offer: SupplierOffer = {
      supplierId: "X",
      lines: [{ id: "l1", kind: "main", designation: "Parpaing 20", quantity: Quantity.of(100, "U"), unitPrice: eur("1.20"), lineTotal: eur("130.00") }],
    };
    const check = verifyOfferArithmetic(offer);
    expect(check.issues).toHaveLength(1);
    expect(check.issues[0]).toMatchObject({ code: "LINE_TOTAL_MISMATCH", lineId: "l1" });
  });

  it("tolère les arrondis au centime", () => {
    const offer: SupplierOffer = {
      supplierId: "X",
      lines: [{ id: "l1", kind: "main", designation: "Vis", quantity: Quantity.of(3, "U"), unitPrice: eur("0.3333"), lineTotal: eur("1.00") }],
      printed: { totalHT: eur("1.00") },
    };
    expect(verifyOfferArithmetic(offer).status).toBe("consistent");
  });

  it("applique une remise globale en montant et contrôle la TVA", () => {
    const offer: SupplierOffer = {
      supplierId: "X",
      globalDiscount: { amount: eur("10.00") },
      lines: [
        { id: "l1", kind: "main", designation: "Plaque BA13", quantity: Quantity.of(10, "U"), unitPrice: eur("10.00"), lineTotal: eur("100.00"), vatRate: new Decimal("0.20") },
        { id: "l2", kind: "fee", feeType: "delivery", designation: "Livraison", lineTotal: eur("20.00"), vatRate: new Decimal("0.20") },
      ],
      // (100 − 10) + 20 = 110 ; TVA 22 ; TTC 132
      printed: { totalHT: eur("110.00"), totalVAT: eur("22.00"), totalTTC: eur("132.00") },
    };
    expect(verifyOfferArithmetic(offer)).toEqual({ status: "consistent", issues: [] });
  });

  it("détecte une TVA et un TTC incohérents", () => {
    const offer: SupplierOffer = {
      supplierId: "X",
      lines: [{ id: "l1", kind: "main", designation: "Sable", quantity: Quantity.of(1, "T"), unitPrice: eur("50.00"), lineTotal: eur("50.00"), vatRate: new Decimal("0.20") }],
      printed: { totalHT: eur("50.00"), totalVAT: eur("11.00"), totalTTC: eur("60.00") },
    };
    const codes = verifyOfferArithmetic(offer).issues.map((i) => i.code);
    expect(codes).toEqual(["VAT_MISMATCH", "TOTAL_TTC_MISMATCH"]);
  });

  it("indique quand il n'y a rien à vérifier", () => {
    const offer: SupplierOffer = { supplierId: "X", lines: [{ id: "l1", kind: "info", designation: "Merci de votre confiance" }] };
    expect(verifyOfferArithmetic(offer).status).toBe("insufficient_data");
  });
});
