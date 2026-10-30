import { describe, expect, it } from "vitest";
import { cleDeLibelle, libelleAPartager, libelleGenerique, propositionsDeLibelles, rechercherLibelles, SEUIL_PROPOSITION, TOUT_LE_CATALOGUE, vocabulaireDuCatalogue, type LibelleConnu } from "../src/index.js";

/**
 * LES INTITULÉS ÉCRITS PAR LES ARTISANS (Greg, 30 octobre 2026, puis la nuit même : pas de diffusion automatique, une
 * bibliothèque de matériaux génériques) : un intitulé revient à son auteur seulement ; un intitulé générique écrit par
 * plusieurs entreprises devient une proposition pour l'admin ; un nom ou une référence ne l'est jamais.
 */
const vocabulaire = vocabulaireDuCatalogue(TOUT_LE_CATALOGUE);

describe("les intitulés écrits par les artisans", () => {
  it("un intitulé se garde tel qu'écrit, nombres compris ; une donnée personnelle ne se garde jamais", () => {
    expect(libelleAPartager("  Crochet gouttière   bandeau 25 ")).toBe("Crochet gouttière bandeau 25");
    expect(libelleAPartager("25")).toBeNull();
    expect(libelleAPartager("Gouttière pour M. Dupont 06 12 34 56 78")).toBeNull();
    expect(libelleAPartager("Livraison 12 rue de la Gare")).toBeNull();
    expect(cleDeLibelle("Crochet Gouttière bandeau 25")).toBe(cleDeLibelle("crochet gouttiere  bandeau 25"));
  });

  it("l'autocomplétion ne montre que les intitulés de l'entreprise qui tape, jamais ceux des autres", () => {
    const connus: LibelleConnu[] = [
      { libelle: "Crochet gouttière bandeau 25", unite: "pièces", entreprises: 12, mien: false },
      { libelle: "Crochet gouttière à visser", unite: "pièces", entreprises: 1, mien: true },
    ];
    expect(rechercherLibelles(connus, "crochet gout").map((l) => l.libelle)).toEqual(["Crochet gouttière à visser"]);
    expect(rechercherLibelles(connus, "bandeau")).toEqual([]);
  });

  it("générique : seulement des mots du catalogue, des nombres, des dimensions et des unités", () => {
    expect(libelleGenerique("Crochet gouttière bandeau 25", vocabulaire)).toBe(true);
    expect(libelleGenerique("Ardoise naturelle 32x22", vocabulaire)).toBe(true);
    expect(libelleGenerique("Crochets inox 110 mm", vocabulaire)).toBe(true);
    expect(libelleGenerique("Gouttière chantier Lebrun", vocabulaire)).toBe(false);
    expect(libelleGenerique("Ardoise ref CH-2026-114", vocabulaire)).toBe(false);
    expect(libelleGenerique("Zinc chantier Martin", vocabulaire)).toBe(false);
    expect(libelleGenerique("Ardoise Kerbrat", vocabulaire)).toBe(false);
    expect(libelleGenerique("25 40", vocabulaire)).toBe(false);
  });

  it(`une proposition pour l'admin : générique et écrite par ${SEUIL_PROPOSITION} entreprises au moins`, () => {
    const connus = [
      { libelle: "Crochet gouttière bandeau 25", unite: "pièces", entreprises: SEUIL_PROPOSITION },
      { libelle: "Crochet gouttière chevron 33", unite: "pièces", entreprises: SEUIL_PROPOSITION - 1 },
      { libelle: "Gouttière chantier Lebrun", unite: "m", entreprises: 9 },
    ];
    expect(propositionsDeLibelles(connus, vocabulaire).map((l) => l.libelle)).toEqual(["Crochet gouttière bandeau 25"]);
  });
});
