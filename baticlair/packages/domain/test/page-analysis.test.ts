import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXTRACTION_POLICY,
  estimateDocumentCost,
  estimateImageTokens,
  numberLines,
  priceTableByVersion,
  ROOFING_PROFILE,
  routePage,
  type PageInput,
} from "../src/index.js";

const A4 = { widthPt: 595, heightPt: 842 };
const page = (n: number, lines: string[]): PageInput => ({ pageNumber: n, lines, ...A4 });

const devisPage = page(2, [
  "Réf. Désignation Qté U P.U. HT Total HT",
  "TUI-RS12 Tuile Romane Canal rouge 12,5 u/m² 1 250 u 1,12 1 400,00",
  "FAI-R Faîtière ronde à emboîtement 42 u 4,85 203,70",
  "LIT-2738 Liteau sapin traité classe 2 27x38 480 ml 0,62 297,60",
  "ECR-HPV Écran sous-toiture HPV 1,5x50 m 4 rouleau 89,00 356,00",
  "CRO-INOX Crochet inox ardoise 100 mm 2 paquet 18,40 36,80",
  "Total HT 2 294,10 TVA 10 % 229,41 Total TTC 2 523,51",
]);

describe("routage des pages (couverture)", () => {
  it("lit en texte une page de devis propre", () => {
    const r = routePage(devisPage, ROOFING_PROFILE);
    expect(r.route).toBe("text");
    expect(r.metrics.amounts).toBeGreaterThanOrEqual(5);
    expect(r.metrics.units).toBeGreaterThanOrEqual(3);
    expect(r.metrics.materialHits).toBeGreaterThanOrEqual(4);
  });

  it("envoie en image une page sans texte (scan)", () => {
    expect(routePage(page(1, []), ROOFING_PROFILE)).toMatchObject({ route: "vision", reason: "no_text_layer" });
  });

  it("envoie en image une page scannée qui n'a qu'un en-tête en texte", () => {
    expect(routePage(page(3, ["DEVIS N° 2026-118", "Page 3/5"]), ROOFING_PROFILE)).toMatchObject({
      route: "vision",
      reason: "too_little_text",
    });
  });

  it("envoie en image un texte illisible plutôt que de risquer une erreur", () => {
    const garbled = page(4, [Array(60).fill("��\u0001 12").join(" ")]);
    expect(routePage(garbled, ROOFING_PROFILE)).toMatchObject({ route: "vision", reason: "garbled_text" });
  });

  it("garde en texte une courte page de totaux", () => {
    expect(routePage(page(5, ["Total HT 12 450,00", "TVA 10 % 1 245,00", "Total TTC 13 695,00"]), ROOFING_PROFILE).route).toBe("text");
  });

  it("écarte les conditions générales sans montant", () => {
    const cgv = page(6, [
      "CONDITIONS GÉNÉRALES DE VENTE",
      "Article 1 – Objet. Les présentes conditions générales s'appliquent à toutes les ventes conclues par la société.",
      "Article 2 – Clause de réserve de propriété : les marchandises restent la propriété du vendeur jusqu'au paiement intégral.",
      "En cas de litige, le tribunal de commerce du siège du vendeur est seul compétent.",
    ]);
    expect(routePage(cgv, ROOFING_PROFILE)).toMatchObject({ route: "skip", reason: "boilerplate" });
  });

  it("n'écarte PAS des conditions générales qui contiennent des montants", () => {
    const mixed = page(7, [
      "Conditions générales de vente – article 1 : frais de livraison",
      "Livraison sur chantier forfait 85,00 € HT, déchargement grue 120,00 € HT.",
      "Article 2 – réserve de propriété jusqu'au paiement intégral. ".repeat(3),
    ]);
    expect(routePage(mixed, ROOFING_PROFILE).route).toBe("text");
  });
});

describe("numérotation des lignes", () => {
  it("donne des références stables page:ligne en ignorant les lignes vides", () => {
    const lines = numberLines(page(2, ["A", "", "  B  "]));
    expect(lines.map((l) => [l.ref, l.text])).toEqual([["2:001", "A"], ["2:002", "B"]]);
  });
});

describe("estimation du coût avant appel", () => {
  const table = priceTableByVersion("anthropic-2026-09-30");

  it("compte une page A4 rendue à 1568 px comme le fournisseur", () => {
    // 1108×1568 px → ceil(1108/28) × ceil(1568/28) = 40 × 56
    expect(estimateImageTokens(595, 842, 1568)).toBe(2240);
  });

  it("sépare pages en texte, en image et écartées", () => {
    const est = estimateDocumentCost(
      [
        { route: "text", chars: 3000, ...A4 },
        { route: "text", chars: 3000, ...A4 },
        { route: "vision", chars: 0, ...A4 },
        { route: "skip", chars: 2500, ...A4 },
      ],
      DEFAULT_EXTRACTION_POLICY,
      table,
    );
    expect(est).toMatchObject({ pagesText: 2, pagesVision: 1, pagesSkipped: 1 });
    expect(est.calls).toHaveLength(2);
    const text = est.calls[0]!;
    expect(text.inputTokens).toBe(2000 + 2 * 1000);
    expect(text.outputTokens).toBe(2 * 600 + 500);
    // 4000 × 2 + 1700 × 10 = 25 000 micro-dollars
    expect(text.microUsd).toBe(25_000);
    expect(est.totalMicroUsd).toBe(est.calls.reduce((s, c) => s + c.microUsd, 0));
  });
});
