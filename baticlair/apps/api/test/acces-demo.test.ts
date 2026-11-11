/**
 * L'ACCÈS DÉMO « DÉCOUVRIR L'APPLICATION » (Greg, 7 novembre 2026, option 1, test.mobiiz.fr seulement) : sans inscription
 * ni mot de passe, un espace FICTIF, isolé, réinitialisable ; aucun e-mail, aucun appel IA, aucun paiement ; coupé d'un
 * réglage (`ACCES_DEMO`) ; l'isolation stricte avec les comptes normaux est gardée.
 */
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { DemoService as DemoAdmin } from "../src/modules/pilotage/application/demo.service.js";
import { loadConfig } from "../src/platform/config/config.js";
import { routeInterditeEnDemo, estVisiteurDemo } from "../src/platform/demo-domaine.js";
import { runWithRequestContext } from "../src/platform/logging/request-context.js";
import { createTestApp, resetDatabase, signUpWithCompany, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

let ctx: TestContext | null = null;
const avant = { ACCES_DEMO: process.env.ACCES_DEMO, DEMO_PUBLIQUE: process.env.DEMO_PUBLIQUE, INTERPRETE_IA: process.env.INTERPRETE_IA, MOTS_DE_PASSE_FUITES: process.env.MOTS_DE_PASSE_FUITES };
afterEach(async () => {
  await ctx?.app.close();
  ctx = null;
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** `publique` : le point d'entrée public (retiré le 11 novembre 2026) ; les tests internes l'allument avec `ACCES_DEMO`. */
async function app(acces: "on" | "off", interprete: "on" | "off" = "off", publique: "on" | "off" = acces) {
  process.env.ACCES_DEMO = acces;
  process.env.DEMO_PUBLIQUE = publique;
  process.env.INTERPRETE_IA = interprete;
  // Comme en ligne (recette du 7 novembre 2026 : 500 sur test.mobiiz.fr) : le contrôle des mots de passe fuités allumé.
  process.env.MOTS_DE_PASSE_FUITES = "on";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
  return ctx;
}

/** Un visiteur : « Découvrir l'application », puis la session posée par le cookie. */
async function visiteur(c: TestContext) {
  const agent = request.agent(c.app.getHttpServer());
  const res = await agent.post("/v1/public/demo/session").set("origin", WEB_ORIGIN).expect(201);
  expect(res.body).toEqual({ demo: true });
  return agent;
}

describe("l'accès démo", () => {
  it("coupé (par défaut) : pas de bouton, la route n'existe pas ; et jamais en production", async () => {
    const c = await app("off");
    expect((await request(c.app.getHttpServer()).get("/v1/public/demo").expect(200)).body).toEqual({ actif: false });
    await request(c.app.getHttpServer()).post("/v1/public/demo/session").set("origin", WEB_ORIGIN).expect(404);
    expect(await c.prisma.user.count()).toBe(0);
    expect(() => loadConfig({ ...process.env, ACCES_DEMO: "on", VERCEL_ENV: "production" })).toThrow(/ACCES_DEMO/);
  });

  it("LA DÉMONSTRATION PUBLIQUE EST RETIRÉE (Greg, 11 novembre 2026) : `ACCES_DEMO` allumé comme sur test.mobiiz.fr mais `DEMO_PUBLIQUE` coupé (son défaut) : le point d'entrée est fermé, rien n'est créé", async () => {
    const c = await app("on", "off", "off");
    expect((await request(c.app.getHttpServer()).get("/v1/public/demo").expect(200)).body).toEqual({ actif: false });
    const refus = await request(c.app.getHttpServer()).post("/v1/public/demo/session").set("origin", WEB_ORIGIN).expect(404);
    // Une fonctionnalité indisponible, dite sans rien de technique : ni réglage, ni pile, ni cookie de session.
    expect(refus.body.error.code).toBe("not_found");
    expect(JSON.stringify(refus.body)).not.toMatch(/DEMO|ACCES|config|stack|prisma|visiteur/i);
    expect(refus.headers["set-cookie"] ?? []).toEqual([]);
    expect(await c.prisma.user.count()).toBe(0);
    expect(await c.prisma.company.count()).toBe(0);
    expect(await c.prisma.session.count()).toBe(0);
    // Par défaut (aucun réglage) : coupée ; et jamais en production, même demandée.
    expect(loadConfig({ ...process.env, ACCES_DEMO: "on", DEMO_PUBLIQUE: undefined }).demoPublique).toBe(false);
    expect(loadConfig({ ...process.env, ACCES_DEMO: "off", DEMO_PUBLIQUE: "on" }).demoPublique).toBe(false);
    expect(() => loadConfig({ ...process.env, ACCES_DEMO: "off", DEMO_PUBLIQUE: "on", VERCEL_ENV: "production" })).toThrow(/DEMO_PUBLIQUE/);
  });

  it("allumé : sans inscription, un espace fictif à lui seul, des données fictives, aucun e-mail parti", async () => {
    const c = await app("on");
    expect((await request(c.app.getHttpServer()).get("/v1/public/demo").expect(200)).body).toEqual({ actif: true });
    const v = await visiteur(c);
    const me = (await v.get("/v1/me").expect(200)).body;
    expect(estVisiteurDemo(me.user?.email ?? me.email)).toBe(true);
    const chantiers = (await v.get("/v1/projects").expect(200)).body;
    const noms = (chantiers.items ?? chantiers).map((p: { name: string }) => p.name);
    expect(noms).toEqual(expect.arrayContaining(["Démo – Toiture Martin", "Chantier Lannion (démo)"]));
    // Négoces fictifs seulement (adresses du domaine démo, sans boîte aux lettres).
    const negoces = await c.prisma.supplier.findMany({ where: { company: { memberships: { some: { user: { email: { startsWith: "visiteur-" } } } } } } });
    expect(negoces.length).toBeGreaterThanOrEqual(6);
    expect(negoces.every((n) => n.email.endsWith("@demo.mobiiz.fr"))).toBe(true);
    expect(c.emails.sent).toHaveLength(0);
    // Chaque visite a son espace : deux visiteurs ne se voient pas.
    const w = await visiteur(c);
    expect(await c.prisma.company.count()).toBe(2);
    const idsV = (chantiers.items ?? chantiers).map((p: { id: string }) => p.id);
    for (const id of idsV) await w.get(`/v1/projects/${id}`).expect(404);
  });

  it("isolation avec les comptes normaux : le visiteur ne voit rien d'une entreprise, et l'entreprise rien du visiteur", async () => {
    const c = await app("on");
    const A = await signUpWithCompany(c.app, "a@toitures.fr", "Toitures A");
    const projetA = (await A.agent.post("/v1/projects").send({ name: "Toiture Dupont" }).expect(201)).body.id as string;
    c.emails.clear();
    const v = await visiteur(c);
    await v.get(`/v1/projects/${projetA}`).expect(404);
    await v.get("/v1/projects").set("x-company-id", A.companyId).expect(404);
    const deA = (await A.agent.get("/v1/projects").expect(200)).body;
    expect((deA.items ?? deA).map((p: { name: string }) => p.name)).toEqual(["Toiture Dupont"]);
  });

  it("rien ne part : paiement, clé partenaire, SIRET, achats groupés refusés ; un e-mail est simulé", async () => {
    const c = await app("on");
    const v = await visiteur(c);
    for (const [m, u] of [
      ["post", "/v1/abonnement/payer"],
      ["post", "/v1/partner-keys"],
      ["put", "/v1/company/identite"],
      ["post", "/v1/achats-groupes"],
      ["post", "/v1/projects/00000000-0000-0000-0000-000000000000/rapprochement"],
    ] as const) {
      const res = await v[m](u).send({});
      expect(res.status, `${m} ${u}`).toBe(403);
      expect(res.body.error?.message ?? res.text).toMatch(/démonstration/);
    }
    expect(routeInterditeEnDemo("GET", "/v1/achats-groupes")).toBe(false);
    expect(routeInterditeEnDemo("POST", "/v1/projects/x/price-requests")).toBe(false);
    // L'envoi d'un visiteur n'atteint jamais le prestataire, même pour une adresse réelle.
    await runWithRequestContext({ requestId: "t", demo: true }, () => c.emails.send({ to: "devis@negoce-reel.fr", subject: "Demande de prix", text: "x", mustDeliver: true }));
    expect(c.emails.sent).toHaveLength(0);
    expect(c.emails.simules).toHaveLength(1);
  });

  it("aucun appel IA pour un visiteur, même interprète allumé : le code seul répond", async () => {
    const c = await app("on", "on");
    const v = await visiteur(c);
    const questions = [{ numero: 1, cle: "param:matiere", texte: "Ta descente, en PVC, en zinc ou en alu ?", options: [{ label: "PVC", value: "pvc" }, { label: "Zinc", value: "zinc" }], unite: null }];
    const r = (await v.post("/v1/assistant/interpretation").send({ questions, texte: "du métal gris" }).expect(200)).body;
    expect(r.ia).toBe(false);
    expect(await c.prisma.aiExecution.count()).toBe(0);
  });

  it("réinitialisable : un espace de plus de 24 h est effacé à la visite suivante, entreprise et compte compris", async () => {
    const c = await app("on");
    await visiteur(c);
    const ancien = await c.prisma.user.findFirstOrThrow({ where: { email: { startsWith: "visiteur-" } } });
    await c.prisma.user.update({ where: { id: ancien.id }, data: { createdAt: new Date(Date.now() - 25 * 3_600_000) } });
    await visiteur(c);
    expect(await c.prisma.user.findUnique({ where: { id: ancien.id } })).toBeNull();
    expect(await c.prisma.user.count({ where: { email: { startsWith: "visiteur-" } } })).toBe(1);
    expect(await c.prisma.company.count()).toBe(1);
  });

  it("le jeu de démonstration de l'admin (créer, tout effacer) ne touche jamais l'espace d'un visiteur", async () => {
    const c = await app("on");
    await visiteur(c);
    const admin = c.app.get(DemoAdmin);
    await admin.creer(new Date(), null);
    await admin.effacer();
    expect(await c.prisma.user.count({ where: { email: { startsWith: "visiteur-" } } })).toBe(1);
    expect(await c.prisma.supplier.count({ where: { company: { memberships: { some: { user: { email: { startsWith: "visiteur-" } } } } } } })).toBeGreaterThanOrEqual(6);
  });
});
