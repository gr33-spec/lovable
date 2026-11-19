import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PHRASE_IDENTITE_A_CONFIRMER, PHRASE_POURQUOI_SIRET } from "@baticlair/domain";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUp, signUpWithCompany, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

/**
 * LE NOUVEL ONBOARDING « ESSAIE D'ABORD » (Greg, 19 novembre 2026) : carte, département, métier, e-mail et portable ; le
 * SIRET seulement au moment d'envoyer aux négoces, de commander ou de grouper, et l'entreprise confirmée avant que rien ne
 * parte. Les comptes d'avant ne sont pas touchés : aucune de ces règles ne s'applique à eux.
 */
let ctx: TestContext;
const VARS = ["GROUPE_ADMINS", "ACHATS_GROUPES_V1"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
  process.env.ACHATS_GROUPES_V1 = "on";
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

const SIRET = "73282932000074";

/** L'onboarding tel que le site l'envoie : un compte sans nom ni mot de passe choisi, puis l'entreprise « essai ». */
async function essai(email: string, metier = "roofing", departement = "22") {
  const agent = request.agent(ctx.app.getHttpServer());
  const r = await agent.post("/v1/auth/sign-up/email").set("origin", WEB_ORIGIN).send({ email, password: `${randomUUID()}${randomUUID()}`, name: "", callbackURL: "/chantiers/nouveau" });
  expect(r.status, r.text).toBe(200);
  const c = await agent.post("/v1/companies").send({ name: "Mon entreprise", trades: [metier], departement, telephone: "06 12 34 56 78", parcours: "essai" });
  expect(c.status, c.text).toBe(201);
  return { agent, companyId: c.body.id as string };
}

describe("nouvel onboarding", { timeout: 120_000 }, () => {
  it("e-mail et portable suffisent ; le portable est exigé ; la vérification de l'e-mail part comme avant", async () => {
    const { companyId } = await essai("yann@toitures.fr");
    const c = await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(c).toMatchObject({ parcoursInscription: "essai", departement: "22", phone: "06 12 34 56 78", trades: ["roofing"], identiteConfirmeeLe: null, siret: null });
    expect(ctx.emails.sent.some((m) => m.to === "yann@toitures.fr")).toBe(true);
    const u = await ctx.prisma.user.findFirstOrThrow({ where: { email: "yann@toitures.fr" } });
    expect(u.emailVerified).toBe(false);

    const sansPortable = await signUp(ctx.app, "sans@toitures.fr");
    const r = await sansPortable.post("/v1/companies").send({ name: "Mon entreprise", trades: ["roofing"], departement: "22", telephone: "02 96 00 00 00", parcours: "essai" });
    expect(r.status).toBe(400);
    expect(r.body.error.details).toMatchObject({ reason: "portable_invalide" });
  });

  it("les 3 analyses offertes sont celles d'avant, pour le nouvel arrivant aussi", async () => {
    const { agent } = await essai("yann@toitures.fr");
    const { agent: ancien } = await signUpWithCompany(ctx.app, "ancien@toitures.fr", "Toitures Ancien");
    const a = (await agent.get("/v1/ai-usage/jauge").expect(200)).body;
    const b = (await ancien.get("/v1/ai-usage/jauge").expect(200)).body;
    expect(a).toEqual(b);
  });

  it("un autre métier entre quand même : son métier est noté", async () => {
    const { companyId } = await essai("elec@exemple.fr", "electrical", "29");
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } })).trades).toEqual(["electrical"]);
  });

  it("rien ne part chez un négoce ni ne se commande tant que l'entreprise n'est pas confirmée ; les comptes d'avant passent comme avant", async () => {
    const { agent } = await essai("yann@toitures.fr");
    const projet = randomUUID();
    for (const [methode, chemin] of [
      ["post", `/v1/projects/${projet}/price-requests`],
      ["post", `/v1/projects/${projet}/demandes-perso`],
      ["post", `/v1/price-requests/${randomUUID()}/recipients`],
      ["post", `/v1/price-request-recipients/${randomUUID()}/send`],
      ["post", `/v1/price-requests/${randomUUID()}/order`],
      ["post", `/v1/demandes-perso/${randomUUID()}/commander`],
    ] as const) {
      const r = await agent[methode](chemin).send({});
      expect(r.status, chemin).toBe(403);
      expect(r.body.error.details, chemin).toEqual({ reason: "identite_a_confirmer", phrase: PHRASE_IDENTITE_A_CONFIRMER });
    }
    // Un compte d'avant : la même route ne parle jamais d'identité (refus pour une autre raison, le projet n'existe pas).
    const { agent: ancien } = await signUpWithCompany(ctx.app, "ancien@toitures.fr", "Toitures Ancien");
    const r = await ancien.post(`/v1/projects/${projet}/demandes-perso`).send({});
    expect(r.status).not.toBe(403);
  });

  it("le SIRET : on dit pourquoi, l'annuaire montre l'entreprise et son activité, « C'est bien mon entreprise » la confirme", async () => {
    const { agent, companyId } = await essai("yann@toitures.fr");
    const avantSiret = (await agent.get("/v1/company/identite").expect(200)).body;
    expect(avantSiret).toMatchObject({ phrase: PHRASE_POURQUOI_SIRET, aConfirmer: true, complete: false, telephone: "06 12 34 56 78", departement: { code: "22", nom: "Côtes-d'Armor" } });
    const annuaire = (await agent.get(`/v1/company/identite/annuaire?siret=${SIRET}`).expect(200)).body;
    expect(annuaire).toHaveProperty("activite");
    // Rien n'est enregistré par l'aperçu.
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } })).siret).toBeNull();

    const apres = (await agent.put("/v1/company/identite").send({ siret: SIRET, prenom: "Yann", telephone: "06 12 34 56 78" }).expect(200)).body;
    expect(apres).toMatchObject({ aConfirmer: false, complete: true });
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } })).identiteConfirmeeLe).not.toBeNull();
    const r = await agent.post(`/v1/projects/${randomUUID()}/demandes-perso`).send({});
    expect(r.status).not.toBe(403);
  });

  it("le département : celui de la carte sert de zone ; l'artisan peut prendre celui de son entreprise", async () => {
    const { agent, companyId } = await essai("yann@toitures.fr", "roofing", "29");
    await ctx.prisma.company.update({ where: { id: companyId }, data: { address: "3 rue des Ajoncs, 22300 Lannion" } });
    const id = (await agent.get("/v1/company/identite").expect(200)).body;
    expect(id.departement).toEqual({ code: "29", nom: "Finistère" });
    expect(id.departementEntreprise).toEqual({ code: "22", nom: "Côtes-d'Armor" });
    expect((await agent.get("/v1/ag/etat").expect(200)).body.zone).toEqual({ code: "29", nom: "Finistère" });
    await agent.patch("/v1/company/departement").send({ departement: "22" }).expect(200);
    expect((await agent.get("/v1/ag/etat").expect(200)).body.zone).toEqual({ code: "22", nom: "Côtes-d'Armor" });
    await agent.patch("/v1/company/departement").send({ departement: "99" }).expect(400);
  });

  it("un achat groupé attend aussi l'entreprise confirmée (parcours « essai » seulement)", async () => {
    const { agent, companyId } = await essai("yann@toitures.fr");
    await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET, siretVerifieLe: new Date() } });
    expect((await agent.get("/v1/ag/etat").expect(200)).body.verification.siretVerifie).toBe(false);
    await ctx.prisma.company.update({ where: { id: companyId }, data: { identiteConfirmeeLe: new Date() } });
    expect((await agent.get("/v1/ag/etat").expect(200)).body.verification.siretVerifie).toBe(true);
  });

  it("l'admin voit le décompte des inscrits par métier et par département", async () => {
    await essai("a@toitures.fr", "roofing", "22");
    await essai("b@exemple.fr", "electrical", "22");
    await essai("c@exemple.fr", "electrical", "56");
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest");
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const r = (await greg.agent.get("/v1/admin/liste-attente").expect(200)).body.inscritsParMetier;
    expect(r).toMatchObject({ total: 4, essai: 3 });
    expect(r.parMetier).toContainEqual({ metier: "electrical", libelle: "Électricité", nombre: 2, essai: 2 });
    expect(r.parMetier).toContainEqual({ metier: "roofing", libelle: "Couverture, charpente, zinguerie", nombre: 2, essai: 1 });
    expect(r.parDepartement).toContainEqual({ code: "22", nom: "Côtes-d'Armor", nombre: 2, essai: 2 });
    expect(r.parDepartement).toContainEqual({ code: "56", nom: "Morbihan", nombre: 1, essai: 1 });
  });
});
