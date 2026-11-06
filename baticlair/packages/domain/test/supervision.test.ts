/**
 * Greg, 6 novembre 2026 (prompt maître, points 6, 13 et 14 ; lot 6) : la file d'exceptions (onze types), le score interne
 * de fiabilité d'un négoce (faits objectifs, jamais sur trop peu) et la taxonomie des familles configurable.
 */
import { describe, expect, it } from "vitest";
import { GRAVITE_EXCEPTION, LIBELLES_EXCEPTION, TYPES_EXCEPTION, estTypeException, famillesActives, codeFamilleValide, prixIncoherent, scoreFiabilite } from "../src/index.js";

describe("la supervision", () => {
  it("les onze types d'exceptions du prompt maître ont un libellé et une gravité", () => {
    expect(TYPES_EXCEPTION).toHaveLength(11);
    for (const t of TYPES_EXCEPTION) {
      expect(LIBELLES_EXCEPTION[t]).toBeTruthy();
      expect([1, 2, 3]).toContain(GRAVITE_EXCEPTION[t]);
    }
    expect(estTypeException("echec_envoi")).toBe(true);
    expect(estTypeException("nimporte")).toBe(false);
  });

  it("un prix incohérent s'écarte d'un facteur 3 de la médiane des autres ; avec moins de deux autres prix, on ne juge pas", () => {
    expect(prixIncoherent(1.1, [1.0, 1.2, 1.15])).toBe(false);
    expect(prixIncoherent(11, [1.0, 1.2, 1.15])).toBe(true);
    expect(prixIncoherent(0.2, [1.0, 1.2])).toBe(true);
    expect(prixIncoherent(11, [1.0])).toBe(false);
    expect(prixIncoherent(0, [])).toBe(true);
  });

  it("le score de fiabilité : des faits (réponses, complétude, délai), dit avec sa base ; rien sous trois demandes", () => {
    const bon = scoreFiabilite({ sollicitations: 4, reponses: 4, refus: 0, delaisHeures: [6, 10, 20, 12], lignesDemandees: 20, lignesChiffrees: 20, familles: ["couverture", "couverture", "charpente"] });
    expect(bon).toMatchObject({ score: 100, tauxReponse: 1, delaiMoyenHeures: 12, completude: 1, familles: ["charpente", "couverture"], base: "4 demandes, 4 réponses" });
    const muet = scoreFiabilite({ sollicitations: 4, reponses: 1, refus: 1, delaisHeures: [96], lignesDemandees: 10, lignesChiffrees: 5, familles: ["couverture"] });
    expect(muet.score).toBeLessThan(50);
    expect(muet.base).toBe("4 demandes, 1 réponse, 1 « ne peut pas chiffrer »");
    // Un refus motivé vaut mieux qu'un silence.
    const silence = scoreFiabilite({ sollicitations: 4, reponses: 1, refus: 0, delaisHeures: [96], lignesDemandees: 10, lignesChiffrees: 5, familles: [] });
    expect(muet.score!).toBeGreaterThan(silence.score!);
    expect(scoreFiabilite({ sollicitations: 2, reponses: 2, refus: 0, delaisHeures: [1, 1], lignesDemandees: 2, lignesChiffrees: 2, familles: [] }).score).toBeNull();
  });

  it("les familles : un code valide, l'ordre choisi, seules les actives sont proposées", () => {
    expect(codeFamilleValide("second_oeuvre")).toBe(true);
    expect(codeFamilleValide("Second œuvre")).toBe(false);
    const f = famillesActives([
      { code: "charpente", libelle: "Charpente", ordre: 2, active: true },
      { code: "couverture", libelle: "Couverture et zinguerie", ordre: 1, active: true },
      { code: "plomberie", libelle: "Plomberie", ordre: 3, active: false },
    ]);
    expect(f.codes).toEqual(["couverture", "charpente"]);
    expect(f.libelles.plomberie).toBe("Plomberie");
  });
});
