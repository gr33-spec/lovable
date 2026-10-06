import { describe, expect, it } from "vitest";
import { siteNameFromQuote } from "../src/index.js";

describe("nom du chantier lu dans le devis (§48)", () => {
  it("le client d'abord, sans civilité, en minuscules lisibles", () => {
    expect(siteNameFromQuote({ client: "M. DUPONT", commune: "Brest" })).toBe("Chantier Dupont");
    expect(siteNameFromQuote({ client: "M. et Mme LE GALL Yann", commune: null })).toBe("Chantier Le Gall Yann");
    expect(siteNameFromQuote({ client: "SCI LES PINS, 12 rue de Siam", commune: null })).toBe("Chantier SCI Les Pins");
  });
  it("sans client : la commune ; sans rien : pas de nom", () => {
    expect(siteNameFromQuote({ client: null, commune: "Vannes" })).toBe("Chantier Vannes");
    expect(siteNameFromQuote({ client: " ", commune: null })).toBeNull();
  });
});
