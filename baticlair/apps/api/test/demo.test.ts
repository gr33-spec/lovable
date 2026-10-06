import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";
import { confirmRemaining } from "./support/confirm.js";

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

describe("mode démo", () => {
  it("permet tout le parcours seul : chantier fictif, fournisseurs fictifs qui répondent, comparaison", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "demo@example.fr", "Toitures Martin");

    const created = await agent.post("/v1/demo/project").expect(201);
    const projectId = created.body.projectId as string;
    const docs = (await agent.get(`/v1/projects/${projectId}/documents`)).body.items;
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ purpose: "client_quote" });

    // Les 3 fournisseurs fictifs sont dans le carnet, une seule fois même après un second chantier démo.
    await agent.post("/v1/demo/project").expect(201);
    const suppliers = (await agent.get("/v1/suppliers")).body.items as { id: string; email: string }[];
    expect(suppliers.filter((s) => s.email.endsWith("@demo.baticlair.fr"))).toHaveLength(3);

    // Liste de matériaux (IA simulée), validée.
    const takeoff = (await agent.post(`/v1/documents/${docs[0].id}/takeoff`).expect(201)).body;
    expect(takeoff.lines.length).toBeGreaterThan(3);
    for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
      await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
    }
    await confirmRemaining(agent, projectId, takeoff.id);
    await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);

    // Demande aux 3 fournisseurs fictifs ; chacun « répond » en un appui.
    const request = (
      await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: suppliers.map((s) => s.id) }).expect(201)
    ).body;
    for (const r of request.recipients as { id: string }[]) {
      const res = await agent.post(`/v1/demo/recipients/${r.id}/quote`).expect(201);
      const mine = res.body.recipients.find((x: { id: string }) => x.id === r.id);
      expect(mine).toMatchObject({ status: "received" });
      expect(mine.document).not.toBeNull();
      await agent.post(`/v1/price-request-recipients/${r.id}/analysis`).expect(201);
    }

    const comparison = (await agent.get(`/v1/price-requests/${request.id}/comparison`)).body;
    expect(comparison.suppliers).toHaveLength(3);
    // Négoce Breizh oublie un article : la comparaison le signale.
    const byName = (prefix: string) => comparison.suppliers.find((s: { name: string }) => s.name.startsWith(prefix));
    expect(byName("Négoce Breizh")).toMatchObject({ missingCount: 1, arithmetic: "consistent" });
    expect(byName("Tuilerie de l'Ouest")).toMatchObject({ missingCount: 0, feesHT: "45.00", arithmetic: "consistent" });
    expect(byName("Matériaux Atlantique")).toMatchObject({ missingCount: 0, arithmetic: "consistent" });

    // Une seconde réponse est refusée (devis déjà reçu).
    expect((await agent.post(`/v1/demo/recipients/${request.recipients[0].id}/quote`)).status).toBe(409);
  });

  it("un vrai fournisseur peut recevoir un devis fictif de test, clairement marqué ; une autre entreprise n'a accès à rien", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const { projectId } = (await a.agent.post("/v1/demo/project").expect(201)).body;
    const doc = (await a.agent.get(`/v1/projects/${projectId}/documents`)).body.items[0];
    const takeoff = (await a.agent.post(`/v1/documents/${doc.id}/takeoff`)).body;
    for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
      await a.agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
    }
    await confirmRemaining(a.agent, projectId, takeoff.id);
    await a.agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
    const real = (await a.agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr" })).body;
    const request = (await a.agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [real.id] })).body;
    const recipientId = request.recipients[0].id as string;

    expect((await b.agent.post(`/v1/demo/recipients/${recipientId}/quote`)).status).toBe(404);

    const res = await a.agent.post(`/v1/demo/recipients/${recipientId}/quote`).expect(201);
    expect(res.body.recipients[0]).toMatchObject({ status: "received", document: { name: "devis-fictif-test-devis.pdf" } });
    await a.agent.post(`/v1/price-request-recipients/${recipientId}/analysis`).expect(201);
  });
});
