import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §49.4 (retour du fondateur, 2026-10-09, D-2026-018) : la question « tu façonnes ? » d'une pièce de zinguerie écrite au
 * devis se répond à l'écran des questions, AVANT le calcul. Sans réponse, le calcul est refusé (400 faconnage_required) :
 * aucune pièce n'arrive dans la liste sans réponse, et ses pattes ne sortent jamais vertes sur une hypothèse.
 */
const ROWS: FixtureRow[] = [
  ["", "Joint debout zinc, pattes fixes et coulissantes", "91 m²", "120,00", "10 920,00"],
  ["", "Voligeage sapin traité 18 mm", "91 m²", "20,00", "1 820,00"],
];

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

describe("§49.4 : le façonnage est obligatoire avant le calcul", () => {
  it("sans réponse : 422 faconnage_required ; avec : la liste sort, pattes fixes et coulissantes", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "f@example.fr", "Toitures Le Gall");
    const project = await agent.post("/v1/projects").send({ name: "Joint debout", address: "3 rue de Siam, 29200 Brest" });
    const doc = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"], ROWS)), { filename: "devis.pdf", contentType: "application/pdf" });
    await agent.post(`/v1/documents/${doc.body.id}/takeoff`);
    const q = (await agent.get(`/v1/quantitatifs?projetId=${project.body.id}&ecran=1`)).body.items[0] as { id: string; phase: string };
    expect(q.phase).toBe("questions");

    const refused = await agent.post(`/v1/quantitatifs/${q.id}/calcul`).send({ reponses: [] });
    expect(refused.status).toBe(400);
    expect(JSON.stringify(refused.body)).toContain("faconnage_required");
    const key = /param:faconnage[^"]*/.exec(JSON.stringify(refused.body))![0];

    const ok = await agent
      .post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`)
      .send({ reponses: [{ question: key, valeur: "1", unite: "u" }] });
    expect(ok.status).toBe(200);
    const text = JSON.stringify(ok.body);
    expect(text).toContain("Pattes fixes");
    expect(text).toContain("Pattes coulissantes");
  });
});
