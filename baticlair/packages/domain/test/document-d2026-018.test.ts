import { describe, expect, it } from "vitest";
import { applyRuleConfirmations } from "../src/index.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-10, capture « Ce que le fournisseur va recevoir » sur D-2026-018) et §50.7 : « Chaque ligne de
 * bacs ou de longueurs porte sa longueur (« 26 bacs de 7,20 m »), chaque pièce de zinc façonnée porte son nom d'ouvrage
 * (« Bande de rive », jamais « Bandes façonnées ») ».
 *  - Bacs : §36.6 « Nombre de bacs = largeur du pan ÷ entraxe (0,43 ou 0,58) arrondi sup. » ; longueur = rampant + 15 cm
 *    (réponse du fondateur, 2026-10-04 ; gardée le 2026-10-10) : 13 m en bobine 500 (zone 3) → 31 bacs de 7,15 m ; en
 *    bobine 650 (zone 1) → 23 bacs de 7,15 m.
 *  - Bandes commandées façonnées : §1 « bande de 2 m = ml / 2 arrondi sup. » : 13 ml → 7 longueurs, pas 8.
 *  - Pattes : une seule règle, le tableau VMZINC §36.2 (par m², selon le rampant ET la largeur de bobine) : 91 m² en 500 →
 *    519 + 173 ; en 650 → 383 + 128. Les deux chiffres vus venaient de deux largeurs (zone du chantier), pas de deux règles.
 */
type A = Record<string, { value: string; unit: string } | null>;
const u = (value: string) => ({ value, unit: "u" });
const list = (answers: A) => applyRuleConfirmations(readQuote(D2026_018_LINES, answers), answers);
const ordered: A = { "param:faconnage@couverture-zinc-joint-debout": u("2"), "param:developpe@bandes-zinc__3": { value: "20", unit: "cm" } };
const line = (v: ReturnType<typeof list>, re: RegExp) => v.toBuy.find((b) => re.test(b.label));

describe("D-2026-018 : le document dit les longueurs et le nom des pièces (§50.7)", () => {
  it("bacs commandés façonnés : « 31 bacs », longueur 7,15 m dans le nom (zone 3, bobine 500)", () => {
    const bacs = line(list(ordered), /^Bacs joint debout/);
    expect(bacs?.label).toBe("Bacs joint debout Quartz-Zinc 0,65 mm, longueur 7,15 m");
    expect(bacs?.quantity).toBe("31 bacs");
  });

  it("bobine 650 (zone 1) : 13 m ÷ 0,58 → 23 bacs de 7,15 m", () => {
    const bacs = line(list({ ...ordered, "param:zone": u("1") }), /^Bacs joint debout/);
    expect(bacs?.label).toMatch(/longueur 7,15 m$/);
    expect(bacs?.quantity).toBe("23 bacs");
  });

  it("une pièce de zinc porte son nom d'ouvrage, jamais « Bandes façonnées » ; 13 ml en longueurs de 2 m → 7", () => {
    const v = list(ordered);
    expect(v.toBuy.map((b) => b.label).filter((l) => /^Bandes façonnées/.test(l))).toEqual([]);
    const ventilation = line(v, /^Bande de ventilation en Z/);
    expect(ventilation?.quantity).toBe("7 longueurs de 2 m");
    // La rive façonnée par l'artisan (« comprend le pliage ») : des feuilles 2 × 1 m qui disent leur pièce.
    expect(line(v, /^Feuilles .*2 × 1 m/)?.label).toMatch(/pour habillage de rive/);
  });

  it("pattes : une seule règle (§36.2), le chiffre suit la largeur de bobine", () => {
    const at500 = list(ordered);
    expect(line(at500, /^Pattes coulissantes/)?.quantity).toBe("519 pièces");
    expect(line(at500, /^Pattes fixes/)?.quantity).toBe("173 pièces");
    const at650 = list({ ...ordered, "param:zone": u("1") });
    expect(line(at650, /^Pattes coulissantes/)?.quantity).toBe("383 pièces");
    expect(line(at650, /^Pattes fixes/)?.quantity).toBe("128 pièces");
  });
});
