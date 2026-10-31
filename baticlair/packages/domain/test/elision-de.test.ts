import { describe, expect, it } from "vitest";
import { de } from "../src/shared/elision.js";
import { quantiteDite } from "../src/groupe/notifications.js";

/** Greg, 25 octobre 2026 : « pièces d'ardoise », règle générale sur les voyelles, pas un cas à part. */
describe("élision de « de » devant une voyelle", () => {
  it("toutes les voyelles, accentuées comprises", () => {
    expect(de("Ardoise 32×22 Espagne 1er choix")).toBe("d'ardoise 32×22 Espagne 1er choix");
    expect(de("Écran de sous-toiture HPV")).toBe("d'écran de sous-toiture HPV");
    expect(de("isolant laine de verre 200 mm")).toBe("d'isolant laine de verre 200 mm");
    expect(de("Enduit monocouche")).toBe("d'enduit monocouche");
    expect(de("Œillet")).toBe("d'œillet");
    expect(de("Ytong 20 cm")).toBe("d'ytong 20 cm");
  });
  it("pas d'élision devant une consonne ni devant un h (aspiré, courant au bâtiment)", () => {
    expect(de("Zinc 0,65 mm 650 mm naturel")).toBe("de zinc 0,65 mm 650 mm naturel");
    expect(de("Bois de charpente")).toBe("de bois de charpente");
    expect(de("Hêtre massif")).toBe("de hêtre massif");
  });
  it("un sigle garde ses capitales", () => {
    expect(de("OSB 3 18 mm")).toBe("d'OSB 3 18 mm");
    expect(de("BA13 2,50 m")).toBe("de BA13 2,50 m");
  });
  it("les phrases qui disent une quantité d'article", () => {
    expect(quantiteDite({ quantite: "1800", unite: "pièces", designation: "Ardoise naturelle 32×22" })).toMatch(/pièces d'ardoise naturelle 32×22$/);
    expect(quantiteDite({ quantite: "60", unite: "m", designation: "Zinc naturel" })).toMatch(/m de zinc naturel$/);
  });
});
