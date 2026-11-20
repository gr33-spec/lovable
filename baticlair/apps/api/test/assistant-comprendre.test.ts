import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { confirmer, etapeSuivante, type ArticleCompris } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'ASSISTANT COMPREND LE LANGAGE DES ARTISANS (Greg, 8 novembre 2026, « 36 mètres de Lito ») : `POST
 * /v1/catalogue/comprendre` rapproche chaque désignation dite du catalogue de la base (modifications de l'admin comprises),
 * sans appel IA, et rend de quoi confirmer puis poser les seules questions utiles. Un mot inconnu : `null`.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("POST /v1/catalogue/comprendre", () => {
  it("« Lito » → liteaux à confirmer, puis la section ; « trucs bizarres » → rien", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures du Trégor");
    const r = await agent
      .post("/v1/catalogue/comprendre")
      .send({ lignes: [{ libelle: "Lito", unite: "m" }, { libelle: "Trucs bizarres", unite: null }] })
      .expect(200);
    const [lito, rien] = r.body.articles as (ArticleCompris | null)[];
    expect(rien).toBeNull();
    expect(lito!.certitude).toBe("probable");
    expect(etapeSuivante(lito!, "36", "m")).toEqual({ type: "confirmer", phrase: "Tu veux dire 36 mètres linéaires de liteaux ?" });
    expect(etapeSuivante(confirmer(lito!), "36", "m")).toMatchObject({ type: "caracteristique", question: "Quelle section ?" });
  });

  // Greg, 13 novembre 2026 (« cœur métier ») : l'assistant se sert du catalogue comme source ; il dit la famille probable,
  // ne crée jamais un article inconnu et ne force jamais une correspondance.
  it("la famille probable est dite, lue au catalogue ; un mot inconnu reste « à vérifier » ; rien n'est écrit en base", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@toitures.fr", "Toitures C");
    await agent.get("/v1/catalogue").expect(200);
    const avant = await ctx.prisma.catalogueArticle.count();
    const r = await agent
      .post("/v1/catalogue/comprendre")
      .send({ lignes: [{ libelle: "bobine zinc naturel 0,65", unite: "m" }, { libelle: "membrane epdm", unite: null }, { libelle: "Schmilblick", unite: "pièces" }] })
      .expect(200);
    const [bobine, epdm, inconnu] = r.body.articles as (ArticleCompris | null)[];
    expect(bobine!.produits[0]).toMatchObject({ metier: "zinguerie", produit: "Bobine de zinc", contexte: "Zinguerie · Feuilles, bobines et bandes" });
    expect(epdm!.produits[0]).toMatchObject({ metier: "etancheite", contexte: "Étanchéité · Membranes synthétiques" });
    // Aucune correspondance fiable : null, la ligne garde les mots de l'artisan ; aucun article n'est créé.
    expect(inconnu).toBeNull();
    expect(await ctx.prisma.catalogueArticle.count()).toBe(avant);
    // Ni quantité ni unité inventée : la réponse ne porte que ce que le catalogue écrit.
    expect(JSON.stringify(bobine)).not.toMatch(/"quantite"/);
  });

  it("refuse une demande vide ou trop longue, et sans session", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B");
    await agent.post("/v1/catalogue/comprendre").send({ lignes: [] }).expect(400);
    await agent.post("/v1/catalogue/comprendre").send({ lignes: [{ libelle: "x".repeat(201) }] }).expect(400);
    const { default: request } = await import("supertest");
    await request(ctx.app.getHttpServer()).post("/v1/catalogue/comprendre").send({ lignes: [{ libelle: "lito" }] }).expect(401);
  });
});
