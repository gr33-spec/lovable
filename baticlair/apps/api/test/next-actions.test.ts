import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
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

const next = async (agent: Agent) => (await agent.get("/v1/next-actions").expect(200)).body.items as { kind: string; label: string; detail: string | null; projectName: string }[];

describe("accueil : prochaine action de chaque chantier", () => {
  it("suit le chantier de bout en bout, et rien quand tout est fait", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    expect(await next(agent)).toEqual([]);

    await agent.post("/v1/projects").send({ name: "Toiture Dupont" }).expect(201);
    expect(await next(agent)).toMatchObject([{ kind: "add_quote", label: "Ajouter le devis client", projectName: "Toiture Dupont" }]);

    const { projectId } = (await agent.post("/v1/demo/project").expect(201)).body;
    const demo = async () => (await next(agent)).find((a) => a.projectName === "Démo – Toiture Martin");
    expect(await demo()).toMatchObject({ kind: "prepare_list", label: "Préparer la liste de matériaux" });

    const doc = (await agent.get(`/v1/projects/${projectId}/documents`)).body.items[0];
    const takeoff = (await agent.post(`/v1/documents/${doc.id}/takeoff`).expect(201)).body;
    expect(await demo()).toMatchObject({ kind: "validate_list", label: "Valider la liste" });
    for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
      await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
    }
    await confirmRemaining(agent, projectId, takeoff.id);
    await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
    expect(await demo()).toMatchObject({ kind: "send_requests", label: "Envoyer les demandes" });

    const suppliers = (await agent.get("/v1/suppliers")).body.items as { id: string }[];
    const request = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: suppliers.map((s) => s.id) }).expect(201)).body;
    expect(await demo()).toMatchObject({ kind: "send_requests", detail: "3 demandes à envoyer" });

    await agent.post(`/v1/demo/recipients/${request.recipients[0].id}/quote`).expect(201);
    await agent.post(`/v1/demo/recipients/${request.recipients[1].id}/quote`).expect(201);
    expect(await demo()).toMatchObject({ kind: "compare", label: "Comparer les offres", detail: "2 offres reçues" });

    await agent.post(`/v1/price-requests/${request.id}/analysis`).expect(201);
    // Le dernier fournisseur n'a pas encore reçu sa demande : c'est la prochaine action.
    expect(await demo()).toMatchObject({ kind: "send_requests", detail: "1 demande à envoyer" });
    await agent.patch(`/v1/price-request-recipients/${request.recipients[2].id}`).send({ status: "declined" }).expect(200);
    expect(await demo()).toMatchObject({ kind: "choose_supplier", label: "Choisir un fournisseur" });

    await agent.patch(`/v1/price-requests/${request.id}/classification`).send({ classified: true, retainedSupplierIds: [suppliers[0]!.id] }).expect(200);
    expect(await demo()).toBeUndefined();
  });

  it("n'expose jamais les chantiers d'une autre entreprise", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    await a.agent.post("/v1/projects").send({ name: "Chantier A" }).expect(201);
    expect(await next(b.agent)).toEqual([]);
  });
});
