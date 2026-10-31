import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * SÉCURITÉ DE L'ADMIN (Greg, 26 octobre 2026 : « je dois être le seul à pouvoir entrer dans l'admin »). Toute route d'admin
 * (pilotage, commandes communes, configuration du mois) demande le code à 6 chiffres de la session ; la session admin dure
 * 2 heures au plus et se ferme après 30 minutes sans action ; 5 codes faux bloquent 30 minutes avec un e-mail d'alerte ;
 * chaque entrée réussie envoie un e-mail ; le journal note l'adresse IP ; la liste blanche est GROUPE_ADMINS seule.
 */
let ctx: TestContext;
const avant = { GROUPE: process.env.GROUPE, GROUPE_ADMINS: process.env.GROUPE_ADMINS, REFERENTIAL_VALIDATORS: process.env.REFERENTIAL_VALIDATORS };
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.REFERENTIAL_VALIDATORS = "valideur@example.fr";
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

describe("l'admin, réservé à Greg", () => {
  it("toutes les routes d'admin demandent le code de la session, pas seulement le pilotage", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    for (const route of ["/v1/admin/pilotage", "/v1/admin/groupe", "/v1/admin/commande-du-mois/config", "/v1/admin/commande-du-mois/negoces"]) {
      const r = await greg.agent.get(route).expect(403);
      expect(r.body.error.details, route).toMatchObject({ reason: "deux_facteurs_requis" });
    }
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    for (const route of ["/v1/admin/pilotage", "/v1/admin/groupe", "/v1/admin/commande-du-mois/config", "/v1/admin/commande-du-mois/negoces"]) await greg.agent.get(route).expect(200);
  });

  it("la liste blanche est GROUPE_ADMINS seule : un valideur du référentiel n'est pas admin", async () => {
    const v = await signUpWithCompany(ctx.app, "valideur@example.fr", "Valideur", ["roofing"]);
    expect((await v.agent.get("/v1/admin/pilotage/statut").expect(200)).body).toEqual({ admin: false, deuxFacteurs: false });
    await v.agent.post("/v1/admin/pilotage/code").expect(403);
    await v.agent.get("/v1/admin/groupe").expect(403);
  });

  it("chaque entrée réussie envoie un e-mail ; le journal note l'adresse IP", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const alerte = ctx.emails.sent.find((m) => m.to === "greg@example.fr" && /Connexion à ton espace admin/.test(m.subject));
    expect(alerte?.text).toMatch(/Quelqu'un vient d'entrer dans l'espace admin avec ton compte, le .+\(adresse IP .+\)/);
    const journal = await ctx.prisma.journalAdmin.findMany({ where: { action: "code_valide" } });
    expect(journal).toHaveLength(1);
    expect(journal[0]!.ip).toBeTruthy();
  });

  it("5 codes faux : bloqué 30 minutes, même avec un nouveau code, et un e-mail d'alerte", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await greg.agent.post("/v1/admin/pilotage/code").expect(200);
    for (let i = 0; i < 5; i++) await greg.agent.post("/v1/admin/pilotage/code/verifier").send({ code: "000000" }).expect(400);
    expect(ctx.emails.sent.filter((m) => /Alerte : accès à l'espace admin .+ bloqué/.test(m.subject))).toHaveLength(1);
    // Un nouveau code n'est plus envoyé ; le vrai code d'avant ne passe plus non plus.
    const refus = await greg.agent.post("/v1/admin/pilotage/code").expect(400);
    expect(refus.body.error.details).toMatchObject({ reason: "code_bloque" });
    const code = /(\d{6})/.exec(ctx.emails.sent.filter((m) => /code d'accès/.test(m.subject)).at(-1)!.text)![1]!;
    expect((await greg.agent.post("/v1/admin/pilotage/code/verifier").send({ code }).expect(400)).body.error.details).toMatchObject({ reason: "code_bloque" });
    // 30 minutes plus tard (les échecs vieillissent), le blocage tombe.
    await ctx.prisma.journalAdmin.updateMany({ where: { action: "code_refuse" }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
  });

  it("la session admin : fermée après 30 minutes sans action, et au plus 2 heures", async () => {
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest", ["roofing"]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    await greg.agent.get("/v1/admin/groupe").expect(200);
    // 31 minutes sans action : il faut un nouveau code.
    await ctx.prisma.codeAdmin.updateMany({ data: { derniereActiviteLe: new Date(Date.now() - 31 * 60_000) } });
    expect((await greg.agent.get("/v1/admin/groupe").expect(403)).body.error.details).toMatchObject({ reason: "deux_facteurs_requis" });
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    await greg.agent.get("/v1/admin/pilotage").expect(200);
    // Actif sans arrêt mais entré il y a plus de 2 heures : fermé aussi.
    await ctx.prisma.codeAdmin.updateMany({ data: { valideLe: new Date(Date.now() - 2 * 3_600_000 - 60_000), derniereActiviteLe: new Date() } });
    await greg.agent.get("/v1/admin/pilotage").expect(403);
  });
});
