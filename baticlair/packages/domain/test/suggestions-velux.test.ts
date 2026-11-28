import { describe, expect, it } from "vitest";
import { SUGGESTIONS_KEY } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * Skill du fondateur (18/11/2026, § Velux) : « En Suggestion : kit d'isolation (BDX), pare-vapeur (BBX), volet roulant,
 * store, habillage intérieur » ; la collerette d'écran (BFX) en plus, vendue à part du raccord (tarif Velux France 2024,
 * recherche du 20/11/2026). Jamais d'office : une case décochée ; cochée, un par fenêtre, à sa taille.
 */
const DEUX_FENETRES = [
  { ref: "01a12a11-6f9d-7238-88bd-be0524bd4e15", designation: "Couverture bac acier", quantity: "90", unit: "m²" },
  { ref: "01a12a11-6f9d-7238-88bd-c0524bd4e15a", designation: "Fenêtre de toit 114x118", quantity: "1", unit: "u" },
  { ref: "01a12a11-6f9d-7238-88bd-c7b46f516a15", designation: "Fenêtre de toit Velux GGL MK04", quantity: "1", unit: "u" },
];
const noms = (answers = {}) => readQuote(DEUX_FENETRES, answers).toBuy.map((b) => `${b.label} : ${b.quantity}`);

describe("Velux : kits proposés en Suggestion, jamais d'office", () => {
  it("rien de coché : aucun kit dans la liste", () => {
    expect(noms().join(" | ")).not.toMatch(/BDX|BBX|BFX|volet|store|habillage/i);
  });
  it("kit d'isolation et collerette cochés : un par fenêtre, chacun à sa taille", () => {
    const l = noms({ [SUGGESTIONS_KEY]: "fenetre-de-toit/isolation,fenetre-de-toit/collerette" });
    expect(l.filter((x) => /BDX|BFX/.test(x))).toEqual([
      "Kits d'isolation (type BDX), fenêtre 114 × 118 : 1 pièce",
      "Collerettes d'écran (type BFX), fenêtre 114 × 118 : 1 pièce",
      "Kits d'isolation (type BDX), fenêtre 78 × 98 : 1 pièce", // MK04 = 78 × 98 (Velux, Fakro, Kingspan)
      "Collerettes d'écran (type BFX), fenêtre 78 × 98 : 1 pièce",
    ]);
    expect(l.join(" | ")).not.toMatch(/BBX|volet|store|habillage/i);
  });
});
