import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * CORRECTION APRÈS TEST DE GREG (30 octobre 2026, point 2) : « je vais dans le menu puis je reviens : tout est perdu ».
 * Un parcours commencé est gardé sur le serveur (clé, étape, saisie), relu au retour, listé pour l'accueil, effacé une
 * fois fini ; jamais celui d'une autre entreprise.
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

const brouillon = { cle: "achat-groupe:nouveau", type: "achat-groupe", titre: "Ton achat groupé · 1 ligne", url: "/achats-groupes/lancer", etape: 3, donnees: { lignes: [{ designation: "Ardoise", qte: "900", unite: "pièces" }], livraison: "22300 Lannion" } };

describe("les brouillons des parcours", () => {
  it("écrit, relu à l'étape quittée, listé pour l'accueil, réécrit, puis effacé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    expect((await agent.put("/v1/brouillons").send(brouillon)).status).toBe(200);
    const un = (await agent.get("/v1/brouillons/un?cle=achat-groupe:nouveau")).body.brouillon;
    expect(un).toMatchObject({ etape: 3, url: "/achats-groupes/lancer", donnees: brouillon.donnees });
    await agent.put("/v1/brouillons").send({ ...brouillon, etape: 4 }).expect(200);
    const liste = (await agent.get("/v1/brouillons")).body.items;
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ type: "achat-groupe", titre: "Ton achat groupé · 1 ligne", etape: 4 });
    await agent.delete("/v1/brouillons?cle=achat-groupe:nouveau").expect(200);
    expect((await agent.get("/v1/brouillons")).body.items).toHaveLength(0);
  });

  it("jamais le brouillon d'une autre entreprise ; une clé ou une adresse de reprise douteuse est refusée", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    await a.agent.put("/v1/brouillons").send(brouillon).expect(200);
    expect((await b.agent.get("/v1/brouillons")).body.items).toHaveLength(0);
    expect((await b.agent.get("/v1/brouillons/un?cle=achat-groupe:nouveau")).body.brouillon).toBeNull();
    await b.agent.delete("/v1/brouillons?cle=achat-groupe:nouveau").expect(200);
    expect((await a.agent.get("/v1/brouillons")).body.items).toHaveLength(1);
    expect((await a.agent.put("/v1/brouillons").send({ ...brouillon, url: "https://ailleurs.example" })).status).toBe(400);
    expect((await a.agent.put("/v1/brouillons").send({ ...brouillon, cle: "../x" })).status).toBe(400);
  });
});
