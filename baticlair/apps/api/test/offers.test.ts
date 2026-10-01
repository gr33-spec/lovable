import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
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
});

/** Deuxième négoce : tuiles moins chères, gouttière absente, livraison facturée. */
const OTHER_ROWS: FixtureRow[] = [
  ["TUI-RC12", "Tuile romane canal rouge 12,5 u/m²", "1 250 u", "1,02", "1 275,00"],
  ["FAI-R", "Faîtière ronde à emboîtement", "42 u", "5,10", "214,20"],
  ["LIT-2738", "Liteau sapin traité classe 2 27x38", "480 ml", "0,60", "288,00"],
  ["ECR-HPV", "Écran sous-toiture HPV 1,5x50 m", "4 rouleau", "85,00", "340,00"],
  ["CRO-INOX", "Crochet inox ardoise 100 mm", "2 paquet", "18,00", "36,00"],
  ["LIV", "Livraison chantier", "1 u", "60,00", "60,00"],
];

/** Chantier, liste validée, deux fournisseurs, demande envoyée et devis déposés. */
async function withTwoQuotes(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  for (const line of takeoff.lines.filter((l: { status: string }) => l.status === "to_verify")) {
    await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200);
  }
  await agent.post(`/v1/takeoffs/${takeoff.id}/validate`).expect(200);
  const a = await agent.post("/v1/suppliers").send({ name: "Point.P", email: "a@pointp.fr" });
  const b = await agent.post("/v1/suppliers").send({ name: "Tuiles & Co", email: "b@tuiles.fr" });
  const request = (await agent.post(`/v1/projects/${project.body.id}/price-requests`).send({ supplierIds: [a.body.id, b.body.id] })).body;
  const [ra, rb] = request.recipients as { id: string }[];
  await agent
    .post(`/v1/price-request-recipients/${ra!.id}/quote`)
    .attach("file", Buffer.from(await makePdf(["devis"], undefined, undefined, "DEVIS POINT.P N° 4471")), { filename: "pointp.pdf", contentType: "application/pdf" })
    .expect(201);
  await agent
    .post(`/v1/price-request-recipients/${rb!.id}/quote`)
    .attach("file", Buffer.from(await makePdf(["devis"], OTHER_ROWS, "Total HT 2 213,20   TVA 10 % 221,32   Total TTC 2 434,52", "DEVIS TUILES & CO N° 88")), {
      filename: "tuiles.pdf",
      contentType: "application/pdf",
    })
    .expect(201);
  return { requestId: request.id as string, ra: ra!.id, rb: rb!.id, supplierA: a.body.id as string, supplierB: b.body.id as string };
}

describe("lecture des devis fournisseurs (IA simulée)", () => {
  it("lit un devis une seule fois, relie chaque ligne à la liste et vérifie les totaux", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { ra } = await withTwoQuotes(agent);
    const before = await ctx.prisma.aiExecution.count();

    const res = await agent.post(`/v1/price-request-recipients/${ra}/analysis`);
    expect(res.status).toBe(201);
    expect(res.body.lines).toHaveLength(6);
    expect(res.body.lines[0]).toMatchObject({ reference: "TUI-RC12", unitPrice: "1.12", lineTotal: "1400", amount: "1400.00", requestLine: 1, matchConfidence: "sure" });
    expect(res.body).toMatchObject({ requestedCount: 6, answeredCount: 6, computedTotalHT: "2805.30", arithmetic: { status: "consistent" } });
    expect(res.body.printed.totalHT).toBe("2805.30");

    // Relire le même devis ne coûte rien de plus.
    await agent.post(`/v1/price-request-recipients/${ra}/analysis`).expect(201);
    expect(await ctx.prisma.aiExecution.count()).toBe(before + 1);
    const execution = await ctx.prisma.aiExecution.findFirstOrThrow({ where: { task: "offer_extraction" } });
    expect(execution).toMatchObject({ promptId: "offer_extraction", promptVersion: 2, status: "success" });
    expect((await agent.get("/v1/ai-usage")).body.analyses.used).toBe(2);
  });

  it("« Lire et comparer » : tous les devis reçus d'un coup, pour une seule analyse", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const { requestId, ra, rb } = await withTwoQuotes(agent);
    const usedBefore = (await agent.get("/v1/ai-usage")).body.analyses.used; // le devis client

    expect((await other.agent.post(`/v1/price-requests/${requestId}/analysis`)).status).toBe(404);

    const res = await agent.post(`/v1/price-requests/${requestId}/analysis`).expect(201);
    expect(res.body).toMatchObject({ read: 2, failed: [] });
    expect(res.body.items.map((o: { recipientId: string }) => o.recipientId).sort()).toEqual([ra, rb].sort());
    expect((await agent.get("/v1/ai-usage")).body.analyses.used).toBe(usedBefore + 1);

    // Rien de nouveau à lire : aucun appel, aucun décompte.
    const executions = await ctx.prisma.aiExecution.count();
    expect((await agent.post(`/v1/price-requests/${requestId}/analysis`).expect(201)).body).toMatchObject({ read: 0 });
    expect(await ctx.prisma.aiExecution.count()).toBe(executions);
    expect((await agent.get("/v1/ai-usage")).body.analyses.used).toBe(usedBefore + 1);
    expect((await agent.get(`/v1/price-requests/${requestId}/comparison`)).body.suppliers).toHaveLength(2);
  });

  it("compare ligne à ligne avec un total honnête (article manquant, livraison)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { requestId, ra, rb, supplierA, supplierB } = await withTwoQuotes(agent);
    await agent.post(`/v1/price-request-recipients/${ra}/analysis`).expect(201);
    const b = await agent.post(`/v1/price-request-recipients/${rb}/analysis`);
    expect(b.body.lines.find((l: { designation: string }) => l.designation === "Livraison chantier")).toMatchObject({ kind: "fee", requestLine: null });

    const cmp = (await agent.get(`/v1/price-requests/${requestId}/comparison`)).body;
    const [sa, sb] = cmp.suppliers;
    expect(sa).toMatchObject({ supplierId: supplierA, name: "Point.P", missingCount: 0, comparability: "complete", comparableTotalHT: "2805.30" });
    // Gouttière absente chez le second : estimée au prix de l'autre, jamais comptée à zéro.
    expect(sb).toMatchObject({ supplierId: supplierB, missingCount: 1, feesHT: "60.00", comparability: "estimated", estimatedPartHT: "511.20" });
    expect(sb.comparableTotalHT).toBe("2724.40");
    const tuile = cmp.items[0];
    expect(tuile).toMatchObject({ index: 1, designation: "Tuile romane canal rouge 12,5 u/m²", lowestSupplierId: supplierB });
    const gouttiere = cmp.items[5];
    expect(gouttiere.offers.find((o: { supplierId: string }) => o.supplierId === supplierB)).toMatchObject({ status: "missing", estimatedAmount: "511.20" });

    // L'artisan corrige une correspondance : la comparaison suit.
    const tuileB = b.body.lines[0];
    const edited = await agent.patch(`/v1/offer-lines/${tuileB.id}`).send({ requestLine: null });
    expect(edited.body.lines[0]).toMatchObject({ requestLine: null, matchConfirmed: true, edited: true });
    const after = (await agent.get(`/v1/price-requests/${requestId}/comparison`)).body;
    expect(after.suppliers[1].missingCount).toBe(2);
    expect((await agent.patch(`/v1/offer-lines/${tuileB.id}`).send({ requestLine: 99 })).status).toBe(400);

    const list = (await agent.get(`/v1/price-requests/${requestId}/offers`)).body;
    expect(list.items.map((o: { recipientId: string }) => o.recipientId)).toEqual([ra, rb]);
  });

  it("« Classé » : fournisseurs retenus facultatifs, puis réouverture", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { requestId, supplierB } = await withTwoQuotes(agent);
    const classified = await agent.patch(`/v1/price-requests/${requestId}/classification`).send({ classified: true, retainedSupplierIds: [supplierB] });
    expect(classified.status).toBe(200);
    expect(classified.body.classifiedAt).not.toBeNull();
    expect(classified.body.retainedSupplierIds).toEqual([supplierB]);
    expect((await agent.patch(`/v1/price-requests/${requestId}/classification`).send({ classified: true, retainedSupplierIds: ["x"] })).status).toBe(400);
    const reopened = await agent.patch(`/v1/price-requests/${requestId}/classification`).send({ classified: false });
    expect(reopened.body).toMatchObject({ classifiedAt: null, retainedSupplierIds: [] });
  });

  it("refuse sans devis déposé et isole les entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const { requestId, ra } = await withTwoQuotes(a.agent);
    await a.agent.post(`/v1/price-request-recipients/${ra}/analysis`).expect(201);

    expect((await b.agent.post(`/v1/price-request-recipients/${ra}/analysis`)).status).toBe(404);
    expect((await b.agent.get(`/v1/price-requests/${requestId}/comparison`)).status).toBe(404);
    const line = (await a.agent.get(`/v1/price-requests/${requestId}/offers`)).body.items[0].lines[0];
    expect((await b.agent.patch(`/v1/offer-lines/${line.id}`).send({ requestLine: null })).status).toBe(404);
    expect((await b.agent.get(`/v1/price-requests/${requestId}/offers`)).status).toBe(404);
    expect((await b.agent.patch(`/v1/price-requests/${requestId}/classification`).send({ classified: true })).status).toBe(404);
    const intrusion = await b.agent
      .post(`/v1/price-request-recipients/${ra}/quote`)
      .attach("file", Buffer.from(await makePdf(["devis"], undefined, undefined, "DEVIS INTRUS")), { filename: "x.pdf", contentType: "application/pdf" });
    expect(intrusion.status).toBe(404);

    // Devis retiré : plus rien à lire.
    const request = (await a.agent.get(`/v1/projects/${(await a.agent.get("/v1/projects")).body.items[0].id}/price-requests`)).body.items[0];
    const recipient = request.recipients[1];
    await a.agent.delete(`/v1/documents/${recipient.document.id}`).expect(204);
    const res = await a.agent.post(`/v1/price-request-recipients/${recipient.id}/analysis`);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ reason: "no_quote" });
  });
});
