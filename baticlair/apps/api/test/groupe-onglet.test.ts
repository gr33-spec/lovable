import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * L'ONGLET « GROUPÉ » (demande du fondateur, 2026-10-20) : visible même sans SIRET ni devis, il dit les trois étapes qui
 * manquent (SIRET vérifié, un devis déposé, des négoces) et les coche une à une ; tout rempli, il montre « Mes lots ».
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("groupé, l'onglet : les trois étapes, puis « Mes lots »", { timeout: 30_000 }, () => {
  it("chaque étape se coche quand elle est faite ; « Mes lots » liste mes besoins avec leur chantier et leur lot", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "onglet@example.fr", "Carrelages Onglet", ["tiling"]);
    let etat = (await agent.get("/v1/groupe").expect(200)).body;
    expect(etat).toMatchObject({ eligible: false, etapes: { siret: false, devis: false, negoces: false } });
    // Un devis déposé.
    let q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }] }).expect(201)).body as { id: string; projetId: string; questions: { id: string }[] };
    const ok = q.questions.filter((x) => x.id.startsWith("ratio:")).map((x) => ({ question: x.id, valeur: "ok" }));
    if (ok.length > 0) q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: ok }).expect(201)).body;
    etat = (await agent.get("/v1/groupe").expect(200)).body;
    expect(etat.etapes).toEqual({ siret: false, devis: true, negoces: false });
    // Le SIRET renseigné puis vérifié.
    await agent.patch("/v1/company/profile").send({ name: "Carrelages Onglet", address: "3 rue des Ajoncs, 22300 Lannion", siret: "73282932000074", phone: null, email: null }).expect(200);
    await agent.post("/v1/groupe/siret").expect(200);
    await agent.post("/v1/groupe/negoces").send({ nom: "Négoce Carrelage", email: "carrelage@example.com", familles: ["second_oeuvre"] }).expect(201);
    etat = (await agent.get("/v1/groupe").expect(200)).body;
    expect(etat).toMatchObject({ eligible: true, etapes: { siret: true, devis: true, negoces: true } });
    // « Mes lots » : vide, puis un besoin proposé avec son chantier et son lot.
    expect((await agent.get("/v1/groupe/lots").expect(200)).body.besoins).toEqual([]);
    await agent.patch(`/v1/projects/${q.projetId}`).send({ address: "3 rue des Ajoncs, 22300 Lannion" }).expect(200);
    const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
    const carreaux = toBuy.find((b) => /^Carreau de sol 60×60/.test(b.label))!;
    await agent.post(`/v1/projects/${q.projetId}/groupe`).send({ articles: [carreaux.key], fenetre: { tot: "2026-11-02", tard: "2026-11-20" }, statut: "en_attente", engagement: true }).expect(201);
    const lots = (await agent.get("/v1/groupe/lots").expect(200)).body.besoins;
    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ projectId: q.projetId, statut: "en_attente", lot: { statut: "ouvert" } });
    expect(typeof lots[0].lot.numero).toBe("number");
    expect(typeof lots[0].chantier).toBe("string");
    void companyId;
  });
});
