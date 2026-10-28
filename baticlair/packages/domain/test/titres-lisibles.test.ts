import { describe, expect, it } from "vitest";
import { nomDeListe, titreLisible } from "../src/index.js";

/** Greg, 28 octobre 2026, point 7 : « Liste du 28 octobre » au lieu de « Devis du 2026-10-28 ». */
describe("titres de date lisibles", () => {
  it("une liste sans référence porte la date en toutes lettres", () => {
    expect(nomDeListe(new Date("2026-10-28T08:31:00Z"))).toBe("Liste du 28 octobre");
    expect(nomDeListe(new Date("2026-11-01T10:00:00Z"))).toBe("Liste du 1er novembre");
  });
  it("un ancien nom à date ISO s'affiche lisible ; les autres noms ne bougent pas", () => {
    expect(titreLisible("Devis du 2026-10-28")).toBe("Liste du 28 octobre");
    expect(titreLisible("Liste du 2026-12-01")).toBe("Liste du 1er décembre");
    expect(titreLisible("Chantier Lannion")).toBe("Chantier Lannion");
    expect(titreLisible("Devis du client 2026-10-28")).toBe("Devis du client 2026-10-28");
  });
});
