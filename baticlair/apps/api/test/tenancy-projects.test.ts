import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
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

describe("onboarding et entreprise", () => {
  it("exige une entreprise avant tout accès aux chantiers", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const res = await agent.get("/v1/projects");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("onboarding_required");
  });

  it("crée l'entreprise et en fait l'utilisateur propriétaire", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const created = await agent.post("/v1/companies").send({ name: "  Toitures   Martin  " });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Toitures Martin", role: "owner" });
    const me = await agent.get("/v1/me");
    // Sans métier choisi : « autre métier » (le socle commun).
    expect(me.body.companies).toEqual([{ id: created.body.id, name: "Toitures Martin", role: "owner", trades: ["other"] }]);
  });

  it("enregistre les métiers choisis et permet de les changer", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const created = await agent.post("/v1/companies").send({ name: "Déco Martin", trades: ["painting", "drywall", "painting", "inconnu"] });
    expect(created.body.trades).toEqual(["painting", "drywall"]);

    const doc = await agent
      .post(`/v1/projects/${(await agent.post("/v1/projects").send({ name: "Salon" })).body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(doc.body.trade).toBe("painting,drywall");

    const changed = await agent.patch("/v1/company/trades").send({ trades: ["tiling"] });
    expect(changed.body).toEqual({ trades: ["tiling"] });
    expect((await agent.get("/v1/me")).body.companies[0].trades).toEqual(["tiling"]);
    expect((await agent.patch("/v1/company/trades").send({ trades: "tiling" })).status).toBe(400);
  });

  it("valide le nom de l'entreprise", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    const res = await agent.post("/v1/companies").send({ name: " " });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
  });

  it("demande de choisir l'entreprise quand l'utilisateur en a plusieurs", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Entreprise Un");
    const second = await agent.post("/v1/companies").send({ name: "Entreprise Deux" });

    expect((await agent.get("/v1/projects")).body.error.code).toBe("company_selection_required");

    await agent.post("/v1/projects").set("x-company-id", second.body.id).send({ name: "Chantier B" });
    const inFirst = await agent.get("/v1/projects").set("x-company-id", companyId);
    const inSecond = await agent.get("/v1/projects").set("x-company-id", second.body.id);
    expect(inFirst.body.items).toHaveLength(0);
    expect(inSecond.body.items.map((p: { name: string }) => p.name)).toEqual(["Chantier B"]);
  });
});

describe("chantiers", () => {
  it("crée, lit, liste, renomme et archive un chantier", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");

    const created = await agent
      .post("/v1/projects")
      .send({ name: "Réfection toiture Dupont", clientName: "M. Dupont", address: "" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Réfection toiture Dupont",
      clientName: "M. Dupont",
      address: null,
      status: "active",
    });
    const id = created.body.id as string;

    expect((await agent.get(`/v1/projects/${id}`)).body.name).toBe("Réfection toiture Dupont");

    const renamed = await agent.patch(`/v1/projects/${id}`).send({ name: "Toiture Dupont" });
    expect(renamed.body.name).toBe("Toiture Dupont");

    await agent.patch(`/v1/projects/${id}`).send({ status: "archived" });
    expect((await agent.get("/v1/projects")).body.items).toHaveLength(0);
    expect((await agent.get("/v1/projects?status=archived")).body.items).toHaveLength(1);
  });

  it("pagine du plus récent au plus ancien", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    for (const name of ["C1", "C2", "C3", "C4", "C5"]) {
      await agent.post("/v1/projects").send({ name });
    }
    const page1 = await agent.get("/v1/projects?limit=2");
    expect(page1.body.items.map((p: { name: string }) => p.name)).toEqual(["C5", "C4"]);
    const page2 = await agent.get(`/v1/projects?limit=2&cursor=${page1.body.nextCursor}`);
    expect(page2.body.items.map((p: { name: string }) => p.name)).toEqual(["C3", "C2"]);
    const page3 = await agent.get(`/v1/projects?limit=2&cursor=${page2.body.nextCursor}`);
    expect(page3.body.items.map((p: { name: string }) => p.name)).toEqual(["C1"]);
    expect(page3.body.nextCursor).toBeNull();
  });

  it("rejette les entrées invalides avec le détail des champs", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const empty = await agent.post("/v1/projects").send({ name: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toMatchObject({ code: "validation_failed", details: [{ path: "name" }] });

    const unknownField = await agent.post("/v1/projects").send({ name: "X" });
    const bad = await agent.patch(`/v1/projects/${unknownField.body.id}`).send({ companyId: "autre" });
    expect(bad.status).toBe(400);

    const badLimit = await agent.get("/v1/projects?limit=1000");
    expect(badLimit.status).toBe(400);
  });

  it("répond 404 pour un identifiant inexistant ou mal formé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    expect((await agent.get("/v1/projects/pas-un-uuid")).status).toBe(404);
    expect((await agent.get("/v1/projects/0190c3a0-0000-7000-8000-000000000000")).status).toBe(404);
  });

  it("interdit l'écriture à un membre en lecture seule", async () => {
    const owner = await signUpWithCompany(ctx.app, "owner@example.fr", "Toitures Martin");
    const viewer = await signUp(ctx.app, "viewer@example.fr");
    const viewerUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "viewer@example.fr" } });
    await ctx.prisma.membership.create({
      data: { companyId: owner.companyId, userId: viewerUser.id, role: "viewer" },
    });
    const project = await owner.agent.post("/v1/projects").send({ name: "Chantier" });

    expect((await viewer.get("/v1/projects")).body.items).toHaveLength(1);
    const write = await viewer.post("/v1/projects").send({ name: "Interdit" });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe("forbidden");
    expect((await viewer.patch(`/v1/projects/${project.body.id}`).send({ name: "Y" })).status).toBe(403);
  });
});

describe("isolation entre entreprises", () => {
  it("une entreprise ne peut ni voir, ni lire, ni modifier les chantiers d'une autre", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Entreprise A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Entreprise B");
    const secret = await a.agent.post("/v1/projects").send({ name: "Chantier confidentiel A" });
    const id = secret.body.id as string;

    expect((await b.agent.get("/v1/projects")).body.items).toHaveLength(0);
    expect((await b.agent.get(`/v1/projects/${id}`)).status).toBe(404);
    expect((await b.agent.patch(`/v1/projects/${id}`).send({ name: "Piraté" })).status).toBe(404);

    // Même en désignant explicitement l'entreprise A, B n'y a pas accès.
    const forced = await b.agent.get("/v1/projects").set("x-company-id", a.companyId);
    expect(forced.status).toBe(404);
    expect(forced.body.error.code).toBe("not_found");

    const unchanged = await a.agent.get(`/v1/projects/${id}`);
    expect(unchanged.body.name).toBe("Chantier confidentiel A");
  });
});
