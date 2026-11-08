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

  it("refuse une demande vide ou trop longue, et sans session", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B");
    await agent.post("/v1/catalogue/comprendre").send({ lignes: [] }).expect(400);
    await agent.post("/v1/catalogue/comprendre").send({ lignes: [{ libelle: "x".repeat(201) }] }).expect(400);
    const { default: request } = await import("supertest");
    await request(ctx.app.getHttpServer()).post("/v1/catalogue/comprendre").send({ lignes: [{ libelle: "lito" }] }).expect(401);
  });
});
