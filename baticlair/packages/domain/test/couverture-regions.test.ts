import { describe, expect, it } from "vitest";
import { departementDeLAdresse, REGIONS_COUVERTURE, regionDuDepartement, rechercherAvecPrecisions, TOUT_LE_CATALOGUE } from "../src/index.js";
import { COUVERTURE_REGIONS } from "../src/catalogue/donnees/couverture-regions.js";

/**
 * LA COUVERTURE RÉGION PAR RÉGION (Greg, 31 octobre 2026, soir : « il y a des différences entre régions ; il faut aussi
 * les voliges, tous les liteaux ») : le support bois du référentiel (§27, §36), les couvertures propres à chaque région
 * (§26.2, §26.3), et la recherche qui propose d'abord, à score égal, les matériaux de la région de l'entreprise.
 */
const produits = new Set(TOUT_LE_CATALOGUE.map((a) => a.produit));

describe("la couverture région par région", () => {
  it("chaque article ajouté cite sa section du référentiel ; chaque matériau dominant d'une région existe au catalogue", () => {
    for (const a of COUVERTURE_REGIONS) expect(a.source?.libelle, a.cle).toMatch(/^Référentiel couverture du fondateur, §/);
    for (const r of REGIONS_COUVERTURE) for (const p of r.dominants) expect(produits.has(p), `${r.code} : ${p}`).toBe(true);
  });

  it("chaque département de métropole a sa région, une seule", () => {
    const deps = [...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, "0")).filter((d) => d !== "20"), "2A", "2B"];
    for (const d of deps) expect(REGIONS_COUVERTURE.filter((r) => r.departements.includes(d)).length, d).toBe(1);
  });

  it("le département se lit dans le code postal de l'adresse (Corse comprise)", () => {
    expect(departementDeLAdresse("3 rue de la Gare, 22300 Lannion")).toBe("22");
    expect(regionDuDepartement(departementDeLAdresse("1 place Kléber, 67000 Strasbourg"))?.code).toBe("alsace");
    expect(departementDeLAdresse("20000 Ajaccio")).toBe("2A");
    expect(departementDeLAdresse("20200 Bastia")).toBe("2B");
    expect(departementDeLAdresse("sans code postal")).toBeNull();
  });

  it("les voliges de toutes les épaisseurs et les essences admises sous le zinc ; jamais une essence interdite", () => {
    const voliges = TOUT_LE_CATALOGUE.filter((a) => a.produit === "Volige").map((a) => a.designation);
    for (const e of ["12×100", "15×100", "18×100", "22×100", "25×100", "27×100"]) expect(voliges.some((v) => v.includes(e)), e).toBe(true);
    expect(voliges.some((v) => /chêne|châtaignier|mélèze|douglas|red cedar/i.test(v))).toBe(false);
    expect(rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "volige 15 épicéa", 3)[0]?.article.designation).toBe("Volige 15×100 · épicéa");
    expect(rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "contre liteau 27x40", 3)[0]?.article.designation).toBe("Contre-latte 27×40 · traité classe 2");
  });

  it("à score égal, la région d'abord : en Alsace la tuile écaille, en Occitanie la lauze et la canal", () => {
    const alsace = regionDuDepartement("67")!;
    const enAlsace = rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "tuile plate", 5, (a) => alsace.dominants.includes(a.produit));
    expect(enAlsace[0]?.article.produit).toBe("Tuile plate écaille (queue de castor)");
    const sansRegion = rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "tuile plate", 5);
    expect(sansRegion[0]?.article.produit).not.toBe("Tuile plate écaille (queue de castor)");
    expect(rechercherAvecPrecisions(TOUT_LE_CATALOGUE, "lauze", 3)[0]?.article.produit).toBe("Lauze");
  });
});
