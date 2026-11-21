import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUp, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES PAGES RÉGIONALES ET L'INSCRIPTION PAR MÉTIER (Greg, 19 novembre 2026, « Couvreurs de Bretagne ») :
 * - le département touché sur la carte est gardé à l'inscription, et sert de zone aux achats groupés sans code postal ;
 * - la carte lit les regroupements ouverts d'un département (nom du produit, fin), jamais une entreprise ni une quantité ;
 * - un métier pas encore ouvert laisse son e-mail : la liste d'attente se lit dans l'espace admin, par métier et par
 *   département. Les comptes déjà créés ne sont pas touchés.
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

const publicAgent = () => request(ctx.app.getHttpServer());
const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000);

async function achat(departement: string, lot: string, nom: string, finDansJours: number, statut = "ouvert") {
  return ctx.prisma.achatGroupeV1.create({
    data: { type: "ardoise", cle: `ardoise:${nom}`, nom, lot, departement, reception: "livraison", dateBesoin: dansJours(30), ouvertJusquau: dansJours(finDansJours), statut },
  });
}

describe("pages régionales", { timeout: 120_000 }, () => {
  it("le département choisi à l'inscription est gardé ; un code inconnu est ignoré ; un compte sans département reste comme avant", async () => {
    const a = await signUp(ctx.app, "a@toitures.fr");
    const ca = (await a.post("/v1/companies").send({ name: "Toitures A", trades: ["roofing"], departement: "22" }).expect(201)).body;
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: ca.id } })).departement).toBe("22");

    const b = await signUp(ctx.app, "b@toitures.fr");
    const cb = (await b.post("/v1/companies").send({ name: "Toitures B", trades: ["roofing"], departement: "99" }).expect(201)).body;
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: cb.id } })).departement).toBeNull();

    const { companyId } = await signUpWithCompany(ctx.app, "c@toitures.fr", "Toitures C");
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: companyId } })).departement).toBeNull();
  });

  it("le département de l'inscription sert de zone aux achats groupés, avant le code postal de l'adresse", async () => {
    const a = await signUp(ctx.app, "a@toitures.fr");
    const c = (await a.post("/v1/companies").send({ name: "Toitures A", trades: ["roofing"], departement: "29" }).expect(201)).body;
    const r = (await a.get("/v1/ag/etat").set("x-company-id", c.id).expect(200)).body;
    expect(r.zone).toEqual({ code: "29", nom: "Finistère" });
    // RÈGLE CHANGÉE (nouvel onboarding, 19 novembre 2026) : le département choisi l'emporte sur le code postal de l'adresse.
    await a.patch("/v1/company/profile").set("x-company-id", c.id).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    expect((await a.get("/v1/ag/etat").set("x-company-id", c.id).expect(200)).body.zone).toEqual({ code: "29", nom: "Finistère" });
  });

  it("la carte : les regroupements ouverts du département et du métier, jamais un achat clos ni d'ailleurs, ni une entreprise", async () => {
    await achat("22", "couverture", "Ardoise naturelle 32×22", 10);
    await achat("22", "zinguerie", "Bobine zinc 0,65", 3);
    await achat("22", "peinture", "Peinture façade", 5);
    await achat("29", "couverture", "Ardoise naturelle 40×25", 5);
    await achat("22", "couverture", "Crochets inox", -1);
    await achat("22", "couverture", "Liteaux", 8, "annule");

    const r = (await publicAgent().get("/v1/public/regroupements").query({ departement: "22", lots: "couverture,zinguerie" }).expect(200)).body;
    expect(r.departement).toEqual({ code: "22", nom: "Côtes-d'Armor" });
    expect(r.total).toBe(2);
    expect(r.achats.map((x: { nom: string }) => x.nom)).toEqual(["Bobine zinc 0,65", "Ardoise naturelle 32×22"]);
    expect(Object.keys(r.achats[0]).sort()).toEqual(["finLe", "nom"]);

    const vide = (await publicAgent().get("/v1/public/regroupements").query({ departement: "35", lots: "couverture" }).expect(200)).body;
    expect(vide).toEqual({ departement: { code: "35", nom: "Ille-et-Vilaine" }, total: 0, achats: [] });

    const inconnu = (await publicAgent().get("/v1/public/regroupements").query({ departement: "99" }).expect(200)).body;
    expect(inconnu).toEqual({ departement: null, total: 0, achats: [] });
  });

  it("la liste d'attente : un métier pas encore ouvert, sans compte ; jamais « Couvreur » ni un métier inconnu ; une ligne par e-mail et métier", async () => {
    await publicAgent().post("/v1/public/liste-attente").send({ email: "Elec@Exemple.fr", metier: "electrical", departement: "22", source: "inscription" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "elec@exemple.fr", metier: "electrical", departement: "22" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "placo@exemple.fr", metier: "drywall", departement: "29", source: "couvreurs-bretagne" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "plombier@exemple.fr", metier: "plumbing" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "c@exemple.fr", metier: "roofing" }).expect(400);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "x@exemple.fr", metier: "astronaute" }).expect(400);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "pas-un-email", metier: "plumbing" }).expect(400);

    expect(await ctx.prisma.listeAttenteMetier.count()).toBe(3);
    // Personne n'a de compte : la liste d'attente ne crée ni utilisateur ni entreprise.
    expect(await ctx.prisma.company.count()).toBe(0);
    expect(await ctx.prisma.user.count()).toBe(0);
  });

  it("l'espace admin : le décompte par métier et par département ; réservé à l'équipe, consultation au journal", async () => {
    await publicAgent().post("/v1/public/liste-attente").send({ email: "e1@exemple.fr", metier: "electrical", departement: "22" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "e2@exemple.fr", metier: "electrical", departement: "29" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "p1@exemple.fr", metier: "drywall", departement: "22" }).expect(204);
    await publicAgent().post("/v1/public/liste-attente").send({ email: "p2@exemple.fr", metier: "plumbing" }).expect(204);

    const artisan = await signUpWithCompany(ctx.app, "artisan@toitures.fr", "Toitures A");
    await artisan.agent.get("/v1/admin/liste-attente").expect(403);
    await publicAgent().get("/v1/admin/liste-attente").expect(401);

    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest");
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const r = (await greg.agent.get("/v1/admin/liste-attente").expect(200)).body;
    expect(r.total).toBe(4);
    expect(r.parMetier[0]).toMatchObject({ metier: "electrical", libelle: "Électricité", nombre: 2 });
    expect(r.parMetier.map((m: { metier: string }) => m.metier).sort()).toEqual(["drywall", "electrical", "plumbing"]);
    expect(r.parDepartement[0]).toEqual({ code: "22", nom: "Côtes-d'Armor", nombre: 2 });
    expect(r.parDepartement).toContainEqual({ code: null, nom: "Non indiqué", nombre: 1 });
    expect(r.inscrits).toHaveLength(4);
    expect(await ctx.prisma.journalAdmin.count({ where: { action: "vue_liste_attente" } })).toBe(1);
  });
});
