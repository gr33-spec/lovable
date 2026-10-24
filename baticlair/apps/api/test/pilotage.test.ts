import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE PILOTAGE ADMIN (Greg, 24 octobre 2026) : réservé à GROUPE_ADMINS AVEC double authentification (code par e-mail, lié à
 * la session) ; chaque accès et chaque détail nominatif journalisés ; chiffres agrégés ; faux comptes exclus.
 */
let ctx: TestContext;
const avant = { GROUPE_ADMINS: process.env.GROUPE_ADMINS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
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

describe("le tableau de bord admin", () => {
  it("refusé sans double authentification, et à qui n'est pas admin ; un mauvais code ne passe pas", async () => {
    const artisan = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await artisan.agent.get("/v1/admin/pilotage").expect(403);
    await artisan.agent.post("/v1/admin/pilotage/code").expect(403);
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    expect((await greg.agent.get("/v1/admin/pilotage/statut").expect(200)).body).toEqual({ admin: true, deuxFacteurs: false });
    const refus = await greg.agent.get("/v1/admin/pilotage").expect(403);
    expect(refus.body.error.details).toMatchObject({ reason: "deux_facteurs_requis" });
    await greg.agent.post("/v1/admin/pilotage/code").expect(200);
    await greg.agent.post("/v1/admin/pilotage/code/verifier").send({ code: "000000" }).expect(400);
    await greg.agent.get("/v1/admin/pilotage").expect(403);
    // Le bon code ouvre le tableau pour CETTE session seulement.
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    expect((await greg.agent.get("/v1/admin/pilotage/statut").expect(200)).body).toEqual({ admin: true, deuxFacteurs: true });
    const autreSession = request.agent(ctx.app.getHttpServer());
    expect((await autreSession.post("/v1/auth/sign-in/email").set("origin", "http://localhost:3000").send({ email: "greg@example.fr", password: "motdepasse-solide" })).status).toBe(200);
    await autreSession.get("/v1/admin/pilotage").expect(403);
  });

  it("les 4 chiffres, la croissance, la fidélité, l'activité, l'IA, la rentabilité ; faux comptes exclus ; détail journalisé", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await signUpWithCompany(ctx.app, "faux@demo.baticlair.fr", "Faux artisan", ["roofing"]);
    // A paie (simulé) : un abonné payant, 29 € HT de revenu.
    const { url } = (await a.agent.post("/v1/abonnement/payer").expect(200)).body;
    await a.agent.post(`/v1/abonnement/simulation/${new URL(url).searchParams.get("session")}`).send({ issue: "payer" }).expect(200);
    // Des visites comptées sans cookie, une installation.
    for (let i = 0; i < 3; i++) await request(ctx.app.getHttpServer()).post("/v1/public/visite").expect(204);
    await a.agent.post("/v1/me/installation").expect(204);

    const t = (await greg.agent.get("/v1/admin/pilotage").expect(200)).body;
    expect(t.chiffres.map((c: { titre: string }) => c.titre)).toEqual(["Utilisateurs actifs", "Abonnés payants", "Revenu du mois", "Coût IA du mois"]);
    expect(t.chiffres[1]).toMatchObject({ valeur: "1", fleche: { couleur: "vert", texte: "nouveau" } });
    expect(t.chiffres[2]).toMatchObject({ valeur: "29 €" });
    expect(t.croissance).toMatchObject({ visites: 3, installations: 1, inscriptions: 2 });
    expect(t.rentabilite).toMatchObject({ revenu: 29 });
    expect(t.mode).toBe("test");
    // Agrégé : aucun nom d'entreprise dans le tableau.
    expect(JSON.stringify(t)).not.toMatch(/Toitures A|Faux artisan/);
    // Le détail nominatif, sur un clic, journalisé.
    await greg.agent.get("/v1/admin/pilotage/detail/essais_semaine").expect(200);
    const journal = await ctx.prisma.journalAdmin.findMany({ orderBy: { createdAt: "asc" }, select: { action: true } });
    expect(journal.map((j) => j.action)).toEqual(["code_envoye", "code_valide", "acces", "detail:essais_semaine"]);
  });

  it("les réglages (seuil IA, services, prix de l'abonnement) et l'alerte de coût IA une fois par jour", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const r = (await greg.agent.put("/v1/admin/pilotage/reglages").send({ seuilIaJourEur: 0, coutServicesMensuelEur: 40, abonnement: { prixHtCentimes: 3500, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 45, joursGrace: 7 } }).expect(200)).body;
    expect(r).toMatchObject({ seuilIaJourEur: 0, coutServicesMensuelEur: 40, abonnement: { prixHtCentimes: 3500, joursEssaiSansDepot: 45 } });
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await a.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ prixHt: "35 €", joursEssai: 45 });
    // Un coût IA aujourd'hui au-dessus du seuil : un e-mail, une seule fois.
    await ctx.prisma.aiExecution.create({ data: { companyId: a.companyId, task: "lecture_devis", route: "text", provider: "anthropic", model: "m", promptId: "p", promptVersion: 1, costMicroUsd: 2_000_000n, priceTableVersion: "v", status: "success", durationMs: 1 } });
    const tache = () => request(ctx.app.getHttpServer()).get("/v1/internal/pilotage").set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect((await tache()).body).toEqual({ alerteIa: true });
    expect((await tache()).body).toEqual({ alerteIa: false });
    expect(ctx.emails.sent.filter((m) => /coût IA du jour/.test(m.subject))).toHaveLength(1);
  });
});
