import { describe, expect, it } from "vitest";
import { TOUT_LE_CATALOGUE, FAMILLE_DU_METIER_CATALOGUE, METIERS_DU_SELECTEUR, chiffreLaFamille, compatibilite, lignesPourNegoce, specialiteDuMetier, vueDuCatalogue } from "../src/index.js";
import { TUILES_AU_M2 } from "../src/catalogue/donnees/couverture-fabricants.js";

/**
 * LES DERNIERS ÉCARTS DU CŒUR MÉTIER (Greg, 13 novembre 2026).
 * 4. « Ne classe pas les tuiles à emboîtement par fabricant. Crée uniquement des sous-familles fondées sur des
 *    caractéristiques professionnelles vérifiables : type, format, galbe ou mode de pose. »
 * 5. « Zinguerie et Étanchéité ne doivent plus partir automatiquement vers les négoces de Couverture. Utilise les métiers
 *    réellement déclarés par chaque négoce, tout en permettant à un négoce de couvrir plusieurs métiers. »
 */
const articles = TOUT_LE_CATALOGUE;
const terreCuite = () => vueDuCatalogue("couverture", articles).find((r) => r.libelle === "Tuiles en terre cuite")!;
const borne = (t: string) => Number(t.match(/\d+(?:[.,]\d+)?/)![0].replace(",", "."));

describe("tuiles à emboîtement : des sous-familles par format relevé, jamais par fabricant", () => {
  it("aucune sous-famille ne porte un nom de fabricant ni de marque", () => {
    for (const f of terreCuite().familles) expect(f.libelle).not.toMatch(/edilians|huguenot|ste foy|poudenx|gélis|jacob|phalempin|imerys|terreal|monier|koramic/i);
  });
  it("chaque modèle au format relevé est rangé d'après le nombre de tuiles au m² de sa fiche", () => {
    const sousFamilleDe = new Map<string, string>();
    for (const f of terreCuite().familles) for (const p of f.produits) sousFamilleDe.set(p.libelle, f.libelle);
    let verifies = 0;
    for (const [nom, texte] of TUILES_AU_M2) {
      const ou = sousFamilleDe.get(nom);
      if (!ou || /canal|plates/i.test(ou)) continue; // canal et plates : rangées par leur type
      const n = borne(texte);
      expect(ou, `${nom} (${texte} au m²)`).toBe(n < 12 ? "Emboîtement grand format (jusqu'à 12 au m²)" : n < 18 ? "Emboîtement format moyen (12 à 17 au m²)" : "Emboîtement petit format (18 au m² et plus)");
      verifies += 1;
    }
    expect(verifies).toBeGreaterThan(25);
  });
  it("un modèle sans format relevé n'est pas deviné : il reste sous « Autres tuiles à emboîtement »", () => {
    const autres = terreCuite().familles.find((f) => f.libelle === "Autres tuiles à emboîtement")!;
    for (const p of autres.produits) {
      expect(TUILES_AU_M2.has(p.libelle), p.libelle).toBe(false);
      expect(p.libelle).not.toMatch(/grand moule|petit moule/);
    }
  });
  it("plus aucune sous-famille de plus de 40 produits, et aucune tuile perdue", () => {
    const familles = terreCuite().familles;
    for (const f of familles) expect(f.produits.length, f.libelle).toBeLessThanOrEqual(40);
    expect(familles.reduce((s, f) => s + f.produits.length, 0)).toBe(72);
  });
});

describe("routage : chaque métier va aux négoces qui l'ont déclaré", () => {
  it("Couverture, Zinguerie et Étanchéité ont chacune leur famille d'achat", () => {
    expect(FAMILLE_DU_METIER_CATALOGUE.couverture).toBe("couverture");
    expect(FAMILLE_DU_METIER_CATALOGUE.zinguerie).toBe("zinguerie");
    expect(FAMILLE_DU_METIER_CATALOGUE.etancheite).toBe("etancheite");
    for (const m of ["couverture", "zinguerie", "etancheite"] as const) expect(METIERS_DU_SELECTEUR).toContain(m);
  });
  it("un négoce de couverture seule ne reçoit plus la zinguerie ni l'étanchéité", () => {
    const couvertureSeule = { generaliste: false, familles: ["couverture"] };
    expect(chiffreLaFamille(couvertureSeule, "couverture")).toBe(true);
    expect(chiffreLaFamille(couvertureSeule, "zinguerie")).toBe(false);
    expect(chiffreLaFamille(couvertureSeule, "etancheite")).toBe(false);
  });
  it("un négoce peut couvrir plusieurs métiers ; un généraliste reçoit tout", () => {
    const plusieurs = { generaliste: false, familles: ["couverture", "zinguerie"] };
    expect(chiffreLaFamille(plusieurs, "zinguerie")).toBe(true);
    expect(chiffreLaFamille(plusieurs, "etancheite")).toBe(false);
    expect(chiffreLaFamille({ generaliste: true, familles: [] }, "etancheite")).toBe(true);
  });
  it("le panier d'un achat groupé est partagé selon les métiers déclarés", () => {
    const ligne = (famille: string, libelle: string) => ({ cle: libelle, libelle, unite: "pièces", quantite: 1, famille }) as never;
    const panier = [ligne("couverture", "Ardoise"), ligne("zinguerie", "Gouttière"), ligne("etancheite", "Membrane")];
    const libelles = (n: { generaliste: boolean; familles: string[] | null }) => lignesPourNegoce(panier, n).map((l) => l.libelle);
    expect(libelles({ generaliste: false, familles: ["couverture"] })).toEqual(["Ardoise"]);
    expect(libelles({ generaliste: false, familles: ["zinguerie", "etancheite"] })).toEqual(["Gouttière", "Membrane"]);
    expect(libelles({ generaliste: true, familles: [] })).toHaveLength(3);
  });
  it("carnet de l'artisan : l'étanchéité a sa spécialité, un négoce de couverture n'est plus dit compatible d'office", () => {
    expect(specialiteDuMetier("waterproofing")).toBe("etancheite");
    expect(compatibilite({ id: "n", nom: "N", specialites: ["couverture"] }, "etancheite")).toBe("non");
    expect(compatibilite({ id: "n", nom: "N", specialites: ["couverture", "etancheite"] }, "etancheite")).toBe("specialiste");
  });
});

describe("métiers partiels : visibles, dits « en cours d'enrichissement »", () => {
  it("cinq métiers réellement fournis ; les sept autres restent au sélecteur et se disent incomplets", async () => {
    const { METIERS_FOURNIS, catalogueEnEnrichissement, PHRASE_CATALOGUE_EN_ENRICHISSEMENT, ACTION_SAISIR_MON_MATERIAU } = await import("../src/index.js");
    expect([...METIERS_FOURNIS].sort()).toEqual(["charpente", "couverture", "etancheite", "peinture", "zinguerie"]);
    const partiels = METIERS_DU_SELECTEUR.filter((m) => catalogueEnEnrichissement(m));
    expect(partiels).toHaveLength(7);
    for (const m of partiels) expect(vueDuCatalogue(m, TOUT_LE_CATALOGUE).length, m).toBeGreaterThan(0); // toujours ouvrables
    expect(PHRASE_CATALOGUE_EN_ENRICHISSEMENT).toBe("Catalogue en cours d'enrichissement");
    expect(ACTION_SAISIR_MON_MATERIAU).toBe("Je saisis mon matériau");
  });
});
