import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * GREG, 19 NOVEMBRE 2026 : une liste faite pour un besoin groupé (chemin « Besoin groupé ») ne doit plus apparaître dans
 * « À faire : Vérifier ta liste » ni dans Demandes › Négoces. Elle vit dans Demandes › Groupées (« Listes à finir » tant
 * qu'aucun besoin n'est publié). Partie un jour chez un négoce, elle redevient une liste ordinaire.
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

describe("la liste d'un besoin groupé", () => {
  it("n'est ni dans « À faire », ni dans les listes ordinaires ; elle se reprend dans « Listes à finir »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const ordinaire = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Liteau sapin traité 27×38", quantite: "100", unite: "m" }] }).expect(201)).body.projetId as string;
    const groupee = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Ardoise naturelle 32×22", quantite: "1000", unite: "pièces" }] }).expect(201)).body.projetId as string;
    await agent.patch(`/v1/projects/${groupee}`).send({ origine: "achat-groupe" }).expect(200);
    // Seule « achat-groupe » se pose.
    await agent.patch(`/v1/projects/${groupee}`).send({ origine: "autre" }).expect(400);

    const actions = (await agent.get("/v1/next-actions").expect(200)).body.items as { projectId: string; kind: string }[];
    expect(actions.map((a) => a.projectId)).toContain(ordinaire);
    expect(actions.map((a) => a.projectId)).not.toContain(groupee);

    const ids = async (q = "") => ((await agent.get(`/v1/projects?limit=30${q}`).expect(200)).body.items as { id: string }[]).map((p) => p.id);
    expect(await ids()).toEqual([ordinaire]);
    expect(await ids("&resume=1")).toEqual([ordinaire]);
    expect(await ids("&etape=a-preparer")).toEqual([ordinaire]);
    expect(await ids("&groupe=a-finir")).toEqual([groupee]);
    expect((await ids("&groupe=toutes")).sort()).toEqual([ordinaire, groupee].sort());
    // La fiche s'ouvre toujours par son adresse.
    await agent.get(`/v1/projects/${groupee}`).expect(200);

    // Partie chez un négoce : elle redevient une liste ordinaire, avec ses actions.
    const { takeoff } = (await agent.get(`/v1/projects/${groupee}/takeoff`).expect(200)).body;
    await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
    const fournisseur = (await agent.post("/v1/suppliers").send({ name: "Négoce Bleu", email: "bleu@negoce.example" }).expect(201)).body.id as string;
    const demande = (await agent.post(`/v1/projects/${groupee}/price-requests`).send({ supplierIds: [fournisseur] }).expect(201)).body;
    await agent.post(`/v1/price-request-recipients/${demande.recipients[0].id}/send`).expect(200);
    expect(await ids()).toContain(groupee);
    expect(await ids("&groupe=a-finir")).toEqual([]);
  });

  it("une autre entreprise ne marque pas la liste", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Dupont");
    const projet = (await a.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Ardoise", quantite: "10", unite: "pièces" }] }).expect(201)).body.projetId as string;
    await b.agent.patch(`/v1/projects/${projet}`).send({ origine: "achat-groupe" }).expect(404);
    expect(((await a.agent.get("/v1/projects").expect(200)).body.items as { id: string }[]).map((p) => p.id)).toEqual([projet]);
  });
});
