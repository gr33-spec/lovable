import { describe, expect, it } from "vitest";
import { formuleDuCompte, LIGNES_PAR_ANALYSE, OFFRES, phrasePaywallQuota, phraseQuota, poidsAnalyse, prixDeLOffre, quotasDe, TARIFS } from "../src/index.js";

/**
 * LES TROIS OFFRES (Greg, 30 octobre 2026, réponses aux six décisions) : achats groupés gratuits ; Découverte, Essentiel,
 * Pro ; 150 lignes par analyse, un gros devis compte pour 2.
 */
describe("les offres", () => {
  it("la grille validée, Pro à 8 analyses", () => {
    expect(Object.values(OFFRES).map((o) => [o.nom, o.prixHt, o.analyses, o.scans, o.parMois])).toEqual([
      ["Découverte", 0, 1, 3, false],
      ["Essentiel", 19.9, 3, 10, true],
      ["Pro", 39.9, 8, 30, true],
    ]);
    expect(prixDeLOffre(OFFRES.essentiel)).toBe("19,90 € HT par mois");
    expect(prixDeLOffre(OFFRES.decouverte)).toBe("Gratuit");
  });

  it("150 lignes par analyse ; au-delà, un devis compte pour 2", () => {
    expect(LIGNES_PAR_ANALYSE).toBe(150);
    expect([1, 150, 151, 324].map(poidsAnalyse)).toEqual([1, 1, 2, 2]);
  });

  it("la formule d'un compte : pro, sinon essentiel pour tout abonnement actif (anciens mensuel et annuel compris)", () => {
    expect(formuleDuCompte({ actif: false, formule: "pro" })).toBe("decouverte");
    expect(formuleDuCompte({ actif: true, formule: "pro" })).toBe("pro");
    for (const f of ["essentiel", "mensuel", "annuel", null]) expect(formuleDuCompte({ actif: true, formule: f })).toBe("essentiel");
  });

  it("les jauges et les paywalls, accordés, disent toujours ce qui reste gratuit", () => {
    expect(phraseQuota(quotasDe("decouverte", { analyses: 0, scans: 1 }), "analyses")).toBe("1 analyse de devis offerte sur 1.");
    expect(phraseQuota(quotasDe("decouverte", { analyses: 0, scans: 1 }), "scans")).toBe("2 scans de liste offerts sur 3.");
    expect(phraseQuota(quotasDe("essentiel", { analyses: 1, scans: 0 }), "analyses")).toBe("2 analyses de devis sur 3 ce mois-ci.");
    expect(phraseQuota(quotasDe("pro", { analyses: 9, scans: 0 }), "analyses")).toBe("Plus d'analyses de devis ce mois-ci. La saisie à la main reste gratuite.");
    expect(phraseQuota(quotasDe("decouverte", { analyses: 0, scans: 3 }), "scans")).toBe("Plus de scans de liste offerts. La saisie à la main reste gratuite.");
    expect(phrasePaywallQuota("decouverte", "analyses")).toBe("Tes analyses de devis offertes sont utilisées. Passe à Essentiel pour en avoir plus, ou note ta liste à la main : c'est gratuit.");
    expect(phrasePaywallQuota("pro", "scans")).toBe("Tes scans de liste du mois sont utilisés. Ils reviennent le mois prochain ; d'ici là, note ta liste à la main : c'est gratuit.");
  });

  it("TARIFS dit que les achats groupés sont gratuits, et les prix viennent de la grille", () => {
    expect(TARIFS.enUneLigne).toMatch(/^Gratuit : tes listes, tes négoces et les achats groupés\./);
    expect(TARIFS.question.r).toContain("les achats groupés sont gratuits");
    expect(TARIFS.essentiel.sous).toBe("19,90 € HT par mois");
    expect(TARIFS.pro.points[0]).toBe("8 analyses de devis par mois");
    expect(JSON.stringify(TARIFS)).not.toMatch(/49 €|348 €|29 €|premier est offert|premier achat groupé est offert/);
  });
});
