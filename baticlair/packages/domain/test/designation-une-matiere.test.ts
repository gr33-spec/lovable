import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * UNE DÉSIGNATION, UNE MATIÈRE (retour du fondateur, 2026-10-04 : « Voliges sapin 18 mm zinc », « pourquoi tu as mis
 * zinc ? ») : une matière citée par la ligne (« voligeage sapin sous zinc ») ne suit l'article que si c'est la sienne.
 * Et les caractéristiques d'un ouvrage ne passent jamais à un autre (crochets de gouttière ≠ crochets d'ardoise).
 */
const labels = (v: ReturnType<typeof readQuote>) => v.toBuy.map((b) => b.label);

describe("jamais deux matières dans une désignation", () => {
  it("voligeage sapin sous zinc : « Voliges sapin 18 mm », jamais « … zinc »", () => {
    const v = readQuote(
      [
        { ref: "1", designation: "Couverture zinc joint debout", quantity: "91", unit: "m²" },
        { ref: "2", designation: "Voligeage en sapin traité 18 mm sous couverture zinc", quantity: "91", unit: "m²" },
      ],
      { "param:faconnage": { value: "1", unit: "u" } },
    );
    const volige = labels(v).find((l) => /[Vv]olige/.test(l))!;
    expect(volige).toMatch(/sapin/);
    expect(volige).not.toMatch(/zinc/i);
  });

  it("voligeage seul : même règle", () => {
    expect(labels(readQuote([{ ref: "1", designation: "Voligeage sapin 18 mm pour couverture zinc", quantity: "40", unit: "m²" }]))).toEqual(["Voliges sapin 18 mm"]);
  });

  it("une gouttière sans matière prend celle de sa ligne (PVC) : la règle n'efface pas une vraie précision", () => {
    expect(labels(readQuote([{ ref: "1", designation: "Gouttière demi-ronde PVC sable", quantity: "20", unit: "ml" }])).join(" ")).toMatch(/PVC/);
  });

  it("les « crochets » d'un ouvrage ne prêtent rien à ceux d'un autre : crochets d'ardoise jamais « zinc »", () => {
    const v = readQuote([
      { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "100", unit: "m²" },
      { ref: "2", designation: "Gouttière zinc demi-ronde avec crochets zinc", quantity: "12", unit: "ml" },
    ]);
    const crochetsArdoise = labels(v).find((l) => /ardoise/i.test(l) && /[Cc]rochet/.test(l))!;
    expect(crochetsArdoise).not.toMatch(/zinc/i);
  });
});
