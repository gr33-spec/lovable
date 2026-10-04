import { describe, expect, it } from "vitest";
import { withoutLabour, writtenNumber } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";

/** « On veut juste des quantités de marchandises. Pas du tout de main d'œuvre. » (fondateur, 2026-10-04) */
describe("marchandise seule : jamais de pose dans ce que voit l'artisan ou le fournisseur", () => {
  it.each([
    ["Bande de ventilation en Z en zinc quartz (Fourniture et pose)", "Bande de ventilation en Z en zinc quartz"],
    ["Couverture zinc joint debout - Gris quartz (Fourniture et pose)", "Couverture zinc joint debout - Gris quartz"],
    ["Chatières de ventilation (Fourniture & Pose) - Fourniture et pose de tuiles chatières de ventilation adaptées au modèle HP10", "Chatières de ventilation - tuiles chatières de ventilation adaptées au modèle HP10"],
    ["Fourniture et pose de liteaux 27x40", "Liteaux 27x40"],
    ["Gouttière zinc demi-ronde (F&P)", "Gouttière zinc demi-ronde"],
    ["Velux GGL MK04, pose comprise", "Velux GGL MK04"],
    ["Écran sous-toiture HPV y compris pose", "Écran sous-toiture HPV"],
    ["Pose d'un abergement zinc", "Abergement zinc"],
    ["Ardoises naturelles 30x22 posées au crochet", "Ardoises naturelles 30x22 posées au crochet"],
  ])("« %s » → « %s »", (avant, apres) => {
    expect(withoutLabour(avant)).toBe(apres);
  });

  it("D-2026-015 : aucune ligne de la liste ne parle de pose", () => {
    const v = readQuote(D2026_015_LINES, { "product:tuile": "edilians-hp10-huguenot" });
    for (const label of [...v.toBuy.map((b) => b.label), ...v.toQuote.map((q) => q.label)]) expect(label).not.toMatch(/\bpose\b|F\s*&\s*P/i);
  });
});

/** « Erreur aussi de voir des 000 dans les unités » (fondateur, 2026-10-04) : « 30,000 » imprimé par le devis se lit « 30 ». */
describe("quantité recopiée du devis : sans zéros inutiles", () => {
  it.each([
    ["30,000", "30"],
    ["530,000", "530"],
    ["3,500", "3,5"],
    ["12,75", "12,75"],
    ["1 200,00", "1 200"],
    ["30.00", "30"],
    ["1.200", "1.200"],
    ["42", "42"],
    ["env. 30", "env. 30"],
  ])("%s → %s", (raw, expected) => expect(writtenNumber(raw)).toBe(expected));

  it("la liste montre « 30 pièces », jamais « 30,000 pièces »", () => {
    const v = readQuote([
      { ref: "1", designation: "Trappe d'accès isolée 60 x 60", quantity: "30,000", unit: "u" },
      { ref: "2", designation: "Bande armée pour angles saillants", quantity: "530,000", unit: "ml" },
    ]);
    const shown = JSON.stringify(v);
    expect(shown).toContain('"30 pièces"');
    expect(shown).toContain('"530 ml"');
    expect(shown).not.toMatch(/\d,0+\b/);
  });
});
