import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type ExtractionRequest, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * RIEN NE PART VIDE (retour du fondateur, 2026-10-09) : une lecture qui ne trouve aucune ligne n'est jamais une liste à
 * envoyer. Elle se dit (« nothing_read » : l'écran dit « Je n'ai rien lu dans ce devis », avec « Réessayer » et
 * « Redéposer le PDF ») et se relance ; une liste vidée ne se valide pas et ne part pas (400 « empty_list »).
 */
class SometimesEmpty implements TakeoffExtractor {
  readonly provider = "fake";
  empty = true;
  private inner = new FakeTakeoffExtractor();
  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const r = await this.inner.extract(request);
    return this.empty && r.output ? { ...r, output: { ...r.output, lines: [] } } : r;
  }
}
const extractor = new SometimesEmpty();
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(TAKEOFF_EXTRACTOR).useValue(extractor));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  extractor.empty = true;
});

async function quote(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont", address: "12 rue des Lilas, Vannes" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projectId: project.body.id as string, documentId: doc.body.id as string };
}

describe("rien ne part vide", () => {
  it("aucune ligne lue : pas de liste, l'échec dit « nothing_read », et la lecture se relance", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "v@example.fr", "Toitures Martin");
    const { projectId, documentId } = await quote(agent);
    // Comme l'écran : la porte /v1/quantitatifs lance la lecture du devis déposé.
    await agent.post("/v1/quantitatifs").send({ documentId });
    const q = (await agent.get(`/v1/quantitatifs?projetId=${projectId}`)).body.items[0];
    expect(q.etat).toBe("erreur");
    expect(q.erreur).toEqual({ raison: "nothing_read" });
    expect((await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff).toBeNull();

    // « Réessayer » : la lecture repart et, cette fois, trouve les lignes.
    extractor.empty = false;
    const retry = await agent.post("/v1/quantitatifs").send({ documentId });
    expect([200, 201, 202]).toContain(retry.status);
    expect((await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.lines.length).toBeGreaterThan(0);
  });

  it("une liste vidée ne se valide pas et ne part chez aucun fournisseur (400 empty_list)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "w@example.fr", "Toitures Martin");
    extractor.empty = false;
    const { projectId, documentId } = await quote(agent);
    const takeoff = (await agent.post(`/v1/documents/${documentId}/takeoff`)).body;
    for (const l of takeoff.lines as { id: string }[]) await agent.delete(`/v1/takeoff-lines/${l.id}`).expect(200);
    const left = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.lines as { id: string; designation: string }[];
    expect(left, JSON.stringify(left)).toEqual([]);
    const validate = await agent.post(`/v1/takeoffs/${takeoff.id}/validate`);
    expect(validate.status).toBe(400);
    expect(JSON.stringify(validate.body)).toContain("empty_list");
    const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce test", email: "test@example.fr" }).expect(201)).body.id as string;
    const send = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplier] });
    expect(send.status).toBe(400);
  });
});
