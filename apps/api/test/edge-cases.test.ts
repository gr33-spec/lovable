import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, signUpWithCompany, type TestContext } from "./support/test-app.js";

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

const names = (body: { items: { name: string }[] }) => body.items.map((p) => p.name);

describe("double appui et nouvelles tentatives (Idempotency-Key)", () => {
  it("un double appui sur « Créer mon entreprise » ne crée qu'une entreprise", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const [first, second] = await Promise.all([
      agent.post("/v1/companies").set("idempotency-key", "onboarding-0001").send({ name: "Toitures Martin" }),
      agent.post("/v1/companies").set("idempotency-key", "onboarding-0001").send({ name: "Toitures Martin" }),
    ]);
    // L'un crée ; l'autre rejoue la réponse ou signale « en cours » (réessayable).
    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBe(201);
    expect([201, 409]).toContain(statuses[1]);
    expect((await agent.get("/v1/me")).body.companies).toHaveLength(1);
  });

  it("une nouvelle tentative rejoue exactement la première réponse", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const first = await agent.post("/v1/projects").set("idempotency-key", "chantier-dupont-1").send({ name: "Toiture Dupont" });
    const retry = await agent.post("/v1/projects").set("idempotency-key", "chantier-dupont-1").send({ name: "Toiture Dupont" });
    expect(retry.status).toBe(201);
    expect(retry.headers["idempotent-replay"]).toBe("true");
    expect(retry.body).toEqual(first.body);
    expect((await agent.get("/v1/projects")).body.items).toHaveLength(1);
  });

  it("refuse de réutiliser une clé pour une autre demande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    await agent.post("/v1/projects").set("idempotency-key", "cle-reutilisee").send({ name: "A" });
    const other = await agent.post("/v1/projects").set("idempotency-key", "cle-reutilisee").send({ name: "B" });
    expect(other.status).toBe(409);
    expect(other.body.error.code).toBe("conflict");
  });

  it("libère la clé si la création échoue, pour pouvoir corriger et réessayer", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const invalid = await agent.post("/v1/projects").set("idempotency-key", "cle-apres-erreur").send({ name: " " });
    expect(invalid.status).toBe(400);
    expect(await ctx.prisma.idempotencyRecord.count()).toBe(0);
  });

  it("une clé n'est valable que pour son auteur", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Entreprise A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Entreprise B");
    await a.agent.post("/v1/projects").set("idempotency-key", "meme-cle-0001").send({ name: "Chantier A" });
    const res = await b.agent.post("/v1/projects").set("idempotency-key", "meme-cle-0001").send({ name: "Chantier A" });
    expect(res.status).toBe(201);
    expect(res.headers["idempotent-replay"]).toBeUndefined();
    expect(names((await b.agent.get("/v1/projects")).body)).toEqual(["Chantier A"]);
  });
});

describe("erreurs réseau et envois anormaux", () => {
  it("un corps trop volumineux n'invite pas à réessayer", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const res = await agent.post("/v1/companies").send({ name: "a".repeat(2_000_000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatchObject({ code: "payload_too_large", retryable: false });
  });

  it("un JSON mal formé est une requête invalide", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const res = await agent.post("/v1/companies").set("content-type", "application/json").send('{"name": "X"');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "validation_failed", retryable: false });
  });
});

describe("retrouver un chantier (appel d'un client)", () => {
  async function seed() {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const create = (name: string, clientName?: string, address?: string) =>
      agent.post("/v1/projects").send({ name, clientName, address }).then((r) => r.body.id as string);
    const dupont = await create("Réfection toiture", "M. Dupont", "12 rue des Ardoisiers, Vannes");
    await create("Extension garage", "Mme Moreau", "3 impasse du Port, Auray");
    const lefevre = await create("Bardage façade", "SCI Lefèvre", "Zone artisanale, Vannes");
    await create("Remise 100% neuve", "M. Durand");
    return { agent, dupont, lefevre };
  }

  it("trouve par nom du client, sans tenir compte des accents ni des majuscules", async () => {
    const { agent } = await seed();
    expect(names((await agent.get("/v1/projects?q=dupont")).body)).toEqual(["Réfection toiture"]);
    expect(names((await agent.get("/v1/projects?q=LEFEVRE")).body)).toEqual(["Bardage façade"]);
    expect(names((await agent.get("/v1/projects?q=refection")).body)).toEqual(["Réfection toiture"]);
  });

  it("combine plusieurs mots (tous doivent figurer)", async () => {
    const { agent } = await seed();
    expect(names((await agent.get("/v1/projects?q=vannes")).body).sort()).toEqual(["Bardage façade", "Réfection toiture"]);
    expect(names((await agent.get("/v1/projects?q=vannes%20bardage")).body)).toEqual(["Bardage façade"]);
  });

  it("cherche aussi dans les chantiers archivés", async () => {
    const { agent, dupont } = await seed();
    await agent.patch(`/v1/projects/${dupont}`).send({ status: "archived" });
    expect(names((await agent.get("/v1/projects")).body)).not.toContain("Réfection toiture");
    const found = await agent.get("/v1/projects?q=dupont");
    expect(found.body.items).toMatchObject([{ name: "Réfection toiture", status: "archived" }]);
  });

  it("traite % et _ comme du texte, pas comme des jokers", async () => {
    const { agent } = await seed();
    expect(names((await agent.get("/v1/projects?q=%25")).body)).toEqual(["Remise 100% neuve"]);
    expect((await agent.get("/v1/projects?q=_")).body.items).toHaveLength(0);
  });

  it("ne trouve jamais les chantiers d'une autre entreprise", async () => {
    await seed();
    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Autre entreprise");
    expect((await other.agent.get("/v1/projects?q=dupont")).body.items).toHaveLength(0);
  });

  it("met en premier le chantier sur lequel on a travaillé le plus récemment", async () => {
    const { agent, dupont } = await seed();
    await agent.patch(`/v1/projects/${dupont}`).send({ clientName: "M. et Mme Dupont" });
    expect(names((await agent.get("/v1/projects")).body)[0]).toBe("Réfection toiture");
  });

  it("refuse un curseur de pagination falsifié", async () => {
    const { agent } = await seed();
    const res = await agent.get("/v1/projects?cursor=nimportequoi");
    expect(res.status).toBe(400);
  });
});
