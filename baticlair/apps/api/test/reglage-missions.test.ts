import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, type TestContext } from "./support/test-app.js";

/**
 * L'INTERRUPTEUR DES MISSIONS (Greg, 16 novembre 2026) : « sur l'app, affiche "Bientôt" […]. Fonctions désactivées, mais un
 * interrupteur dans l'admin pour l'activer d'un clic quand on aura du monde. » Coupées : chaque route des missions répond
 * 404 et la route de santé le dit (l'application affiche « Bientôt »). Un clic de l'admin les ouvre sans redéploiement ;
 * un artisan ne peut pas toucher à l'interrupteur ; rien n'est supprimé quand on recoupe.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "MISSIONS_V1"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.MISSIONS_V1;
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const LIGNES = [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "10", unite: "pièces" }];
const sante = async () => (await request(ctx.app.getHttpServer()).get("/v1/health").expect(200)).body.features.missions as boolean;

describe("l'interrupteur des missions dans l'admin", { timeout: 120_000 }, () => {
  it("coupées par défaut (404, « Bientôt ») ; l'admin ouvre d'un clic ; un artisan ne peut pas ; recouper ne supprime rien", async () => {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", LIGNES);
    const artisan = await couvreurAvecListe(ctx, "artisan@example.fr", "Toitures Martin", "8 rue du Port, 22500 Paimpol", LIGNES);

    // Coupées : la santé le dit, chaque route répond 404.
    expect(await sante()).toBe(false);
    await artisan.agent.get("/v1/missions/annonces?type=mission").expect(404);
    await artisan.agent.get("/v1/missions/etat").expect(404);

    // Un artisan (même connecté) ne lit ni ne change l'interrupteur.
    expect((await artisan.agent.get("/v1/admin/vue/reglages/missions")).status).toBeGreaterThanOrEqual(401);
    expect((await artisan.agent.post("/v1/admin/vue/reglages/missions").send({ actif: true })).status).toBeGreaterThanOrEqual(401);
    expect(await sante()).toBe(false);

    // L'admin : l'état vient du défaut ; un clic ouvre, tout de suite, et c'est au journal.
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    expect((await greg.agent.get("/v1/admin/vue/reglages/missions").expect(200)).body).toEqual({ actif: false, source: "defaut" });
    await greg.agent.post("/v1/admin/vue/reglages/missions").send({ actif: "oui" }).expect(400);
    expect((await greg.agent.post("/v1/admin/vue/reglages/missions").send({ actif: true }).expect(200)).body).toEqual({ actif: true, source: "admin" });
    expect(await sante()).toBe(true);
    await artisan.agent.get("/v1/missions/annonces?type=mission").expect(200);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "missions_ouvertes" } })).toBeGreaterThan(0);

    // Recouper : 404 de nouveau, l'état dit « admin ».
    expect((await greg.agent.post("/v1/admin/vue/reglages/missions").send({ actif: false }).expect(200)).body).toEqual({ actif: false, source: "admin" });
    expect(await sante()).toBe(false);
    await artisan.agent.get("/v1/missions/annonces?type=mission").expect(404);
    expect((await greg.agent.get("/v1/admin/vue/reglages/missions").expect(200)).body).toEqual({ actif: false, source: "admin" });

    // Les plafonds cachés des abonnés (Greg, 15 novembre 2026) : 5 € et 20 € au départ ; l'admin seul les lit et les règle.
    expect((await artisan.agent.get("/v1/admin/vue/reglages/plafonds-ia")).status).toBeGreaterThanOrEqual(401);
    expect((await artisan.agent.post("/v1/admin/vue/reglages/plafonds-ia").send({ pro: 50, promax: 50 })).status).toBeGreaterThanOrEqual(401);
    expect((await greg.agent.get("/v1/admin/vue/reglages/plafonds-ia").expect(200)).body).toEqual({ pro: 5, promax: 20, source: "defaut" });
    // Pro Max ne peut pas être plus bas que Pro ; jamais un montant négatif.
    await greg.agent.post("/v1/admin/vue/reglages/plafonds-ia").send({ pro: 8, promax: 6 }).expect(400);
    await greg.agent.post("/v1/admin/vue/reglages/plafonds-ia").send({ pro: -1, promax: 6 }).expect(400);
    expect((await greg.agent.post("/v1/admin/vue/reglages/plafonds-ia").send({ pro: 7.5, promax: 25 }).expect(200)).body).toEqual({ pro: 7.5, promax: 25, source: "admin" });
    expect((await greg.agent.get("/v1/admin/vue/reglages/plafonds-ia").expect(200)).body).toEqual({ pro: 7.5, promax: 25, source: "admin" });
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "plafonds_ia_regles" } })).toBe(1);
  });
});
