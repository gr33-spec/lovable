import { describe, expect, it } from "vitest";
import { cleDeProposition, habitudeEtablie, phraseDeRegle, regleGlobaleAProposer, reponseApprise, tauxDeCorrection, valeurApprise } from "../src/index.js";

/** L'apprentissage des corrections (Greg, 24 octobre 2026) : 2 chantiers pour une habitude, 3 artisans pour une règle à valider. */
describe("ce qu'une correction apprend", () => {
  it("un nom, une précision, un facteur de quantité ; rien quand rien ne change", () => {
    expect(valeurApprise("libelle", { label: "Écran HPV", count: null }, "Écran HPV Delta-Vent")).toBe("Écran HPV Delta-Vent");
    expect(valeurApprise("libelle", { label: "Écran HPV", count: null }, "ecran hpv")).toBeNull();
    expect(valeurApprise("precision", { label: "Liteau", count: null }, " traité classe 2 ")).toBe("traité classe 2");
    expect(valeurApprise("quantite", { label: "Vis", count: "200" }, { value: "220", unit: "pièces" })).toBe("1.1");
    expect(valeurApprise("quantite", { label: "Vis", count: "200" }, { value: "200", unit: "pièces" })).toBeNull();
    expect(cleDeProposition("  Écran   HPV ")).toBe("ecran hpv");
  });

  it("une habitude au 2e chantier différent, une règle globale au 3e artisan", () => {
    const o = (companyId: string, projectId: string) => ({ companyId, projectId, at: "2026-10-24" });
    expect(habitudeEtablie([o("a", "p1"), o("a", "p1")])).toBe(false);
    expect(habitudeEtablie([o("a", "p1"), o("a", "p2")])).toBe(true);
    expect(regleGlobaleAProposer(["a", "b", "b"])).toBe(false);
    expect(regleGlobaleAProposer(["a", "b", "c"])).toBe(true);
  });

  it("la règle pose la même réponse qu'une correction à la main ; la quantité s'arrondit au-dessus", () => {
    expect(reponseApprise("libelle", "Écran HPV Delta-Vent", { count: null, unit: null })).toBe("Écran HPV Delta-Vent");
    expect(reponseApprise("quantite", "1.1", { count: "13", unit: "rouleaux" })).toEqual({ value: "15", unit: "rouleaux" });
    expect(phraseDeRegle({ cle: "vis", champ: "quantite", valeur: "1.1" })).toBe("« vis » : quantité × 1,1");
  });

  it("le taux de correction du mois", () => {
    expect(tauxDeCorrection(40, 9)).toBe(22.5);
    expect(tauxDeCorrection(0, 0)).toBeNull();
  });
});
