import { describe, expect, it } from "vitest";
import { rechercherAvecPrecisions, requeteAPlat, TOUT_LE_CATALOGUE } from "../src/index.js";

/**
 * LE CATALOGUE MÉTIER (Greg, 31 octobre 2026 : « un couvreur écrit H14 rouge, il retrouve la bonne tuile ; il écrit
 * liteau, il retrouve les sections utiles ; un peintre décrit sa peinture, Mobiiz comprend »). Les cas de son message.
 */
const chercher = (q: string, max = 8) => rechercherAvecPrecisions(TOUT_LE_CATALOGUE, q, max);
const noms = (q: string, max = 8) => chercher(q, max).map((t) => t.article.designation);

describe("le moteur de recherche métier", () => {
  it("les dimensions s'écrivent de toutes les façons", () => {
    for (const q of ["liteau 18x40", "liteau 18 x 40", "liteau 18/40", "liteau 18*40", "liteau 18×40", "liteau 18 40", "18 40"]) expect(requeteAPlat(q).split(" ")).toContain("18x40");
  });

  it("« liteau » : les sections du référentiel d'abord (18×40, 14×40) ; « liteau 18x40 » : la 18×40 seulement, jamais une 18×50", () => {
    expect(noms("liteau", 3)).toEqual(["Liteau 18×40 · sapin traité classe 2", "Liteau 14×40 · sapin traité classe 2", "Liteau 27×40 · sapin traité classe 2"]);
    for (const q of ["liteau 18x40", "18 40", "liteaux 18/40"]) expect(noms(q)).toEqual(["Liteau 18×40 · sapin traité classe 2"]);
    expect(noms("liteau 14x40")).toEqual(["Liteau 14×40 · sapin traité classe 2"]);
    expect(chercher("liteau 18x40")[0]!.article).toMatchObject({ statut: "generique", source: { libelle: "Référentiel couverture du fondateur, §200 et §760" } });
  });

  it("« H14 rouge » : la H 14 Huguenot (Edilians, réf. 204) en coloris Rouge, avec son EAN ; jamais une HP10 ; « HP10 » : la HP 10", () => {
    // Couverture approfondie (Greg, 31 octobre 2026, soir) : les coloris publiés sur la fiche Edilians sont au catalogue.
    const h14 = chercher("H14 rouge");
    expect(h14[0]).toMatchObject({ precisions: [], article: { designation: "Tuile H 14 Huguenot, réf. 204 (Edilians) Rouge", marque: "Edilians", reference: "204", ean: "3661223024425", statut: "verifie" } });
    expect(h14.every((t) => t.article.designation.startsWith("Tuile H 14 Huguenot"))).toBe(true);
    // Sans coloris au catalogue, la couleur reste en précision (« H14 bleu » : la H 14, « bleu » gardé).
    expect(chercher("H14 bleu")[0]).toMatchObject({ precisions: ["bleu"], article: { designation: "Tuile H 14 Huguenot, réf. 204 (Edilians)", source: { url: "https://edilians.eu/h-14-huguenot.html" } } });
    for (const q of ["HP10", "hp 10"]) {
      expect(noms(q)[0]).toBe("Tuile HP 10 Huguenot, réf. 205 (Edilians)");
      expect(noms(q).every((n) => n.startsWith("Tuile HP 10 Huguenot"))).toBe(true);
    }
    expect(noms("h14", 30).some((n) => n.includes("HP 10"))).toBe(false);
  });

  it("« tuile » : les vrais modèles d'abord, puis les désignations génériques", () => {
    const n = noms("tuile", 30);
    expect(n.indexOf("Tuile H 14 Huguenot, réf. 204 (Edilians)")).toBeGreaterThanOrEqual(0);
    expect(n.indexOf("Tuile HP 10 Huguenot, réf. 205 (Edilians)")).toBeGreaterThanOrEqual(0);
  });

  it("« crochet gouttière » : les crochets de gouttière, à préciser par développé et matière", () => {
    const n = noms("crochet gouttière", 10);
    expect(n.length).toBeGreaterThan(1);
    expect(n.every((d) => d.startsWith("Crochet de gouttière"))).toBe(true);
  });

  it("« peinture blanche mate professionnelle » : la peinture blanc mat, « professionnelle » gardé en précision ; rien de redemandé", () => {
    const t = chercher("peinture blanche mate professionnelle");
    expect(t[0]!.article.produit).toBe("Peinture acrylique blanc mat");
    expect(t[0]!.precisions).toEqual(["professionnelle"]);
    expect(chercher("peinture blanche mate pro")[0]!.article.produit).toBe("Peinture acrylique blanc mat");
  });

  it("une couleur seule ne désigne rien ; un mot inconnu écarte (la saisie libre prend le relais)", () => {
    expect(chercher("rouge")).toEqual([]);
    expect(chercher("tuile XYZ123")).toEqual([]);
  });
});
