import { describe, expect, it } from "vitest";
import { exclusionFor, readExclusions } from "../src/index.js";

/**
 * PHRASES D'EXCLUSION (référentiel §44.2) : une phrase de la note retire une ligne du « À commander ». Sans IA ;
 * une ligne n'est exclue que si elle nomme TOUS les mots visés, jamais au plus proche.
 */
describe("readExclusions : les tournures d'artisan", () => {
  it.each([
    ["garage non compris", ["garage"]],
    ["La petite toiture du garage n'est pas comprise.", ["garage"]],
    ["Velux fournis par le client", ["velux"]],
    ["charpente conservée", ["charpente"]],
    ["2 Velux conservés", ["velux"]],
    ["hors abri de jardin", ["abri", "jardin"]],
    ["Gouttières exclues", ["gouttiere"]],
  ])("« %s » vise %j", (note, words) => {
    expect(readExclusions(note).map((e) => e.words)).toEqual([words]);
  });

  it("une note sans tournure d'exclusion n'exclut rien", () => {
    expect(readExclusions("Pente 42°. Rampants 2 × 6,50 m. 2 descentes. Accès difficile.")).toEqual([]);
    expect(readExclusions("")).toEqual([]);
  });

  it("plusieurs exclusions dans une phrase, séparées par des virgules", () => {
    expect(readExclusions("Réfection complète, garage non compris, Velux fournis par le client.").map((e) => e.words)).toEqual([["garage"], ["velux"]]);
  });
});

describe("exclusionFor : la ligne qui nomme les mots visés", () => {
  const ex = readExclusions("garage non compris. Velux fournis par le client. hors abri de jardin");
  it("une ligne qui nomme le garage est exclue, avec la phrase citée", () => {
    expect(exclusionFor("Couverture du garage en tuiles mécaniques", ex)?.phrase).toBe("garage non compris");
    expect(exclusionFor("Fourniture et pose de 2 fenêtres de toit VELUX GGL", ex)?.phrase).toBe("Velux fournis par le client");
    expect(exclusionFor("Couverture abri de jardin", ex)?.phrase).toBe("hors abri de jardin");
  });
  it("jamais au plus proche : une ligne qui ne nomme pas les mots reste", () => {
    expect(exclusionFor("Couverture en ardoises naturelles 30x22", ex)).toBeNull();
    expect(exclusionFor("Abri vélo", ex)).toBeNull();
  });
});
