import { describe, expect, it } from "vitest";
import { MENTION_RATIOS, REFERENTIALS, ratiosEnValidation } from "../src/index.js";

/**
 * §52 (décision du 11 octobre) : « Tant que le référentiel d'un métier n'a pas été relu par un artisan de ce métier, le
 * métier porte dans l'app la mention « ratios en cours de validation » sur l'écran 3 et dans le PDF fournisseur. »
 * Retour du fondateur (2026-10-12) : « pour tout métier pas encore relu par un artisan (électricité, maçonnerie,
 * carrelage) ; pas sur la couverture. »
 */
describe("§52 : « Ratios en cours de validation » pour un métier pas encore relu", () => {
  it("électricité, maçonnerie, carrelage la portent ; la couverture et l'étanchéité (référentiel du fondateur), non", () => {
    expect(MENTION_RATIOS).toBe("Ratios en cours de validation");
    for (const t of ["electrical", "masonry", "tiling", "electricite", "maconnerie", "Carrelage"]) expect(ratiosEnValidation(t), t).toBe(true);
    for (const t of ["roofing", "couverture", "waterproofing", "etancheite", "roofing,drywall"]) expect(ratiosEnValidation(t), t).toBe(false);
  });

  it("tout autre tiroir la porte tant qu'un artisan ne l'a pas relu", () => {
    const relus = REFERENTIALS.filter((r) => !ratiosEnValidation(r.trade)).map((r) => r.trade);
    expect(relus.sort()).toEqual(["roofing", "waterproofing"]);
  });
});
