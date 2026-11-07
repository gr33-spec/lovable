/**
 * LES SPÉCIALITÉS DES NÉGOCES ET L'INSTANTANÉ À L'ENVOI (Greg, 1er novembre 2026) : l'artisan déclare les spécialités de
 * chaque négoce (corrigeables, jamais une valeur inconnue) ; un négoce inscrit lié prête les siennes tant que l'artisan
 * n'en a pas déclaré (une seule source pour l'artisan) ; à l'envoi, ce que l'artisan savait du négoce est figé.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
});

async function liste(agent: Agent) {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Dupont", adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Chatière de ventilation", quantite: "4", unite: "u" }] })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  return q.projetId as string;
}

describe("les spécialités des négoces", () => {
  it("déclarées, corrigées, jamais inconnues ; renvoyées avec leur source", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const s = (await agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example", specialites: ["couverture", "couverture", "charpente"] }).expect(201)).body;
    expect(s).toMatchObject({ specialites: ["couverture", "charpente"], specialitesSource: "artisan" });
    expect((await agent.patch(`/v1/suppliers/${s.id}`).send({ specialites: ["generaliste"] }).expect(200)).body.specialites).toEqual(["generaliste"]);
    expect((await agent.post("/v1/suppliers").send({ name: "X", email: "x@x.example", specialites: ["patisserie"] })).status).toBe(400);
    const sans = (await agent.post("/v1/suppliers").send({ name: "Sans", email: "sans@x.example" }).expect(201)).body;
    expect(sans).toMatchObject({ specialites: [], specialitesSource: null });
  });

  it("un négoce inscrit lié prête ses familles tant que l'artisan n'a rien déclaré", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const n = await ctx.prisma.negoce.create({ data: { nom: "Gédimat", email: "g@gedimat.example", departement: "29", generaliste: true, familles: ["couverture"] } });
    const s = await ctx.prisma.supplier.create({ data: { companyId, name: "Gédimat", email: "g@gedimat.example", negoceId: n.id } });
    expect((await agent.get(`/v1/suppliers/${s.id}`).expect(200)).body).toMatchObject({ specialites: ["generaliste", "couverture"], specialitesSource: "negoce" });
  });

  it("à l'envoi, l'instantané du négoce est figé ; corriger la fiche ensuite ne le réécrit pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const projectId = await liste(agent);
    const s = (await agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example", specialites: ["couverture"] }).expect(201)).body;
    const demande = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.id] }).expect(201)).body;
    await agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`).expect(200);
    await agent.patch(`/v1/suppliers/${s.id}`).send({ name: "Kerbrat Brest", specialites: ["generaliste"] }).expect(200);
    const r = await ctx.prisma.priceRequestRecipient.findUniqueOrThrow({ where: { id: demande.recipients[0].id } });
    expect(r.instantane).toMatchObject({ nom: "Kerbrat", email: "devis@kerbrat.example", specialites: ["couverture"] });
  });

  it("une autre entreprise ne voit ni ne corrige les spécialités", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    const s = (await a.agent.post("/v1/suppliers").send({ name: "Kerbrat", email: "devis@kerbrat.example", specialites: ["couverture"] }).expect(201)).body;
    expect((await b.agent.patch(`/v1/suppliers/${s.id}`).send({ specialites: ["bois"] })).status).toBe(404);
  });
});
