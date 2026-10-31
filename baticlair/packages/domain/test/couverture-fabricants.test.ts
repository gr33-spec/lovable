import { describe, expect, it } from "vitest";
import { rechercherAvecPrecisions, TOUT_LE_CATALOGUE } from "../src/index.js";
import { COUVERTURE_FABRICANTS } from "../src/catalogue/donnees/couverture-fabricants.js";

/**
 * COUVERTURE APPROFONDIE (Greg, 31 octobre 2026, soir : « un maximum de références : tuiles, ardoise naturelle, ardoise
 * synthétique, canal, plates »). Seules des références lues chez le fabricant : chaque article cite sa page ou son
 * document, et l'artisan les retrouve comme il les écrit.
 */
const premier = (q: string) => rechercherAvecPrecisions(TOUT_LE_CATALOGUE, q, 5)[0]?.article;

describe("les références des fabricants (couverture)", () => {
  it("chaque article est vérifié à une source du fabricant (lien et date), avec sa marque et sa référence", () => {
    expect(COUVERTURE_FABRICANTS.length).toBeGreaterThan(300);
    for (const a of COUVERTURE_FABRICANTS) {
      expect(a.statut, a.cle).toBe("verifie");
      expect(a.marque && a.reference, a.cle).toBeTruthy();
      expect(a.source?.url, a.cle).toMatch(/^https:\/\/(edilians\.com|www\.cedral\.world|www\.cupapizarras\.com)\//);
      expect(a.source?.verifieLe).toBe("2026-10-31");
      if (a.ean) expect(a.ean, a.cle).toMatch(/^\d{13}$/);
    }
    const cles = TOUT_LE_CATALOGUE.map((a) => a.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("une tuile se retrouve par son modèle et son coloris : la référence de sa fiche et l'EAN du coloris", () => {
    expect(premier("omega 10 ardoisé")).toMatchObject({ designation: "Tuile Oméga 10 Ste Foy, réf. 104 (Edilians) Ardoisé", reference: "104", ean: expect.stringMatching(/^3661223\d{6}$/) });
    expect(premier("pv13 rouge")).toMatchObject({ designation: "Tuile PV 13 Huguenot, réf. 215 (Edilians) Rouge" });
    expect(premier("tuile plate 17x27 phalempin")?.designation).toMatch(/^Tuile Plate 17×27 Phalempin, réf\. 500 \(Edilians\)/);
    expect(premier("canal 50 poudenx rouge")).toMatchObject({ designation: "Tuile canal 50 Poudenx, réf. 414 / 454 (Edilians) Rouge" });
  });

  it("ardoise fibres-ciment : le modèle Cedral, son format et son coloris ; ardoise naturelle : la carrière CUPA et le format", () => {
    expect(premier("kergoat 40x24")).toMatchObject({ designation: "Ardoise fibres-ciment Kergoat (Cedral) 40×24 bords droits · anthracite", marque: "Cedral" });
    expect(premier("ardoise synthétique orléane brun 60x30")?.designation).toBe("Ardoise fibres-ciment Orléane (Cedral) 60×30 bords droits · brun");
    expect(premier("cupa 4 32x22")).toMatchObject({ designation: "Ardoise naturelle CUPA 4 (Cupa Pizarras) 32×22", reference: "CUPA 4" });
    // Une carrière n'est jamais prise pour une autre ; un format absent n'est pas inventé.
    expect(premier("cupa 4 32x22")?.reference).not.toBe("CUPA 3");
    expect(rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "cupa 4 45x45", 5).some((t) => t.article.designation.includes("45×45"))).toBe(false);
  });
});
