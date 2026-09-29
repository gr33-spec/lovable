import { describe, expect, it } from "vitest";
import { compareOffers, Money, Quantity, type ComparisonInput, type Finding } from "../src/index.js";
import { dupontInput } from "./fixtures/dupont.js";

const result = compareOffers(dupontInput);
const supplier = (id: string) => result.suppliers.find((s) => s.supplierId === id)!;
const item = (itemId: string, supplierId: string) =>
  result.items.find((i) => i.itemId === itemId)!.offers.find((o) => o.supplierId === supplierId)!;
const findings = (code: Finding["code"], supplierId?: string) =>
  result.findings.filter((f) => f.code === code && (supplierId === undefined || f.supplierId === supplierId));
const money = (m: Money | null | undefined) => m?.toString();

describe("compareOffers — chantier Dupont", () => {
  it("calcule les totaux fournisseur (faits) et comparables (estimations)", () => {
    expect(money(supplier("A").computedTotalHT)).toBe("4897.40 EUR");
    expect(money(supplier("A").comparableTotalHT)).toBe("4897.40 EUR");
    expect(supplier("A").comparability).toBe("complete");

    expect(money(supplier("B").computedTotalHT)).toBe("4282.80 EUR");
    expect(money(supplier("B").comparableTotalHT)).toBe("4984.95 EUR");
    expect(money(supplier("B").estimatedPartHT)).toBe("702.15 EUR");
    expect(supplier("B").comparability).toBe("estimated");

    expect(money(supplier("C").computedTotalHT)).toBe("5093.50 EUR");
    expect(money(supplier("C").comparableTotalHT)).toBe("5036.71 EUR");
    expect(supplier("C").comparability).toBe("provisional");
  });

  it("n'annonce jamais l'offre incomplète comme la moins chère (§52)", () => {
    const [warning] = findings("LOWEST_TOTAL_NOT_COMPARABLE");
    expect(warning).toMatchObject({ supplierId: "B", otherSupplierId: "A", count: 2, nature: "WARNING" });
    expect(money(warning!.amount)).toBe("614.60 EUR");
    // C'est le constat le plus prioritaire de la synthèse.
    expect(result.findings[0]!.code).toBe("LOWEST_TOTAL_NOT_COMPARABLE");
  });

  it("présente les manquants comme une inférence, avec leur estimation", () => {
    const [missing] = findings("ITEMS_MISSING", "B");
    expect(missing).toMatchObject({ nature: "INFERENCE", count: 2, itemIds: ["liteaux", "rive"] });
    // Médiane des autres fournisseurs : liteaux (399 + 366,66)/2, rive (336 + 302,64)/2
    expect(money(item("liteaux", "B").estimatedAmount?.roundToCents())).toBe("382.83 EUR");
    expect(money(item("rive", "B").estimatedAmount?.roundToCents())).toBe("319.32 EUR");
  });

  it("recommande l'offre la moins chère seulement si elle est complète", () => {
    const [best] = findings("BEST_COMPARABLE_OFFER");
    expect(best).toMatchObject({ supplierId: "A", otherSupplierId: "B", nature: "RECOMMENDATION" });
    expect(money(best!.amount)).toBe("87.55 EUR");
  });

  it("ramène le conditionnement à la quantité demandée sans perdre le facturé", () => {
    const ecranA = item("ecran", "A");
    expect(ecranA.offeredQuantity?.toString()).toBe("94 M2");
    expect(money(ecranA.billedAmount)).toBe("197.40 EUR");
    expect(money(ecranA.normalizedAmount)).toBe("191.10 EUR");
    expect(ecranA.flags).toContain("QUANTITY_HIGHER");

    const crochetsB = item("crochets", "B");
    expect(crochetsB.offeredQuantity?.toString()).toBe("500 U");
    expect(money(crochetsB.normalizedAmount)).toBe("77.00 EUR");
  });

  it("compte le conditionnement entier dans le coût pour couvrir le besoin (PD-011)", () => {
    // Rouleaux : 94 m² payés pour 91 demandés → coût réel 197,40, prix ramené 191,10
    expect(money(item("ecran", "A").comparableAmount)).toBe("197.40 EUR");
    expect(money(item("ecran", "A").normalizedAmount)).toBe("191.10 EUR");
    // Boîte de 500 crochets pour 350 demandés → la boîte entière (110) est payée
    expect(money(item("crochets", "B").comparableAmount)).toBe("110.00 EUR");
    // Quantité proposée insuffisante : on complète au prix du fournisseur
    expect(money(item("liteaux", "C").comparableAmount?.roundToCents())).toBe("366.66 EUR");
  });

  it("répartit la remise globale et signale une quantité inférieure", () => {
    const liteauxC = item("liteaux", "C");
    expect(liteauxC.flags).toContain("QUANTITY_LOWER");
    expect(money(liteauxC.billedAmount)).toBe("349.20 EUR");
    expect(money(liteauxC.normalizedAmount?.roundToCents())).toBe("366.66 EUR");
  });

  it("n'additionne ni variante ni option, et explique le total imprimé de C", () => {
    expect(findings("VARIANT_AVAILABLE", "B")[0]).toMatchObject({ lineIds: ["b5"] });
    expect(findings("OPTION_PRESENT", "C")[0]).toMatchObject({ lineIds: ["c7"] });
    const [explained] = findings("PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES", "C");
    expect(explained).toMatchObject({ lineIds: ["c7"], nature: "INFERENCE" });
    expect(money(explained!.amount)).toBe("360.00 EUR");
  });

  it("distingue substitution, correspondance incertaine, frais, consigne et lignes non demandées", () => {
    expect(findings("SUBSTITUTION_PROPOSED", "C")[0]).toMatchObject({ itemIds: ["ecran"] });
    expect(findings("UNCERTAIN_MATCH", "C")[0]).toMatchObject({ itemIds: ["faitage"] });
    expect(money(findings("DELIVERY_FEE", "C")[0]!.amount)).toBe("145.00 EUR");
    expect(findings("DELIVERY_FEE", "B")).toHaveLength(0);
    expect(findings("DELIVERY_NOT_SPECIFIED")).toHaveLength(0);
    expect(money(supplier("C").depositsHT)).toBe("50.00 EUR");
    expect(findings("EXTRA_LINES", "C")[0]).toMatchObject({ lineIds: ["c10"], count: 1 });
    expect(money(supplier("C").extrasHT)).toBe("24.25 EUR");
  });

  it("convertit m → ml pour le faîtage", () => {
    expect(item("faitage", "C").offeredQuantity?.toString()).toBe("18 ML");
    expect(item("faitage", "C").flags).not.toContain("UNIT_NOT_COMPARABLE");
  });

  it("calcule les écarts par famille sur les seuls besoins communs", () => {
    const gaps = findings("CATEGORY_PRICE_GAP").filter((f) => f.category === "Faîtage");
    expect(gaps.map((g) => `${g.supplierId}<${g.otherSupplierId}`).sort()).toEqual(["B<A", "B<C"]);
    const vsA = gaps.find((g) => g.otherSupplierId === "A")!;
    expect(money(vsA.amount)).toBe("81.00 EUR");
    expect(vsA.ratio?.toString()).toBe("0.209");
  });

  it("est déterministe", () => {
    expect(JSON.stringify(compareOffers(dupontInput))).toBe(JSON.stringify(result));
  });
});

describe("compareOffers — cas limites", () => {
  const base: ComparisonInput = {
    items: [
      { id: "i1", designation: "Bardage", quantity: Quantity.of(85, "M2") },
      { id: "i2", designation: "Vis", quantity: Quantity.of(1000, "U") },
    ],
    offers: [
      { supplierId: "X", deliveryIncluded: true, lines: [{ id: "x1", kind: "main", designation: "Bardage", quantity: Quantity.of(85, "U"), unitPrice: Money.of(30), lineTotal: Money.of(2550) }] },
      { supplierId: "Y", lines: [{ id: "y1", kind: "main", designation: "Lame bardage", quantity: Quantity.of(85, "M2"), unitPrice: Money.of(28), lineTotal: Money.of(2380) }] },
    ],
    matches: [
      { itemId: "i1", supplierId: "X", lineIds: ["x1"], score: 0.95, status: "proposed" },
      { itemId: "i1", supplierId: "Y", lineIds: ["y1"], score: 0.95, status: "proposed" },
    ],
  };
  const r = compareOffers(base);

  it("ne convertit pas m² ↔ unités et le signale", () => {
    const x = r.items[0]!.offers.find((o) => o.supplierId === "X")!;
    expect(x.flags).toContain("UNIT_NOT_COMPARABLE");
    expect(r.findings.some((f) => f.code === "UNIT_NOT_COMPARABLE" && f.supplierId === "X")).toBe(true);
  });

  it("exclut de la base commune un besoin que personne n'a chiffré", () => {
    expect(r.findings.find((f) => f.code === "ITEM_NOT_QUOTED_BY_ANYONE")).toMatchObject({ itemIds: ["i2"] });
    expect(r.suppliers.every((s) => s.comparability !== "incomplete")).toBe(true);
    expect(r.suppliers.find((s) => s.supplierId === "Y")!.comparableTotalHT?.toString()).toBe("2380.00 EUR");
  });

  it("avertit quand la livraison n'est pas précisée", () => {
    expect(r.findings.filter((f) => f.code === "DELIVERY_NOT_SPECIFIED").map((f) => f.supplierId)).toEqual(["Y"]);
  });

  it("ne recommande rien sur la seule base d'estimations", () => {
    const input: ComparisonInput = {
      items: [
        { id: "i1", designation: "Tuile", quantity: Quantity.of(100, "U") },
        { id: "i2", designation: "Faîtière", quantity: Quantity.of(10, "U") },
      ],
      offers: [
        { supplierId: "P", deliveryIncluded: true, lines: [{ id: "p1", kind: "main", designation: "Tuile", quantity: Quantity.of(100, "U"), lineTotal: Money.of(100) }] },
        { supplierId: "Q", deliveryIncluded: true, lines: [
          { id: "q1", kind: "main", designation: "Tuile", quantity: Quantity.of(100, "U"), lineTotal: Money.of(150) },
          { id: "q2", kind: "main", designation: "Faîtière", quantity: Quantity.of(10, "U"), lineTotal: Money.of(100) },
        ] },
      ],
      matches: [
        { itemId: "i1", supplierId: "P", lineIds: ["p1"], score: 1, status: "confirmed" },
        { itemId: "i1", supplierId: "Q", lineIds: ["q1"], score: 1, status: "confirmed" },
        { itemId: "i2", supplierId: "Q", lineIds: ["q2"], score: 1, status: "confirmed" },
      ],
    };
    const out = compareOffers(input);
    // P : 100 + 100 estimés = 200 < Q : 250, mais P est incomplet → pas de recommandation.
    expect(out.suppliers.find((s) => s.supplierId === "P")!.comparableTotalHT?.toString()).toBe("200.00 EUR");
    expect(out.findings.some((f) => f.code === "BEST_COMPARABLE_OFFER")).toBe(false);
    expect(out.findings.some((f) => f.code === "LOWEST_TOTAL_NOT_COMPARABLE" && f.supplierId === "P")).toBe(true);
  });

  it("traite une correspondance confirmée par l'utilisateur comme certaine", () => {
    const input: ComparisonInput = {
      ...base,
      matches: [{ itemId: "i1", supplierId: "Y", lineIds: ["y1"], score: 0.3, status: "confirmed" }],
    };
    const y = compareOffers(input).items[0]!.offers.find((o) => o.supplierId === "Y")!;
    expect(y.confidence).toBe("certain");
  });

  it("gère plusieurs variantes, même additionnées par erreur au total imprimé", () => {
    const input: ComparisonInput = {
      items: [{ id: "i1", designation: "Tuile", quantity: Quantity.of(100, "U") }],
      offers: [{
        supplierId: "W",
        deliveryIncluded: true,
        lines: [
          { id: "w1", kind: "main", designation: "Tuile gamme A", quantity: Quantity.of(100, "U"), lineTotal: Money.of(200) },
          { id: "w2", kind: "variant", designation: "Variante gamme B", quantity: Quantity.of(100, "U"), lineTotal: Money.of(150), relatesToLineIds: ["w1"] },
          { id: "w3", kind: "variant", designation: "Variante gamme C", quantity: Quantity.of(100, "U"), lineTotal: Money.of(260), relatesToLineIds: ["w1"] },
        ],
        // 200 + 150 + 260 : les deux variantes ont été additionnées
        printed: { totalHT: Money.of(610) },
      }],
      matches: [{ itemId: "i1", supplierId: "W", lineIds: ["w1"], score: 0.95, status: "proposed" }],
    };
    const out = compareOffers(input);
    const w = out.suppliers[0]!;
    expect(w.computedTotalHT.toString()).toBe("200.00 EUR");
    expect(w.comparableTotalHT?.toString()).toBe("200.00 EUR");
    expect(out.findings.filter((f) => f.code === "VARIANT_AVAILABLE").map((f) => f.lineIds)).toEqual([["w2"], ["w3"]]);
    expect(out.findings.find((f) => f.code === "PRINTED_TOTAL_INCLUDES_NON_COUNTED_LINES")).toMatchObject({ lineIds: ["w2", "w3"] });
  });

  it("garde un besoin présent uniquement en variante comme manquant", () => {
    const input: ComparisonInput = {
      items: [{ id: "i1", designation: "Ardoise", quantity: Quantity.of(10, "M2") }],
      offers: [{ supplierId: "V", deliveryIncluded: true, lines: [{ id: "v1", kind: "variant", designation: "Ardoise B", quantity: Quantity.of(10, "M2"), lineTotal: Money.of(300) }] }],
      matches: [{ itemId: "i1", supplierId: "V", lineIds: ["v1"], score: 0.9, status: "proposed" }],
    };
    const v = compareOffers(input).items[0]!.offers[0]!;
    expect(v.status).toBe("missing");
    expect(v.flags).toContain("ONLY_AS_VARIANT");
  });
});
