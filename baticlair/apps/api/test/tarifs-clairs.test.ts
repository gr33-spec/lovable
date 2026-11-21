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

  it("chaque phrase qui dit « gratuit » dit aussi ce qui est payant (15 novembre 2026 : publier et rejoindre un achat groupé restent gratuits, Pro pour commander)", () => {
    for (const p of [TARIFS.enUneLigne, `${TARIFS.question.q} ${TARIFS.question.r}`, argumentTarif({ cycles: 0, parCommande: null })]) {
      expect(p).toMatch(/gratuit/i);
      expect(p).toMatch(/achats groupés/);
      expect(p).toMatch(/abonnement|Pro|HT par mois/);
    }
    expect(TARIFS.question.r).toContain(`${LISTES_PREPAREES_OFFERTES} analyses de documents`);
    expect(LISTES_PREPAREES_OFFERTES).toBe(3);
  });

  it("le paywall dit ce qui reste gratuit", () => {
    expect(PHRASE_LECTURES_EPUISEES).toContain("c'est gratuit");
    // Achats groupés : la première commande est offerte ; ensuite, la phrase dit ce qui demande Pro.
    expect(TARIFS.paywallAchatGroupe).toBe("Ta première commande groupée était offerte. Pour voir le négoce retenu et commander, passe à Pro.");
  });
});
