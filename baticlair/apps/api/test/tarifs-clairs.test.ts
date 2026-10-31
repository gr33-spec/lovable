import { LISTES_PREPAREES_OFFERTES, PHRASE_LECTURES_EPUISEES, TARIFS, argumentTarif } from "@baticlair/domain";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";

/**
 * CE QUI EST GRATUIT, CE QUI EST PAYANT (Greg, 29 octobre 2026 : « on dit que c'est gratuit alors qu'il y a une partie
 * payante ») : les mots disent les deux, et ils disent ce que le code applique.
 */
describe("les tarifs, dits clairement", () => {
  it("le nombre de listes préparées offertes est celui que le code applique", () => {
    const c = loadConfig({ ...process.env, LECTURES_IA_GRATUIT_TOTAL: undefined });
    expect(c.groupe.negocie.lecturesIaGratuitTotal).toBe(LISTES_PREPAREES_OFFERTES);
  });

  it("chaque phrase qui dit « gratuit » dit aussi ce qui est payant (30 octobre 2026 : les achats groupés sont gratuits)", () => {
    for (const p of [TARIFS.enUneLigne, `${TARIFS.question.q} ${TARIFS.question.r}`, argumentTarif({ cycles: 0, parCommande: null })]) {
      expect(p).toMatch(/gratuit/i);
      expect(p).toMatch(/achats groupés/);
      expect(p).toMatch(/abonnement|Essentiel|HT par mois/);
    }
    expect(TARIFS.question.r).toContain(`${LISTES_PREPAREES_OFFERTES} analyse de devis`);
  });

  it("le paywall dit ce qui reste gratuit", () => {
    expect(PHRASE_LECTURES_EPUISEES).toContain("c'est gratuit");
    expect(TARIFS.paywallAchatGroupe).toContain("Les achats groupés sont gratuits");
  });
});
