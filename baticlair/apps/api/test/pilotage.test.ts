import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE PILOTAGE ADMIN (Greg, 24 octobre 2026) : réservé à GROUPE_ADMINS AVEC double authentification (code par e-mail, lié à
 * la session) ; chaque accès et chaque détail nominatif journalisés ; chiffres agrégés ; faux comptes exclus.
 */
let ctx: TestContext;
const avant = { MODE_REGROUPEMENT: process.env.MODE_REGROUPEMENT, GROUPE_ADMINS: process.env.GROUPE_ADMINS, CRON_SECRET: process.env.CRON_SECRET };
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.CRON_SECRET = "secret-de-la-tache";
  // L'essai et le gratuit d'avant (25 octobre 2026) ne valent plus qu'hors du mode automatique (achat groupé par métier, 27 octobre 2026).
  process.env.MODE_REGROUPEMENT = "mois";
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

  it("le compte Anthropic de la clé (Greg, 27 octobre 2026) : réservé à l'admin, jamais la clé ; l'identifiant d'organisation lu sur un appel gratuit", async () => {
    const artisan = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await artisan.agent.get("/v1/admin/pilotage/compte-ia").expect(403);
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    // Les tests n'ont pas de clé réelle : rien n'est appelé.
    expect((await greg.agent.get("/v1/admin/pilotage/compte-ia").expect(200)).body).toMatchObject({ organisation: null, etat: "sans_cle" });
    // Avec une clé : l'en-tête de la réponse dit l'organisation ; la clé n'est jamais rendue.
    const { PilotageService } = await import("../src/modules/pilotage/application/pilotage.service.js");
    const cle = "sk-ant-test-0123456789abcdefgh";
    const service = new PilotageService(ctx.prisma as never, { groupe: { admins: [] }, aiCost: {}, authSecret: "x", ai: { provider: "anthropic", apiKey: cle, keySource: "BATICLAIR_ANTHROPIC_KEY" } } as never, ctx.emails as never, {} as never);
    (service as unknown as { exiger: () => Promise<void> }).exiger = async () => undefined;
    let vue: RequestInit | undefined;
    const r = await service.compteIa({} as never, async (_u, init) => {
      vue = init as RequestInit;
      return new Response("{}", { status: 400, headers: { "anthropic-organization-id": "org-1234" } });
    });
    expect(r).toEqual({ variable: "BATICLAIR_ANTHROPIC_KEY", organisation: "org-1234", etat: "refusee" });
    expect(JSON.stringify(r)).not.toContain(cle.slice(-8));
    expect((vue?.headers as Record<string, string>)["x-api-key"]).toBe(cle);
  });

  it("les 4 chiffres, la croissance, la fidélité, l'activité, l'IA, la rentabilité ; faux comptes exclus ; détail journalisé", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await signUpWithCompany(ctx.app, "faux@demo.baticlair.fr", "Faux artisan", ["roofing"]);
    // A paie Pro (simulé) : 29 € HT de revenu mensuel récurrent.
    const { url } = (await a.agent.post("/v1/abonnement/payer").expect(200)).body;
    await a.agent.post(`/v1/abonnement/simulation/${new URL(url).searchParams.get("session")}`).send({ issue: "payer" }).expect(200);
    // B paie Pro Max : 49 € par mois ; le revenu récurrent fait 78 € (29 € de Pro et 49 € de Pro Max), aucun abonné en annuel (15 novembre 2026).
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    const annuel = (await b.agent.post("/v1/abonnement/payer").send({ formule: "promax" }).expect(200)).body.url;
    await b.agent.post(`/v1/abonnement/simulation/${new URL(annuel).searchParams.get("session")}`).send({ issue: "payer" }).expect(200);
    // Des visites comptées sans cookie, une installation.
    for (let i = 0; i < 3; i++) await request(ctx.app.getHttpServer()).post("/v1/public/visite").expect(204);
    await a.agent.post("/v1/me/installation").expect(204);

    const t = (await greg.agent.get("/v1/admin/pilotage").expect(200)).body;
    expect(t.chiffres.map((c: { titre: string }) => c.titre)).toEqual(["Utilisateurs actifs", "Abonnés payants", "Revenu mensuel récurrent", "Coût IA du mois"]);
    expect(t.chiffres[1]).toMatchObject({ valeur: "2", fleche: { couleur: "vert", texte: "nouveau" } });
    expect(t.chiffres[2]).toMatchObject({ valeur: "78 €", detail: "HT, Pro et Pro Max" });
    expect(t.abonnes).toEqual({ mensuels: 2, annuels: 0, partAnnuels: 0, revenuMensuelRecurrent: 78, encaisseCeMois: 78 });
    expect(t.croissance).toMatchObject({ visites: 3, installations: 1, inscriptions: 3 });
    expect(t.rentabilite).toMatchObject({ revenu: 78 });
    expect(t.mode).toBe("test");
    // Agrégé : aucun nom d'entreprise dans le tableau.
    expect(JSON.stringify(t)).not.toMatch(/Toitures A|Toitures B|Faux artisan/);
    // Le détail nominatif, sur un clic, journalisé.
    await greg.agent.get("/v1/admin/pilotage/detail/essais_semaine").expect(200);
    const journal = await ctx.prisma.journalAdmin.findMany({ orderBy: { createdAt: "asc" }, select: { action: true } });
    expect(journal.map((j) => j.action)).toEqual(["code_envoye", "code_valide", "acces", "detail:essais_semaine"]);
  });

  it("les réglages (seuil IA, services, prix de l'abonnement) et l'alerte de coût IA une fois par jour", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const r = (await greg.agent.put("/v1/admin/pilotage/reglages").send({ seuilIaJourEur: 0, coutServicesMensuelEur: 40, abonnement: { prixMensuelProHtCentimes: 2500, prixMensuelProMaxHtCentimes: 3500, prixAnnuelHtCentimes: 29900, tauxTva: 20, joursEssaiApresResultats: 30, joursEssaiSansDepot: 45, joursGrace: 7, joursRappelAnnuel: 30 } }).expect(200)).body;
    expect(r).toMatchObject({ seuilIaJourEur: 0, coutServicesMensuelEur: 40, abonnement: { prixMensuelProHtCentimes: 2500, prixMensuelProMaxHtCentimes: 3500, joursEssaiSansDepot: 45 } });
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    expect((await a.agent.get("/v1/abonnement").expect(200)).body).toMatchObject({ prixHt: "25 €", joursEssai: 45 });
    expect((await a.agent.get("/v1/abonnement").expect(200)).body.offres.map((o: { prix: string }) => o.prix)).toEqual(["25 € HT par mois", "35 € HT par mois"]);
    // Un coût IA aujourd'hui au-dessus du seuil : un e-mail, une seule fois.
    await ctx.prisma.aiExecution.create({ data: { companyId: a.companyId, task: "lecture_devis", route: "text", provider: "anthropic", model: "m", promptId: "p", promptVersion: 1, costMicroUsd: 2_000_000n, priceTableVersion: "v", status: "success", durationMs: 1 } });
    const tache = () => request(ctx.app.getHttpServer()).get("/v1/internal/pilotage").set("authorization", "Bearer secret-de-la-tache").expect(200);
    expect((await tache()).body).toMatchObject({ alerteIa: true, stockage: { alerte: false, maxMo: 512 } });
    expect((await tache()).body).toMatchObject({ alerteIa: false });
    expect(ctx.emails.sent.filter((m) => /coût IA du jour/.test(m.subject))).toHaveLength(1);
  });

  it("lot B (16 novembre 2026) : la base au-dessus de 70 % de sa place alerte une fois par jour, jamais en dessous", async () => {
    const { PilotageService } = await import("../src/modules/pilotage/application/pilotage.service.js");
    const alertes: string[] = [];
    const alerter = { enabled: true, alert: (sorte: string, message: string) => void alertes.push(`${sorte} : ${message}`) };
    const service = (maxMo: number) => new PilotageService(ctx.prisma, { groupe: { admins: [] }, aiCost: {}, authSecret: "x", baseTailleMaxMo: maxMo } as never, ctx.emails as never, {} as never, undefined, alerter as never);
    // Une base de test pèse quelques Mo : loin de 70 % de 512 Mo.
    expect(await service(512).alerteStockage()).toMatchObject({ maxMo: 512, alerte: false });
    // 0 : pas d'alerte du tout.
    expect((await service(0).alerteStockage()).alerte).toBe(false);
    expect(alertes).toEqual([]);
    // Une place d'1 Mo est dépassée : une alerte, puis plus rien le même jour.
    const r = await service(1).alerteStockage();
    expect(r.alerte).toBe(true);
    expect((await service(1).alerteStockage()).alerte).toBe(false);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatch(/^stockage : La base occupe \d+ Mo sur 1 Mo/);
  });
});
