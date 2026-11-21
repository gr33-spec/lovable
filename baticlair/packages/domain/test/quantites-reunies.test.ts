/**
 * LES QUANTITÉS RÉUNIES D'UNE PROPOSITION (Greg, 1er novembre 2026) : seules les quantités d'entreprises vérifiées et
 * confirmées comptent ; jamais une quantité individuelle ni une identité ; sous 5 entreprises, « moins de 5 entreprises »
 * et des totaux arrondis par tranche.
 */
import { describe, expect, it } from "vitest";
import { phraseEntreprises, quantitesReunies, tranche, type LigneReunie } from "../src/index.js";

const l = (companyId: string, libelle: string, quantite: number, compte = true, unite = "pièces"): LigneReunie => ({ companyId, libelle, unite, quantite, compte });

describe("les quantités réunies", () => {
  it("additionne par article et unité ; une entreprise non vérifiée ou une participation non confirmée ne compte pas", () => {
    const r = quantitesReunies(
      [l("a", "Ardoise 32×22", 900), l("b", "Ardoise 32×22", 1500), l("c", "Ardoise 32×22", 5000, false), l("d", "Ardoise 32×22", 300), l("e", "Ardoise 32×22", 100), l("f", "Crochets", 2000)],
      5,
    );
    expect(r.entreprises).toBe(5);
    expect(r.totaux).toEqual(["2 800 pièces · Ardoise 32×22", "2 000 pièces · Crochets"]);
  });

  it("sous le seuil : un total arrondi par tranche, jamais la quantité exacte d'un concurrent", () => {
    const r = quantitesReunies([l("a", "Ardoise 32×22", 937)], 5);
    expect(r.entreprises).toBe(1);
    expect(r.totaux).toEqual(["plus de 900 pièces · Ardoise 32×22"]);
    expect(r.totaux.join(" ")).not.toContain("937");
    expect(tranche(2437)).toBe(2000);
    expect(tranche(7)).toBe(7);
  });

  it("trois totaux au plus, les plus gros d'abord ; rien de compté : rien à montrer", () => {
    const r = quantitesReunies([l("a", "A", 1), l("a", "B", 50), l("a", "C", 30), l("a", "D", 20)], 1);
    expect(r.totaux.map((t) => t.split(" · ")[1])).toEqual(["B", "C", "D"]);
    expect(quantitesReunies([l("a", "A", 10, false)], 5)).toEqual({ entreprises: 0, totaux: [] });
  });

  it("le nombre d'entreprises : jamais exact sous le seuil", () => {
    expect(phraseEntreprises(0, 5)).toBe("Aucune entreprise vérifiée pour l'instant");
    expect(phraseEntreprises(3, 5)).toBe("moins de 5 entreprises");
    expect(phraseEntreprises(7, 5)).toBe("7 entreprises");
  });
});
