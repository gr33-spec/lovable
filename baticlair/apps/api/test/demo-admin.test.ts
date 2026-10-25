import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { ARDOISE, couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LA DÉMO ADMIN (Greg, 24 octobre 2026) : un cycle complet joué d'un bout à l'autre sans attendre le calendrier. Le jeu
 * de test (5 faux artisans dans le 22, 3 faux négoces), puis « Clôturer maintenant », « Faire répondre les négoces »,
 * « Publier les résultats », « Finir l'essai », « Simuler un échec de paiement » ; tout est réservé à l'admin passé
 * par la double authentification, journalisé, exclu des statistiques et effacé d'un bouton.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, GROUPE_ADMINS: process.env.GROUPE_ADMINS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.sent.length = 0;
});

describe("la démo admin", () => {
  it("refusée à un artisan, et à l'admin sans double authentification", async () => {
    const A = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await A.agent.post("/v1/admin/pilotage/demo/jeu").expect(403);
    await A.agent.delete("/v1/admin/pilotage/demo").expect(403);
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await greg.agent.post("/v1/admin/pilotage/demo/jeu").expect(403);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    await greg.agent.post("/v1/admin/pilotage/demo/inconnu").expect(403);
  });

  it("un cycle complet : jeu de test, clôture, réponses, résultats ; fin d'essai et échec de paiement ; tout s'efface", { timeout: 120_000 }, async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: ARDOISE, quantite: "2400", unite: "pièces" }]);
    await greg.agent.post(`/v1/projects/${greg.projectId}/commande-du-mois`).send({ articles: greg.articles, nature: "chantier" }).expect(201);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const sans = (await greg.agent.get("/v1/admin/pilotage").expect(200)).body;

    const jeu = (await greg.agent.post("/v1/admin/pilotage/demo/jeu").expect(200)).body;
    // Recentrage (25 octobre 2026) : seuls les gros articles à référence stricte entrent dans les regroupements (ardoise,
    // liteau, écran ; BA13 chez 3 d'entre eux) ; le crochet et le rail restent en demande perso. L'admin y a 4 lignes.
    expect(jeu).toEqual({ artisans: 5, negoces: 3, lignes: 18, zone: "22", pourToi: 4 });
    // Les faux comptes n'entrent pas dans les statistiques.
    expect((await greg.agent.get("/v1/admin/pilotage").expect(200)).body.chiffres).toEqual(sans.chiffres);

    const clos = (await greg.agent.post("/v1/admin/pilotage/demo/cloturer").expect(200)).body;
    // Trois clôtures : la liste de Greg (commande d'avant), le regroupement couverture et le regroupement second œuvre ;
    // une consultation par famille, chacune à ses négoces (le généraliste et le spécialiste de la famille).
    expect(clos).toMatchObject({ clos: 3, grillesEnvoyees: 6 });
    const grilles = ctx.emails.sent.filter((m) => /^negoce-test-\d@demo\.mobiiz\.fr$/.test(m.to));
    expect(grilles).toHaveLength(6);
    // Un généraliste et deux spécialistes : le spécialiste du second œuvre ne voit que le placo, celui de la couverture que la couverture.
    const grilleDe = (n: number) => grilles.filter((m) => m.to === `negoce-test-${n}@demo.mobiiz.fr`).map((m) => m.text).join("\n");
    expect(grilleDe(1)).toMatch(/Ardoise[\s\S]*BA13/);
    expect(grilleDe(2)).toContain("Ardoise");
    expect(grilleDe(2)).not.toContain("BA13");
    expect(grilleDe(3)).toContain("BA13");
    expect(grilleDe(3)).not.toContain("Ardoise");
    expect((await greg.agent.post("/v1/admin/pilotage/demo/repondre").expect(200)).body).toEqual({ reponses: 6 });
    expect((await greg.agent.post("/v1/admin/pilotage/demo/publier").expect(200)).body).toMatchObject({ resultats: 3 });
    // La demande perso de démonstration : trois offres comparées livraison comprise, et « Mes prix » rempli.
    const demo = (await greg.agent.get("/v1/projects").expect(200)).body.items?.find?.((p: { name: string }) => p.name.startsWith("Démo regroupement")) ?? null;
    const projetDemo = demo?.id ?? (await ctx.prisma.project.findFirstOrThrow({ where: { name: { startsWith: "Démo regroupement" } } })).id;
    const [perso] = (await greg.agent.get(`/v1/projects/${projetDemo}/demandes-perso`).expect(200)).body;
    expect(perso.offres.map((o: { nom: string; complete: boolean }) => [o.nom, o.complete])).toEqual([
      ["Comptoir Breton du Bâtiment (démo)", true],
      // Les partielles ensuite, de la moins chère à la plus chère (le placo pèse moins que l'ardoise).
      ["Placo de l'Argoat (démo)", false],
      ["Ardoisière du Trégor (démo)", false],
    ]);
    expect((await greg.agent.get("/v1/mes-prix").expect(200)).body.articles.length).toBe(6);
    const vue = (await greg.agent.get("/v1/commande-du-mois").expect(200)).body;
    expect(JSON.stringify(vue)).toContain("Ardoisière du Trégor (démo)");

    await greg.agent.post("/v1/admin/pilotage/demo/finir-essai").expect(200);
    expect((await greg.agent.get("/v1/abonnement").expect(200)).body.acces).toBe("bloque");
    await greg.agent.post("/v1/admin/pilotage/demo/echec-paiement").expect(200);

    const journal = await ctx.prisma.journalAdmin.findMany({ where: { action: "demo" }, select: { cible: true } });
    expect(journal.map((j) => j.cible)).toEqual(["jeu", "cloturer", "repondre", "publier", "finir-essai", "echec-paiement"]);

    const efface = (await greg.agent.delete("/v1/admin/pilotage/demo").expect(200)).body;
    expect(efface).toMatchObject({ artisans: 5, negoces: 3, comptesNegoce: 3 });
    expect(await ctx.prisma.user.count({ where: { email: { endsWith: "@demo.mobiiz.fr" } } })).toBe(0);
    // Greg et sa liste restent.
    expect(await ctx.prisma.besoin.count({ where: { companyId: greg.companyId } })).toBeGreaterThan(0);
  });
});
