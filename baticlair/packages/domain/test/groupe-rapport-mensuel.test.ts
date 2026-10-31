import { describe, expect, it } from "vitest";
import { bilanVide, bornesDuMois, moisEcoule, nomDuMois, rapportMensuel } from "../src/index.js";

/** Plan 2 du 21 octobre 2026, bloc 4 : le rapport mensuel de l'artisan. */
describe("rapport mensuel de l'artisan", () => {
  it("le mois écoulé, son nom, ses bornes", () => {
    expect(moisEcoule(new Date("2026-11-01T07:00:00Z"))).toBe("2026-10");
    expect(moisEcoule(new Date("2027-01-01T07:00:00Z"))).toBe("2026-12");
    expect(nomDuMois("2026-10")).toBe("octobre 2026");
    expect(bornesDuMois("2026-10")).toEqual({ debut: new Date("2026-10-01T00:00:00Z"), fin: new Date("2026-11-01T00:00:00Z") });
  });

  it("« ce mois : X chantiers lus, Y € économisés au groupé, Z lots », tutoiement, objet parlant", () => {
    const r = rapportMensuel({ mois: "2026-10", chantiersLus: 3, economies: 315.4, lots: 2 }, "Jean");
    expect(r.objet).toBe("Ton mois d'octobre 2026 avec Mobiiz : 3 chantiers lus, 315 € économisés, 2 lots");
    expect(r.texte).toContain("Bonjour Jean,");
    expect(r.texte).toContain("Ce mois : 3 chantiers lus, 315 € économisés grâce au regroupement, 2 lots.");
    expect(r.texte).toContain("Tes 2 lots du regroupement");
    expect(r.texte).not.toMatch(/\bvous\b|\bvotre\b/i);
    expect(r.html).toContain("<strong>Ce mois : 3 chantiers lus, 315 € économisés grâce au regroupement, 2 lots.</strong>");
  });

  it("un chantier, aucun lot : singulier, et l'invitation au groupé ; de novembre, d'avril", () => {
    const r = rapportMensuel({ mois: "2026-11", chantiersLus: 1, economies: 0, lots: 0 });
    expect(r.objet).toBe("Ton mois de novembre 2026 avec Mobiiz : 1 chantier lu, 0 € économisés, 0 lot");
    expect(r.texte).toContain("Bonjour,");
    expect(r.texte).toContain("Pas de lot ce mois-ci");
    expect(rapportMensuel({ mois: "2027-04", chantiersLus: 1, economies: 0, lots: 0 }).objet).toContain("Ton mois d'avril 2027");
  });

  it("rien à dire : pas d'e-mail", () => {
    expect(bilanVide({ mois: "2026-10", chantiersLus: 0, economies: 0, lots: 0 })).toBe(true);
    expect(bilanVide({ mois: "2026-10", chantiersLus: 1, economies: 0, lots: 0 })).toBe(false);
  });
});
