import { describe, expect, it } from "vitest";
import { flecheDe, rentabilite, taux } from "../src/index.js";

/** Le tableau de bord admin (Greg, 24 octobre 2026) : une flèche verte ou rouge par rapport au mois précédent. */
describe("le tableau de bord", () => {
  it("la flèche dit le sens et la couleur selon ce qui est bon", () => {
    expect(flecheDe(112, 100)).toEqual({ sens: "haut", couleur: "vert", texte: "+12 %" });
    expect(flecheDe(97, 100)).toEqual({ sens: "bas", couleur: "rouge", texte: "−3 %" });
    // Le coût de l'IA : monter est mauvais.
    expect(flecheDe(30, 20, "bas")).toMatchObject({ couleur: "rouge", texte: "+50 %" });
    expect(flecheDe(5, 0)).toMatchObject({ texte: "nouveau" });
    expect(flecheDe(4, 4)).toMatchObject({ couleur: "gris", texte: "=" });
  });
  it("taux et rentabilité", () => {
    expect(taux(3, 8)).toBe(37.5);
    expect(taux(1, 0)).toBeNull();
    expect(rentabilite(290, 12.5, 40)).toBe(237.5);
  });
});
