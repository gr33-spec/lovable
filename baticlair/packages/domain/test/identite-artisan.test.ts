import { describe, expect, it } from "vitest";
import { identiteComplete, portableLisible, portableValide, prenomDe, prenomDirigeant } from "../src/groupe/identite-artisan.js";

/** Greg, lot final, point 1 : SIRET, prénom, portable, demandés une fois au premier envoi. */
describe("l'identité de l'artisan", () => {
  it("un portable français", () => {
    for (const t of ["06 12 34 56 78", "07.12.34.56.78", "+33 6 12 34 56 78", "0033712345678"]) expect(portableValide(t), t).toBe(true);
    for (const t of ["02 96 00 00 00", "06 12 34", "", null]) expect(portableValide(t), String(t)).toBe(false);
    expect(portableLisible("+33612345678")).toBe("06 12 34 56 78");
  });
  it("les prénoms", () => {
    expect(prenomDe("jean Martin")).toBe("Jean");
    expect(prenomDirigeant("JEAN PIERRE")).toBe("Jean");
  });
  it("complète seulement avec les trois", () => {
    expect(identiteComplete({ siret: "732 829 320 00074", prenom: "Jean", telephone: "06 12 34 56 78" })).toBe(true);
    expect(identiteComplete({ siret: "73282932000074", prenom: "", telephone: "06 12 34 56 78" })).toBe(false);
    expect(identiteComplete({ siret: "73282932000074", prenom: "Jean", telephone: "02 96 00 00 00" })).toBe(false);
    expect(identiteComplete({ siret: null, prenom: "Jean", telephone: "06 12 34 56 78" })).toBe(false);
  });
});
