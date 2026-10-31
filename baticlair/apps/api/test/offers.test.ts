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

/** Une lecture faite avant le 28 octobre 2026 (point 7) : gardée, toujours visible et corrigeable. */
async function ancienneLecture(companyId: string, documentId: string) {
  return ctx.prisma.supplierOffer.create({
    data: {
      companyId,
      documentId,
      promptId: "offer_extraction",
      promptVersion: 2,
      model: "ancien",
      totalHT: "1400.00",
      lines: { create: [{ position: 1, kind: "main", designation: "Tuile romane canal rouge 12,5 u/m²", quantityRaw: "1 250 u", unitPrice: "1.12", lineTotal: "1400", requestIndex: 0, matchConfidence: "probable" }] },
    },
  });
}

describe("devis reçus des négoces de l'artisan : plus de lecture IA (Greg, 28 octobre 2026, point 7)", () => {
  it("aucune lecture, ni d'un devis, ni de tous : refus clair, aucun appel IA, aucune analyse décomptée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { requestId, ra } = await withTwoQuotes(agent);
    const appels = await ctx.prisma.aiExecution.count({ where: { task: "offer_extraction" } });
    const utilisees = (await agent.get("/v1/ai-usage")).body.analyses.used;

    const un = await agent.post(`/v1/price-request-recipients/${ra}/analysis`).expect(409);
    expect(un.body.error.details).toMatchObject({ reason: "lecture_devis_negoce_retiree", message: "Mobiiz ne lit plus les devis de tes négoces : ouvre le devis, puis retiens le négoce de ton choix." });
    expect((await agent.post(`/v1/price-requests/${requestId}/analysis`).expect(409)).body.error.details.reason).toBe("lecture_devis_negoce_retiree");
    expect(await ctx.prisma.aiExecution.count({ where: { task: "offer_extraction" } })).toBe(appels);
    expect((await agent.get("/v1/ai-usage")).body.analyses.used).toBe(utilisees);
    expect((await agent.get(`/v1/price-requests/${requestId}/offers`).expect(200)).body).toEqual({ aiAvailable: false, items: [] });
    // Le devis reçu reste là, à ouvrir tel quel.
    const demande = (await agent.get(`/v1/projects/${(await agent.get("/v1/projects")).body.items[0].id}/price-requests`)).body.items[0];
    expect(demande.recipients.map((r: { status: string; document: { name: string } | null }) => [r.status, r.document?.name])).toEqual([
      ["received", "pointp.pdf"],
      ["received", "tuiles.pdf"],
    ]);
  });

  it("une lecture d'avant reste visible et corrigeable ; la comparaison du code suit", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { requestId, ra } = await withTwoQuotes(agent);
    const demande = (await agent.get(`/v1/projects/${(await agent.get("/v1/projects")).body.items[0].id}/price-requests`)).body.items[0];
    await ancienneLecture(companyId, demande.recipients.find((r: { id: string }) => r.id === ra).document.id);
    const lues = (await agent.get(`/v1/price-requests/${requestId}/offers`)).body;
    expect(lues.items.map((o: { recipientId: string }) => o.recipientId)).toEqual([ra]);
    // Relire une lecture déjà faite ne coûte rien et ne relance rien.
    expect((await agent.post(`/v1/price-request-recipients/${ra}/analysis`).expect(201)).body.lines).toHaveLength(1);
    const ligne = lues.items[0].lines[0];
    expect((await agent.patch(`/v1/offer-lines/${ligne.id}`).send({ requestLine: null }).expect(200)).body.lines[0]).toMatchObject({ requestLine: null, edited: true });
    expect((await agent.get(`/v1/price-requests/${requestId}/comparison`)).body.suppliers).toHaveLength(1);
  });

  it("« Je retiens ce négoce » : fournisseur retenu, puis réouverture", async () => {
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

  it("isole les entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const { requestId, ra } = await withTwoQuotes(a.agent);
    const demande = (await a.agent.get(`/v1/projects/${(await a.agent.get("/v1/projects")).body.items[0].id}/price-requests`)).body.items[0];
    await ancienneLecture(a.companyId, demande.recipients[0].document.id);

    expect((await b.agent.post(`/v1/price-request-recipients/${ra}/analysis`)).status).toBe(404);
    expect((await b.agent.post(`/v1/price-requests/${requestId}/analysis`)).status).toBe(404);
    expect((await b.agent.get(`/v1/price-requests/${requestId}/comparison`)).status).toBe(404);
    const line = (await a.agent.get(`/v1/price-requests/${requestId}/offers`)).body.items[0].lines[0];
    expect((await b.agent.patch(`/v1/offer-lines/${line.id}`).send({ requestLine: null })).status).toBe(404);
    expect((await b.agent.get(`/v1/price-requests/${requestId}/offers`)).status).toBe(404);
    expect((await b.agent.patch(`/v1/price-requests/${requestId}/classification`).send({ classified: true })).status).toBe(404);
    const intrusion = await b.agent
      .post(`/v1/price-request-recipients/${ra}/quote`)
      .attach("file", Buffer.from(await makePdf(["devis"], undefined, undefined, "DEVIS INTRUS")), { filename: "x.pdf", contentType: "application/pdf" });
    expect(intrusion.status).toBe(404);

    // Devis retiré : plus rien à ouvrir.
    const recipient = demande.recipients[1];
    await a.agent.delete(`/v1/documents/${recipient.document.id}`).expect(204);
    const res = await a.agent.post(`/v1/price-request-recipients/${recipient.id}/analysis`);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ reason: "no_quote" });
  });
});
