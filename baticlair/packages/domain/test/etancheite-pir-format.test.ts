import { describe, expect, it } from "vitest";
import { ETANCHEITE_REFERENTIAL } from "../src/index.js";
import { readTradeQuote } from "./support/read-trade.js";

/**
 * Format du panneau PIR (recherche base couverture du 20/11/2026, `referentiels/couverture/recherche/sous-faces-etancheite.json`) :
 * 1 200 × 600 (0,72 m²) est le format courant (Unilin, IKO, Recticel) ; 1 200 × 1 000 (1,2 m²) existe (Knauf). Avant :
 * 1 200 × 1 000 seul. 48 m² × 1,03 ÷ 0,72 = 68,7 → 69 panneaux (avant : 48 × 1,03 ÷ 1,2 = 41,2 → 42).
 */
const BANC = [
  { ref: "1", designation: "Étanchéité toiture terrasse bicouche SBS autoprotégée", quantity: "48", unit: "m²" },
  { ref: "2", designation: "Isolant PIR ep 100 mm", quantity: "48", unit: "m²" },
];
const pir = (answers = {}) => readTradeQuote(ETANCHEITE_REFERENTIAL, BANC, answers).toBuy.find((b) => /Isolant PIR/.test(b.label));

describe("isolant PIR de toiture-terrasse : le format du panneau", () => {
  it("par défaut 1 200 × 600 : 69 panneaux pour 48 m²", () => {
    const l = pir();
    expect(l?.label).toBe("Isolant PIR toiture-terrasse 1 200 × 600, ép. 100 mm");
    expect(l?.quantity).toBe("69 panneaux");
  });
  it("1 200 × 1 000 répondu : 42 panneaux", () => {
    const l = pir({ "param:format_pir": { value: "2", unit: "u" } });
    expect(l?.label).toBe("Isolant PIR toiture-terrasse 1 200 × 1 000, ép. 100 mm");
    expect(l?.quantity).toBe("42 panneaux");
  });
});
