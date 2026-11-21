import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { empreinteSource, ObservatoireService } from "../src/modules/recentrage/application/observatoire.service.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * L'OBSERVATOIRE DES PRIX, PROPOSÉ OU COMMANDÉ (Greg, 21 novembre 2026, « oui aux 4 changements ») : chaque prix noté dit
 * s'il est proposé (réponse d'un négoce, offre d'un achat groupé) ou commandé, et garde la région de son département ;
 * une commande sur la même source passe ses prix à « commande » ; l'export de l'admin porte les deux colonnes et
 * aucun nom. Rien n'est encore montré aux artisans : l'affichage attend l'avocat (conditions négoces, version majeure).
 */
let ctx: TestContext;
let obs: ObservatoireService;
beforeAll(async () => {
  ctx = await createTestApp();
  obs = new ObservatoireService(ctx.prisma, () => new Date("2026-11-21T10:00:00Z"));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("Observatoire : proposé, commandé, région", () => {
  it("un prix reçu est « propose », avec la région du département", async () => {
    const n = await obs.enregistrer({ type: "perso", sourceId: "reponse-1", departement: "22", lignes: [{ designation: "Ardoise naturelle 32x22", unite: "pièces", quantite: 900, prixHt: 1.2 }] });
    expect(n).toBe(1);
    const [o] = await ctx.prisma.observationPrix.findMany();
    expect(o).toMatchObject({ statut: "propose", region: "Bretagne", departement: "22", type: "perso" });
  });

  it("la commande passe les prix de sa source à « commande », et seulement eux", async () => {
    await obs.enregistrer({ type: "perso", sourceId: "reponse-1", departement: "29", lignes: [{ designation: "Liteau 27x40", unite: "m", quantite: 300, prixHt: 0.5 }] });
    await obs.enregistrer({ type: "perso", sourceId: "reponse-2", departement: "29", lignes: [{ designation: "Liteau 27x40", unite: "m", quantite: 300, prixHt: 0.55 }] });
    expect(await obs.commande("perso", "reponse-1")).toBe(1);
    const parSource = Object.fromEntries((await ctx.prisma.observationPrix.findMany()).map((o) => [o.source, o.statut]));
    expect(parSource[empreinteSource("perso", "reponse-1")]).toBe("commande");
    expect(parSource[empreinteSource("perso", "reponse-2")]).toBe("propose");
  });

  it("l'offre groupée puis sa commande : la même ligne, passée à « commande »", async () => {
    await obs.enregistrer({ type: "groupe", sourceId: "v1:achat", departement: "56", statut: "propose", lignes: [{ designation: "Gouttière zinc dév. 33", unite: "m", quantite: null, prixHt: 12 }] });
    await obs.enregistrer({ type: "groupe", sourceId: "v1:achat", departement: "56", statut: "commande", lignes: [{ designation: "Gouttière zinc dév. 33", unite: "m", quantite: null, prixHt: 12 }] });
    const toutes = await ctx.prisma.observationPrix.findMany();
    expect(toutes).toHaveLength(1);
    expect(toutes[0]).toMatchObject({ statut: "commande", region: "Bretagne", type: "groupe" });
  });

  it("l'export de l'admin dit le statut et la région, jamais une source ni un nom", async () => {
    await obs.enregistrer({ type: "perso", sourceId: "reponse-secrete", departement: "35", lignes: [{ designation: "Écran HPV", unite: "rouleaux", quantite: 4, prixHt: 60 }] });
    const csv = await obs.csv();
    expect(csv.split("\n")[0]).toBe("article;libelle;prix_unitaire_ht;quantite;unite;palier;departement;date;type;statut;region");
    expect(csv).toContain(';perso;propose;"Bretagne"');
    expect(csv).not.toContain(empreinteSource("perso", "reponse-secrete"));
    expect(csv).not.toContain("reponse-secrete");
  });
});
