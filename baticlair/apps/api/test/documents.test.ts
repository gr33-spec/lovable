import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

// Limites basses pour tester les refus sans fabriquer d'énormes fichiers.
process.env.DOCUMENT_MAX_BYTES = "200000";
process.env.DOCUMENT_MAX_PAGES = "6";

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

async function chantier(agent: Agent): Promise<string> {
  const res = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  return res.body.id as string;
}

const upload = (agent: Agent, projectId: string, bytes: Uint8Array, name = "devis.pdf", purpose = "client_quote") =>
  agent
    .post(`/v1/projects/${projectId}/documents`)
    .field("purpose", purpose)
    .attach("file", Buffer.from(bytes), { filename: name, contentType: "application/pdf" });

describe("dépôt et lecture d'un devis (sans IA)", () => {
  it("lit chaque page et choisit texte, image ou écarter", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis", "scan", "cgv", "totaux"]);

    const res = await upload(agent, projectId, pdf, "Devis Dupont é.pdf");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Devis Dupont é.pdf",
      purpose: "client_quote",
      trade: "roofing",
      status: "read",
      pageCount: 4,
      duplicate: false,
      reading: { status: "completed", pagesTotal: 4, pagesText: 2, pagesVision: 1, pagesSkipped: 1, actualAiCostEur: "0" },
    });
    // Estimation positive, calculée sans aucun appel IA.
    expect(Number(res.body.reading.estimatedAiCostEur)).toBeGreaterThan(0);

    const detail = await agent.get(`/v1/documents/${res.body.id}`);
    expect(detail.body.pages.map((p: { route: string; reason: string }) => [p.route, p.reason])).toEqual([
      ["text", "clean_text"],
      ["vision", "no_text_layer"],
      ["skip", "boilerplate"],
      ["text", "clean_text"],
    ]);
    const firstPage = detail.body.pages[0];
    expect(firstPage.lines[0]).toEqual({ ref: "1:001", text: "DEVIS N° 2026-118 – Toitures Martin" });
    expect(firstPage.lines.map((l: { text: string }) => l.text)).toContain(
      "LIT-2738  Liteau sapin traité classe 2 27x38  480 ml  0,62  297,60",
    );

    const list = await agent.get(`/v1/projects/${projectId}/documents`);
    expect(list.body.items).toHaveLength(1);

    const file = await agent.get(`/v1/documents/${res.body.id}/file`).buffer(true);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("application/pdf");
    expect(Buffer.compare(file.body as Buffer, Buffer.from(pdf))).toBe(0);
  });

  it("ne relit pas deux fois le même fichier dans un chantier", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis"]);
    const first = await upload(agent, projectId, pdf);
    const again = await upload(agent, projectId, pdf, "copie.pdf");
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ id: first.body.id, duplicate: true });
    expect(await ctx.prisma.documentProcessing.count()).toBe(1);
  });

  it("refuse un fichier qui n'est pas un PDF, quelle que soit son extension", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const fake = new TextEncoder().encode("<html>pas un pdf</html>");
    const res = await upload(agent, projectId, fake, "devis.pdf");
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: "unreadable_document", details: { reason: "not_pdf" } });
    expect(await ctx.prisma.document.count()).toBe(0);
  });

  it("refuse un fichier trop lourd", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const big = new Uint8Array(250_000);
    big.set(new TextEncoder().encode("%PDF-1.7\n"));
    const res = await upload(agent, projectId, big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("payload_too_large");
  });

  it("garde un PDF abîmé et le marque illisible au lieu d'échouer", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const broken = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> garbage");
    const res = await upload(agent, projectId, broken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "failed", reading: { status: "failed", errorCode: "corrupted" } });
  });

  it("marque illisible un document au-delà du nombre de pages autorisé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const res = await upload(agent, projectId, await makePdf(Array(7).fill("totaux")));
    expect(res.body).toMatchObject({ status: "failed", reading: { errorCode: "too_many_pages" } });
  });

  it("exige un fichier et un type de document valides", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const noFile = await agent.post(`/v1/projects/${projectId}/documents`).field("purpose", "client_quote");
    expect(noFile.status).toBe(400);
    const badPurpose = await upload(agent, projectId, await makePdf(["devis"]), "d.pdf", "facture");
    expect(badPurpose.status).toBe(400);
  });

  it("isole les documents entre entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const projectId = await chantier(a.agent);
    const doc = await upload(a.agent, projectId, await makePdf(["devis"]));

    expect((await upload(b.agent, projectId, await makePdf(["devis"]))).status).toBe(404);
    expect((await b.agent.get(`/v1/projects/${projectId}/documents`)).body.items).toEqual([]);
    expect((await b.agent.get(`/v1/documents/${doc.body.id}`)).status).toBe(404);
    expect((await b.agent.get(`/v1/documents/${doc.body.id}/file`)).status).toBe(404);
  });

  it("supprime un devis ; il peut ensuite être déposé à nouveau", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis"]);
    const doc = await upload(agent, projectId, pdf);

    const del = await agent.delete(`/v1/documents/${doc.body.id}`);
    expect(del.status).toBe(204);
    expect((await agent.get(`/v1/projects/${projectId}/documents`)).body.items).toEqual([]);
    expect((await agent.get(`/v1/documents/${doc.body.id}`)).status).toBe(404);
    expect(await ctx.prisma.documentBlob.count()).toBe(0);
    expect(await ctx.prisma.documentProcessing.count()).toBe(0);

    const again = await upload(agent, projectId, pdf);
    expect(again.status).toBe(201);
    expect(again.body.duplicate).toBe(false);
    expect((await agent.delete(`/v1/documents/${doc.body.id}`)).status).toBe(404);
  });

  it("garde les analyses IA décomptées quand un devis est supprimé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const doc = await upload(agent, projectId, await makePdf(["devis"]));
    const document = await ctx.prisma.document.findUniqueOrThrow({ where: { id: doc.body.id } });
    await ctx.prisma.aiAnalysis.create({
      data: {
        companyId: document.companyId,
        projectId,
        documentId: document.id,
        kind: "client_quote",
        status: "completed",
        billable: true,
        billingMonth: "2026-09",
      },
    });

    expect((await agent.delete(`/v1/documents/${doc.body.id}`)).status).toBe(204);
    expect(await ctx.prisma.aiAnalysis.count({ where: { billable: true } })).toBe(1);
  });

  it("ne laisse pas une autre entreprise supprimer un devis", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const projectId = await chantier(a.agent);
    const doc = await upload(a.agent, projectId, await makePdf(["devis"]));

    expect((await b.agent.delete(`/v1/documents/${doc.body.id}`)).status).toBe(404);
    expect((await b.agent.delete("/v1/documents/pas-un-uuid")).status).toBe(404);
    expect((await a.agent.get(`/v1/documents/${doc.body.id}`)).status).toBe(200);
  });

  it("fait remonter le chantier en tête de liste quand un devis y est déposé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const older = await chantier(agent);
    await agent.post("/v1/projects").send({ name: "Chantier récent" });
    await upload(agent, older, await makePdf(["devis"]));
    const list = await agent.get("/v1/projects");
    expect(list.body.items[0].id).toBe(older);
  });
});
