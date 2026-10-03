import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, WEB_ORIGIN, type TestContext } from "./support/test-app.js";
import request from "supertest";

/** AUDIT DE LANCEMENT, B4 : l'artisan emporte ses données (art. 20) et peut tout effacer (art. 17). */
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

async function fullCompany(email: string) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, "Toitures Martin");
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont", clientName: "M. Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
    await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
  }
  await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
  const supplier = await agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr" });
  const request = await agent.post(`/v1/projects/${project.body.id}/price-requests`).send({ supplierIds: [supplier.body.id] });
  expect(request.status).toBe(201);
  return { agent, companyId, projectId: project.body.id as string };
}

describe("RGPD : mes données", () => {
  it("export : un fichier JSON avec le profil, les chantiers, les devis, les listes et les fournisseurs", async () => {
    const { agent } = await fullCompany("a@example.fr");
    const res = await agent.get("/v1/me/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="baticlair-mes-donnees-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(res.body.user).toMatchObject({ email: "a@example.fr" });
    const company = res.body.companies[0];
    expect(company).toMatchObject({ name: "Toitures Martin", role: "owner" });
    expect(company.projects).toEqual([expect.objectContaining({ name: "Toiture Dupont", clientName: "M. Dupont" })]);
    expect(company.documents[0].file).toMatch(/^\/v1\/documents\/.+\/file$/);
    expect(company.takeoffs[0].lines.length).toBeGreaterThan(0);
    expect(company.suppliers).toEqual([expect.objectContaining({ name: "Point.P", email: "devis@pointp.fr" })]);
    expect(company.priceRequests).toHaveLength(1);
  });

  it("suppression : sans le mot SUPPRIMER, rien n'est effacé", async () => {
    const { agent } = await fullCompany("b@example.fr");
    expect((await agent.delete("/v1/me").send({ confirm: "oui" })).status).toBe(400);
    expect((await agent.get("/v1/me")).status).toBe(200);
  });

  it("suppression : le compte, l'entreprise et tout son contenu disparaissent ; la session ne vaut plus rien", async () => {
    const { agent, companyId } = await fullCompany("c@example.fr");
    const other = await fullCompany("d@example.fr");
    const res = await agent.delete("/v1/me").send({ confirm: "SUPPRIMER" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ companiesDeleted: 1, companiesLeft: 0 });

    expect((await agent.get("/v1/me")).status).toBe(401);
    const left = async (model: { count: (a: { where: { companyId: string } }) => Promise<number> }) => model.count({ where: { companyId } });
    expect(await ctx.prisma.user.count({ where: { email: "c@example.fr" } })).toBe(0);
    expect(await ctx.prisma.company.count({ where: { id: companyId } })).toBe(0);
    expect(await left(ctx.prisma.project)).toBe(0);
    expect(await left(ctx.prisma.document)).toBe(0);
    expect(await ctx.prisma.documentBlob.count({ where: { document: { companyId } } })).toBe(0);
    expect(await left(ctx.prisma.takeoff)).toBe(0);
    expect(await left(ctx.prisma.supplier)).toBe(0);
    expect(await left(ctx.prisma.priceRequest)).toBe(0);
    expect(await left(ctx.prisma.aiAnalysis)).toBe(0);
    // L'autre artisan n'est pas touché.
    expect((await other.agent.get("/v1/projects")).body.items).toHaveLength(1);
    // On peut se réinscrire avec la même adresse.
    const again = await request(ctx.app.getHttpServer()).post("/v1/auth/sign-up/email").set("origin", WEB_ORIGIN).send({ email: "c@example.fr", password: "motdepasse-solide", name: "Jean" });
    expect(again.status).toBe(200);
  });

  it("entreprise partagée : l'artisan en est retiré, l'entreprise et ses chantiers restent", async () => {
    const { agent, companyId } = await fullCompany("e@example.fr");
    const second = await signUpWithCompany(ctx.app, "f@example.fr", "Autre");
    const secondUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: "f@example.fr" } });
    await ctx.prisma.membership.create({ data: { companyId, userId: secondUser.id, role: "member" } });
    const res = await agent.delete("/v1/me").send({ confirm: "SUPPRIMER" });
    expect(res.body).toEqual({ companiesDeleted: 0, companiesLeft: 1 });
    expect(await ctx.prisma.project.count({ where: { companyId } })).toBe(1);
    expect(await ctx.prisma.aiAnalysis.count({ where: { companyId, userId: { not: null } } })).toBe(0);
    expect((await second.agent.get("/v1/projects").set("x-company-id", companyId)).body.items).toHaveLength(1);
  });
});
