import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, isPrestationPhrase, isWithoutSupplyUnit, MAX_REASON_WORDS, subjectOf, withShortReasons, wordCount, type QuoteLineReading } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { D2026_105_LINES, D2026_105_READINGS } from "./devis-reels/d2026-105.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * §50 « Ce que voit l'artisan » (fondateur, 2026-10-09), écran 3 : une carte par fourniture. Si orange, la raison en
 * CINQ MOTS AU PLUS (« Modèle et teinte à préciser », « Devis 20, calcul 21 »), jamais le préfixe « Info manquante : »
 * (§50.4) ; rien de tout ça si la ligne est verte. §50.5 : chaque ligne a un nom qu'on dit au comptoir, une quantité,
 * une unité commandable ; jamais une phrase de prestation, jamais des heures ou un forfait, jamais des m² ou des ml (sauf
 * bande et bobineau, vendus au mètre ; retour du fondateur, 2026-10-10).
 */
const DEVIS: [string, QuoteLineInput[], ReadonlyMap<string, QuoteLineReading> | undefined][] = [
  ["D-2026-020", D2026_020_LINES, undefined],
  ["D-2026-018", D2026_018_LINES, undefined],
  ["D.2026.105", D2026_105_LINES, D2026_105_READINGS],
];
const screen = (lines: QuoteLineInput[], readings?: ReadonlyMap<string, QuoteLineReading>) =>
  withShortReasons(applyRuleConfirmations(readQuote(lines, {}, [], undefined, { acceptDraft: true }, readings), {}));

describe("§50.3 la carte d'une ligne : la raison orange en cinq mots au plus, rien sur une ligne verte", () => {
  for (const [name, lines, readings] of DEVIS) {
    it(`${name} : chaque raison orange tient en ${MAX_REASON_WORDS} mots, sans « Info manquante », et aucune ligne verte n'en a`, () => {
      const rows = screen(lines, readings).screen.groups.flatMap((g) => g.rows);
      expect(rows.some((r) => r.status === "check")).toBe(true);
      for (const r of rows) {
        if (r.status !== "check") expect(r.reason, r.key).toBeUndefined();
        else {
          expect(r.reason, r.key).toBeTruthy();
          expect(wordCount(r.reason!), r.reason).toBeLessThanOrEqual(MAX_REASON_WORDS);
          expect(r.reason).not.toMatch(/info manquante/i);
        }
      }
    });

    it(`${name} : §50.5, un nom de comptoir, jamais une phrase de prestation, jamais des heures ni un forfait`, () => {
      const p = screen(lines, readings);
      for (const b of p.toBuy) {
        expect(isPrestationPhrase(b.label), b.label).toBe(false);
        expect(isWithoutSupplyUnit(b.order?.unit), b.label).toBe(false);
        // Retour du fondateur (2026-10-10) : aucune ligne en m² ou en ml, sauf les articles vendus au mètre (bande,
        // bobineau) ; une surface se convertit en pièces (§49.2 : « Ardoises 32×22 · 2 100 pièces »).
        // Les articles vendus à la surface par le négoce (§40 : voliges, écran, membrane, isolant, panneaux) gardent leur m².
        const soldBySurface = /\b(voliges?|voligeage|[ée]cran|membranes?|isolants?|panneaux?|pare-pluie)\b/i.test(b.label);
        if (!/\b(bandes?|bobine|bobineau|bobines)\b/i.test(b.label) && !(soldBySurface && /^(m2|m²)$/i.test(b.order?.unit ?? ""))) {
          expect(b.order?.unit ?? "", b.label).not.toMatch(/^(m2|m²|ml|m|mètres?)$/i);
        }
      }
    });
  }

  it("D.2026.105 : « Modèle et teinte à préciser » sur la tuile, « Élément de rive à préciser » sur les fixations", () => {
    const p = screen(D2026_105_LINES, D2026_105_READINGS);
    const reasons = p.screen.groups.flatMap((g) => g.rows).map((r) => [p.toBuy.find((b) => b.key === r.itemKey)?.label, r.reason]);
    expect(reasons).toEqual([
      ["Tuile terre cuite mécanique", "Modèle et teinte à préciser"],
      ["Fixations pour l'élément de rive", "Élément de rive à préciser"],
    ]);
  });

  it("le sujet d'une donnée manquante, dit court : le mot qui compte, jamais un mot creux", () => {
    expect(subjectOf("Info manquante : développé de la gouttière (25, 28, 33, 40)")).toBe("Développé");
    expect(subjectOf("type d'élément de rive")).toBe("Élément de rive");
    expect(subjectOf("Modèle et teinte de tuile")).toBe("Modèle et teinte");
    expect(subjectOf("Quel diamètre ?")).toBe("Diamètre");
  });
});
