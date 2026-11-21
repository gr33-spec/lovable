import { describe, expect, it } from "vitest";
import { keyCharacteristics, suppliedObject } from "../src/index.js";

/**
 * Aucune caractéristique qui change le produit, la quantité ou le prix ne
 * doit se perdre quand BatiClair simplifie un intitulé. Lecture GÉNÉRIQUE :
 * testée sur plusieurs métiers pour ne pas se caler sur un seul devis.
 */
const has = (text: string, expected: string[]) => {
  const found = keyCharacteristics(text);
  for (const e of expected) expect(found, `${text}\n→ ${JSON.stringify(found)}`).toContain(e);
  return found;
};

describe("caractéristiques clés : tous métiers", () => {
  it("couverture (cas de référence D-2026-015)", () => {
    has("Couverture en tuiles terre cuite HP10 rouge - Fourniture et pose de tuiles en terre cuite grand moule type HP10 de coloris rouge", ["HP10", "terre cuite", "rouge", "grand moule"]);
    has("Gouttière PVC de 25 sable - gouttières demi-ronde de 25 en PVC de coloris sable, crochets et naissances compris (Longueur : 2 x 10 m)", ["PVC", "sable", "demi-ronde", "crochets et naissances compris", "2×10 m"]);
    has("Descente PVC Ø80 - descente en PVC Ø80 coloris sable, hauteur 4m, comprenant 2 jeux de coudes et les colliers", ["Ø80", "hauteur 4 m", "comprenant 2 jeux de coudes et les colliers"]);
    has("Écran - écran de sous-toiture HPV respirant, posé sur fermettes d'entraxe 90 cm", ["HPV", "respirant", "entraxe 90 cm"]);
  });

  it("plâtrerie, isolation", () => {
    has(
      "Cloison 72/48 - Fourniture et pose de plaques de plâtre BA13 hydrofuge 2500x1200 sur rails R48 et montants M48 à entraxe 60 cm, isolant laine de verre 45 mm, bandes et enduit compris",
      ["BA13", "hydrofuge", "2500×1200", "R48", "M48", "entraxe 60 cm", "laine de verre", "45 mm", "bandes et enduit compris"],
    );
    const iso = has("Isolation combles - Fourniture et pose de laine de verre soufflée épaisseur 300 mm R = 7 m².K/W", ["épaisseur 300 mm", "R = 7", "soufflé"]);
    expect(iso).not.toContain("300 mm"); // pas de doublon de l'épaisseur
  });

  it("carrelage, peinture, maçonnerie, électricité", () => {
    has("Carrelage 60x60 rectifié gris anthracite - carrelage grès cérame 60x60 cm, colle C2 et joints compris", ["60×60", "rectifié", "grès cérame", "anthracite", "C2", "joints compris"]);
    has("Peinture murs - Fourniture et application de 2 couches de peinture acrylique velours blanc, pot de 15 L", ["2 couches", "acrylique", "velours", "blanc", "15 L"]);
    has("Bloc béton - blocs béton creux B40 20x20x50, mortier compris", ["20×20×50", "B40", "béton", "creux", "mortier compris"]);
    has("Tableau électrique - tableau 2 rangées 26 modules avec interrupteur différentiel 40A 30mA type A", ["26 modules", "40 A", "30 mA", "type A"]);
  });

  it("l'objet réellement fourni, quel que soit le verbe du devis", () => {
    expect(suppliedObject("Faîtage - Fourniture et pose de faîtières ventilées avec closoir ventilé")).toBe("faîtières ventilées");
    expect(suppliedObject("Peinture - Fourniture et application de 2 couches de peinture acrylique, pot de 15 L")).toBe("2 couches de peinture acrylique");
    expect(suppliedObject("Tableau - Fourniture et pose d'un tableau 2 rangées 26 modules avec interrupteur")).toBe("tableau 2 rangées 26 modules");
    expect(suppliedObject("Dépose de la couverture existante")).toBeNull();
  });

  it("ne relève que ce qui est écrit : rien d'inventé", () => {
    expect(keyCharacteristics("Fourniture et pose de liteaux")).toEqual([]);
    // Les sigles comptables ne sont pas des produits.
    expect(keyCharacteristics("Total HT TVA TTC")).toEqual([]);
  });
});
