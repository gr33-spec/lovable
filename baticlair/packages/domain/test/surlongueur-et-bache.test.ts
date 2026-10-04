import { describe, expect, it } from "vitest";
import { lineKind, tradeProfile } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * RÉPONSES DU FONDATEUR (2026-10-04) :
 *  - « Surlongueur : 15 cm par bac (10 en égout, 5 en faîtage), ajoutés au rampant avant de multiplier par le nombre
 *    de bacs. »
 *  - « Bâche de protection : fourniture, elle part au fournisseur. »
 */
const TEST = [
  { ref: "1", designation: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantity: "91", unit: "m²" },
  { ref: "2", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
];
const u = (value: string, unit = "u") => ({ value, unit });
const bobine = (v: ReturnType<typeof readQuote>) => v.toBuy.find((b) => b.needIds.some((id) => id.startsWith("zinc-bobines")));

describe("surlongueur de bobine et bâche", () => {
  it("chantier Test, je façonne : 31 bacs × (7 m + 15 cm) = 222 ml de bobine 500 mm (avant : 217 ml)", () => {
    const v = readQuote(TEST, { "param:faconnage": u("1"), "param:egout_faitage": u("4") });
    expect(bobine(v)?.quantity).toBe("222 ml");
  });

  it("la surlongueur s'ajoute avant de multiplier : 39 bacs × (5,5 + 0,15) = 220,35 → 221 ml", () => {
    const v = readQuote([{ ref: "1", designation: "Couverture zinc à joint debout, rampant 5,5 m", quantity: "91", unit: "m²" }], { "param:faconnage": u("1"), "param:egout_faitage": u("4"), "param:zone": u("3") });
    expect(bobine(v)?.quantity).toBe("221 ml");
  });

  it.each(["Bâche de protection 4 × 5 m", "Fourniture bâche de protection", "Bâches de protection"])("« %s » est une fourniture, jamais de la main d'œuvre", (d) => {
    expect(lineKind(d, tradeProfile("roofing"))).toMatchObject({ kind: "material", family: { code: "tarpaulin" } });
  });

  it("la bâche part au fournisseur, telle qu'écrite", () => {
    const v = readQuote(TEST.concat([{ ref: "3", designation: "Bâche de protection 4 × 5 m", quantity: "2", unit: "u" }]), { "param:faconnage": u("1"), "param:egout_faitage": u("4") });
    expect(v.toBuy.find((b) => b.label.startsWith("Bâche"))).toMatchObject({ label: "Bâche de protection 4 × 5 m", quantity: "2 pièces" });
  });
});
