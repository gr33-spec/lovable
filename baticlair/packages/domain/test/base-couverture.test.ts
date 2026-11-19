/**
 * BASE DE RÉFÉRENCE COUVERTURE (mission du fondateur, 2026-11-19) : la fiche unique `referentiels/couverture/
 * fiche-couverture.json` se lit sans faute (schéma, sources citées, identifiants uniques), est classée famille >
 * sous-famille > marque > modèle, porte la carte des régions à part, et son taux de chiffres confirmés est recalculé.
 * Décision du fondateur : un chiffre propre à un modèle est confirmé par la fiche officielle du fabricant + le
 * contrôle par le calcul (`confirme_fabricant`), contrôle relu ici sur chaque tuile.
 */
import { describe, expect, it } from "vitest";
import { BASES_METIER, baseDuMetier, chiffreDe, lireBase, modelesDe, tauxConfirme, tousLesChiffres, zoneDeLAdresse } from "../src/index.js";

const lue = baseDuMetier("couverture")!;

describe("base de référence couverture", () => {
  it("se charge, avec sa carte des régions à part", () => {
    expect(BASES_METIER).toContain("couverture");
    expect(lue.base.fiche).toBe("couverture");
    expect(lue.carte?.departements.length).toBeGreaterThanOrEqual(96);
  });

  it("est classée par famille, du toit à la zinguerie et au bois", () => {
    const codes = lue.base.familles.map((f) => f.code);
    expect(codes.length).toBe(11);
    expect(codes.slice(0, 2)).toEqual(["ardoise", "tuile_emboitement"]);
    expect(codes.at(-1)).toBe("bois_couverture");
  });

  it("connaît les modèles que les artisans écrivent (HP10, PV10, ardoise 32×22)", () => {
    const noms = modelesDe(lue.base).map((m) => `${m.marque} ${m.modele.nom}`);
    expect(noms.some((n) => /HP ?10/i.test(n))).toBe(true);
    expect(noms.some((n) => /PV ?10/i.test(n))).toBe(true);
    expect(modelesDe(lue.base, "ardoise").some((m) => m.modele.nom === "32×22")).toBe(true);
  });

  it("chaque tuile confirmée par sa fiche fabricant a passé le contrôle par le calcul", () => {
    for (const c of tousLesChiffres(lue.base)) {
      if (c.chiffre.statut !== "confirme_fabricant") continue;
      expect(c.chiffre.sources.length, c.chiffre.id).toBeGreaterThan(0);
      if (c.famille.startsWith("tuile")) expect(c.chiffre.controle?.some((t) => !t.startsWith("ÉCHEC")), c.chiffre.id).toBe(true);
    }
  });

  it("le taux affiché est celui de la base, recalculé", () => {
    const t = tauxConfirme(lue.base);
    expect(t.taux).toBe(lue.base.taux_confirme);
    expect(t.total).toBeGreaterThan(2500);
  });

  it("refuse une base qui cite une source inconnue", () => {
    const b = JSON.parse(JSON.stringify(lue.base));
    b.familles[0].sous_familles[0].regles[0].sources = ["S999999"];
    expect(() => lireBase(JSON.stringify(b))).toThrow(/source inconnue S999999/);
  });

  it("un modèle rend son chiffre par attribut", () => {
    const hp10 = modelesDe(lue.base, "tuile_emboitement").find((m) => /^HP ?10/i.test(m.modele.nom))!;
    expect(hp10).toBeDefined();
    expect(chiffreDe(hp10.modele, "tuiles_par_palette")?.valeur).toBeDefined();
  });
});

describe("zone du chantier par commune (décision du fondateur, 2026-11-19)", () => {
  const z = (adresse: string) => zoneDeLAdresse(lue.carte, adresse);
  it("la commune écrite après le code postal donne sa zone DTU", () => {
    expect(z("12 rue de Siam, 29200 Brest")).toMatchObject({ zoneArdoise: 3, trouvee: "commune" });
    expect(z("2 place de la Mairie, 35000 Rennes")).toMatchObject({ zoneArdoise: 1, trouvee: "commune" });
    expect(z("44000 Nantes")).toMatchObject({ zoneArdoise: 1, exposee: false });
    // Limite de Lorient : la côte la plus proche à l'est de Lorient (côte « de Lorient à l'Espagne »).
    expect(z("56410 Étel")).toMatchObject({ zoneArdoise: 2, exposee: true });
    expect(z("56100 Lorient")).toMatchObject({ zoneArdoise: 3 });
    // Rive d'estuaire près de l'embouchure : exposée.
    expect(z("44560 Paimbœuf")).toMatchObject({ zoneArdoise: 2, exposee: true });
  });
  it("sans commune reconnue : la zone la plus forte des communes du code postal ; code inconnu : rien", () => {
    expect(z("29200")).toMatchObject({ zoneArdoise: 3, trouvee: "code_postal" });
    expect(z("rue sans code")).toBeNull();
    expect(z("00000 Nulle part")).toBeNull();
  });
});
