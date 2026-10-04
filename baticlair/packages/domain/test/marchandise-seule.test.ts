import { describe, expect, it } from "vitest";
import { withoutLabour } from "../src/index.js";
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
