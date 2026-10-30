import { describe, expect, it } from "vitest";
import { cleDeLibelle, libelleAPartager, rechercherLibelles, SEUIL_PARTAGE, type LibelleConnu } from "../src/index.js";

/**
 * LES LIGNES ÉCRITES PAR LES ARTISANS ENRICHISSENT LES SUGGESTIONS (Greg, 30 octobre 2026, « Écris ta liste ») : un
 * intitulé écrit par une entreprise lui revient ; écrit par deux entreprises, il est proposé à tous ; rien de personnel.
 */
describe("les intitulés écrits par les artisans", () => {
  it("un intitulé se garde tel qu'écrit, nombres compris ; une donnée personnelle ne se garde jamais", () => {
    expect(libelleAPartager("  Crochet gouttière   bandeau 25 ")).toBe("Crochet gouttière bandeau 25");
    expect(libelleAPartager("Ardoise naturelle 32×22")).toBe("Ardoise naturelle 32×22");
    expect(libelleAPartager("25")).toBeNull();
    expect(libelleAPartager("ab")).toBeNull();
    expect(libelleAPartager("Gouttière pour M. Dupont 06 12 34 56 78")).toBeNull();
    expect(libelleAPartager("Livraison 12 rue de la Gare")).toBeNull();
    expect(cleDeLibelle("Crochet Gouttière bandeau 25")).toBe(cleDeLibelle("crochet gouttiere  bandeau 25"));
  });

  it(`proposé à tous dès ${SEUIL_PARTAGE} entreprises, à son auteur dès la première fois`, () => {
    const connus: LibelleConnu[] = [
      { libelle: "Crochet gouttière bandeau 25", unite: "pièces", entreprises: 2, mien: false },
      { libelle: "Crochet gouttière chevron 33", unite: "pièces", entreprises: 1, mien: false },
      { libelle: "Crochet gouttière à visser", unite: "pièces", entreprises: 1, mien: true },
    ];
    expect(rechercherLibelles(connus, "crochet gout").map((l) => l.libelle).sort()).toEqual(["Crochet gouttière bandeau 25", "Crochet gouttière à visser"]);
    expect(rechercherLibelles(connus, "bandeau").map((l) => l.libelle)).toEqual(["Crochet gouttière bandeau 25"]);
    expect(rechercherLibelles(connus, "chevron")).toEqual([]);
  });
});
