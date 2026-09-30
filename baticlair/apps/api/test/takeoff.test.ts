import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

// Extraction simulée (AI_PROVIDER=fake, voir vitest.config.ts) : aucun appel payant.
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

async function clientQuote(agent: Agent, pages: Parameters<typeof makePdf>[0] = ["devis", "cgv"]) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(pages)), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projectId: project.body.id as string, documentId: doc.body.id as string };
}

describe("liste de matériaux tirée du devis client (IA simulée)", () => {
  it("propose les lignes du devis, chacune reliée à sa ligne source", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, documentId } = await clientQuote(agent);

    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.lines).toHaveLength(6);
    const tuile = res.body.lines[0];
    expect(tuile).toMatchObject({ designation: "Tuile romane canal rouge 12,5 u/m²", quantity: "1 250", unit: "u", reference: "TUI-RC12", origin: "ai" });
    expect(tuile.sourceRefs[0]).toMatch(/^1:\d{3}$/);
    expect(tuile.family).toBe("Tuile");

    // Paquets sans contenu indiqué : à vérifier, avec la raison.
    const crochets = res.body.lines.find((l: { reference: string }) => l.reference === "CRO-INOX");
    expect(crochets.status).toBe("to_verify");
    expect(crochets.issues.map((i: { code: string }) => i.code)).toContain("PACKAGE_CONTENT_MISSING");
    // Le doute de l'IA est montré tel quel à l'artisan.
    expect(crochets.aiDoubt).toBe("Combien de pièces par paquet ?");
    expect(crochets.issues.map((i: { code: string }) => i.code)).toContain("AI_DOUBT");
    expect(crochets.confirmed).toBe(false);

    const again = await agent.get(`/v1/projects/${projectId}/takeoff`);
    expect(again.body.aiAvailable).toBe(true);
    expect(again.body.takeoff.id).toBe(res.body.id);
  });

  it("décompte une analyse et enregistre le coût, sans jamais payer deux fois le même devis", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await clientQuote(agent);

    await agent.post(`/v1/documents/${documentId}/takeoff`).expect(201);
    await agent.post(`/v1/documents/${documentId}/takeoff`).expect(201);

    expect(await ctx.prisma.aiExecution.count()).toBe(1);
    const execution = await ctx.prisma.aiExecution.findFirstOrThrow();
    expect(execution).toMatchObject({ task: "takeoff_extraction", promptId: "takeoff_extraction", promptVersion: 5, status: "success", pagesText: 1 });
    expect(execution.costMicroUsd).toBeGreaterThan(0n);
    const usage = await agent.get("/v1/ai-usage");
    expect(usage.body.analyses.used).toBe(1);
  });

  it("respecte le palier : au-delà, aucun appel IA", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    await ctx.prisma.company.update({ where: { id: companyId }, data: { monthlyAnalysisLimit: 0 } });
    const { documentId } = await clientQuote(agent);
    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("analysis_quota_reached");
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
  });

  it("laisse l'artisan corriger, ajouter, supprimer, puis valider", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await clientQuote(agent);
    const draft = (await agent.post(`/v1/documents/${documentId}/takeoff`)).body;
    const crochets = draft.lines.find((l: { reference: string }) => l.reference === "CRO-INOX");

    const edited = await agent.patch(`/v1/takeoff-lines/${crochets.id}`).send({ designation: "Crochet inox ardoise 100 mm", quantity: "200", unit: "u", reference: "CRO-INOX" });
    expect(edited.status).toBe(200);
    const line = edited.body.lines.find((l: { id: string }) => l.id === crochets.id);
    expect(line).toMatchObject({ quantity: "200", unit: "u", edited: true, status: "certain" });

    const added = await agent.post(`/v1/takeoffs/${draft.id}/lines`).send({ designation: "Closoir ventilé", quantity: "12", unit: "ml" });
    expect(added.status).toBe(201);
    expect(added.body.lines.at(-1)).toMatchObject({ designation: "Closoir ventilé", origin: "manual" });

    const noQty = await agent.post(`/v1/takeoffs/${draft.id}/lines`).send({ designation: "Mortier de scellement" });
    const blocking = noQty.body.lines.at(-1);
    expect(blocking.issues.map((i: { code: string }) => i.code)).toContain("QUANTITY_MISSING");
    const refused = await agent.post(`/v1/takeoffs/${draft.id}/validate`);
    expect(refused.status).toBe(400);

    await agent.delete(`/v1/takeoff-lines/${blocking.id}`).expect(200);
    const current = (await agent.get(`/v1/projects/${draft.projectId}/takeoff`)).body.takeoff;
    for (const l of current.lines.filter((x: { status: string }) => x.status === "to_verify")) {
      await agent.post(`/v1/takeoff-lines/${l.id}/confirm`).expect(200);
    }
    const validated = await agent.post(`/v1/takeoffs/${draft.id}/validate`);
    expect(validated.status).toBe(200);
    expect(validated.body.status).toBe("validated");

    // Corriger une liste validée la rouvre : il faudra la valider à nouveau.
    const changed = await agent.patch(`/v1/takeoff-lines/${crochets.id}`).send({ designation: "Crochet inox ardoise 100 mm", quantity: "250", unit: "u" });
    expect(changed.status).toBe(200);
    expect(changed.body.status).toBe("draft");

    const revalidated = await agent.post(`/v1/takeoffs/${draft.id}/validate`);
    expect(revalidated.body.status).toBe("validated");
    const reopened = await agent.post(`/v1/takeoffs/${draft.id}/reopen`);
    expect(reopened.body.status).toBe("draft");
  });

  it("n'autorise la validation qu'une fois chaque doute vu : corrigé ou confirmé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await clientQuote(agent);
    const draft = (await agent.post(`/v1/documents/${documentId}/takeoff`)).body;
    expect(draft.counts.toVerify).toBeGreaterThan(0);

    const refused = await agent.post(`/v1/takeoffs/${draft.id}/validate`);
    expect(refused.status).toBe(400);
    expect(refused.body.error.details).toMatchObject({ reason: "lines_to_check" });

    let current = draft;
    for (const line of draft.lines.filter((l: { status: string }) => l.status === "to_verify")) {
      current = (await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200)).body;
    }
    const crochets = current.lines.find((l: { reference: string }) => l.reference === "CRO-INOX");
    expect(crochets).toMatchObject({ confirmed: true, status: "certain", issues: [] });
    expect(current.counts.toVerify).toBe(0);
    expect((await agent.post(`/v1/takeoffs/${draft.id}/validate`)).body.status).toBe("validated");

    // Une ligne corrigée après confirmation est relue.
    const edited = await agent.patch(`/v1/takeoff-lines/${crochets.id}`).send({ designation: "Crochet inox ardoise 100 mm", quantity: "200", unit: "bidule" });
    expect(edited.body.lines.find((l: { id: string }) => l.id === crochets.id)).toMatchObject({ confirmed: false, status: "to_verify" });
  });

  it("n'accepte que le devis client, et isole les entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    const { projectId, documentId } = await clientQuote(a.agent);
    const draft = (await a.agent.post(`/v1/documents/${documentId}/takeoff`)).body;

    expect((await b.agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(404);
    expect((await b.agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff).toBeNull();
    expect((await b.agent.patch(`/v1/takeoff-lines/${draft.lines[0].id}`).send({ designation: "x" })).status).toBe(404);
    expect((await b.agent.post(`/v1/takeoffs/${draft.id}/validate`)).status).toBe(404);

    const supplier = await a.agent
      .post(`/v1/projects/${projectId}/documents`)
      .field("purpose", "supplier_quote")
      .attach("file", Buffer.from(await makePdf(["totaux"])), { filename: "f.pdf", contentType: "application/pdf" });
    expect((await a.agent.post(`/v1/documents/${supplier.body.id}/takeoff`)).status).toBe(400);
  });

  it("refuse un devis illisible sans rien dépenser", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const project = await agent.post("/v1/projects").send({ name: "Chantier" });
    const broken = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from("%PDF-1.4\n1 0 obj << >> garbage"), { filename: "d.pdf", contentType: "application/pdf" });
    const res = await agent.post(`/v1/documents/${broken.body.id}/takeoff`);
    expect(res.status).toBe(422);
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
  });

  it("lit en image le PDF entier quand la lecture locale a échoué pour une raison technique", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await clientQuote(agent, ["scan", "scan"]);
    // Simule une panne de lecture côté serveur (pas un fichier abîmé).
    await ctx.prisma.documentProcessing.updateMany({ where: { documentId }, data: { status: "failed", errorCode: "read_failed" } });

    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(res.body.notes[0]).toContain("Pages 1, 2");
    const execution = await ctx.prisma.aiExecution.findFirstOrThrow();
    expect(execution).toMatchObject({ route: "vision", pagesVision: 2, pagesText: 0 });
  });
});
