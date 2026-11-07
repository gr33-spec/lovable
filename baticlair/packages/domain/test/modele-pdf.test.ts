import { describe, expect, it } from "vitest";
import { COULEURS_PDF, estCouleurPdf, estModelePdf, hexCouleurPdf, MODELE_PDF_DEFAUT, quantiteEtUnite } from "../src/index.js";

describe("modèles du PDF demande de prix (Greg, 31 octobre 2026)", () => {
  it("Classique par défaut, trois modèles, jaune Mobiiz par défaut", () => {
    expect(MODELE_PDF_DEFAUT).toBe("classique");
    expect(estModelePdf("detaille")).toBe(true);
    expect(estModelePdf("autre")).toBe(false);
    expect(hexCouleurPdf(null)).toBe("#FED206");
    expect(hexCouleurPdf("bleu")).toBe("#1D4ED8");
    expect(estCouleurPdf("#ff0000")).toBe(false);
    expect(COULEURS_PDF.length).toBeGreaterThanOrEqual(4);
  });

  it("sépare la quantité de son unité sans rien perdre", () => {
    expect(quantiteEtUnite("400 pièces")).toEqual({ quantite: "400", unite: "pièces" });
    expect(quantiteEtUnite("9 200 pièces, soit ≈ 12 palettes")).toEqual({ quantite: "9 200", unite: "pièces, soit ≈ 12 palettes" });
    expect(quantiteEtUnite("4 longueurs de 4 m (13 m à couvrir)")).toEqual({ quantite: "4", unite: "longueurs de 4 m (13 m à couvrir)" });
    expect(quantiteEtUnite("12,5 m²")).toEqual({ quantite: "12,5", unite: "m²" });
    expect(quantiteEtUnite("à préciser")).toEqual({ quantite: "à préciser", unite: "" });
    expect(quantiteEtUnite("3")).toEqual({ quantite: "3", unite: "" });
  });
});
