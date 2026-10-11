import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEVIS_LINES, makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

// Lecture simulée (AI_PROVIDER=fake, voir vitest.config.ts) : aucun appel payant. §51.5 : une lecture, une fois.
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

async function clientQuote(agent: Agent, pages: Parameters<typeof makePdf>[0] = ["devis", "cgv"], rows: FixtureRow[] = DEVIS_LINES) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(pages, rows)), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projectId: project.body.id as string, documentId: doc.body.id as string };
}

/** Le même devis avec une faîtière écrite deux fois de suite : doublon ou quantités à additionner ? */
const DOUBLON: FixtureRow[] = [DEVIS_LINES[0]!, DEVIS_LINES[1]!, DEVIS_LINES[1]!, ...DEVIS_LINES.slice(2)];
const byName = (lines: { id: string; designation: string }[], re: RegExp) => lines.find((l) => re.test(l.designation))!;

describe("liste de matériaux tirée du devis client (lecture simulée)", () => {
  it("propose les lignes du devis, dans son ordre, chacune reliée à sa ligne lue", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, documentId } = await clientQuote(agent);

    const res = await agent.post(`/v1/documents/${documentId}/takeoff`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.lines).toHaveLength(6);
    const tuile = res.body.lines[0];
    // §49.2 : la quantité écrite fait foi, telle qu'écrite (« 1 250 u »).
    expect(tuile).toMatchObject({ designation: "Tuile romane canal rouge 12,5 u/m²", quantity: "1 250", unit: "u", origin: "ai", status: "certain", confirmed: false });
    expect(tuile.sourceRefs[0]).toMatch(/^1:\d{3}$/);
    expect(res.body.lines.map((l: { designation: string }) => l.designation)).toEqual(DEVIS_LINES.map((r) => r[1]));
    // Aucune ligne orange sans raison : rien à vérifier sur un devis propre (§51.6).
    expect(res.body.counts).toMatchObject({ toVerify: 0, blocking: 0 });

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
    // §51.5 : un seul appel, la lecture du devis (fiche, questions, fourniture par ligne).
    expect(execution).toMatchObject({ task: "lecture_devis", promptId: "lecture_devis", promptVersion: 1, status: "success", pagesText: 1 });
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
    const crochets = byName(draft.lines, /^Crochet inox/);

    const edited = await agent.patch(`/v1/takeoff-lines/${crochets.id}`).send({ designation: "Crochet inox ardoise 100 mm", quantity: "200", unit: "u", reference: "CRO-INOX" });
    expect(edited.status).toBe(200);
    const line = edited.body.lines.find((l: { id: string }) => l.id === crochets.id);
    expect(line).toMatchObject({ quantity: "200", unit: "u", edited: true, status: "certain" });
    // La ligne corrigée part telle qu'écrite par l'artisan : 200 pièces (§41.4).
    expect(edited.body.purchase.toBuy.find((b: { lineIds: string[] }) => b.lineIds.includes(crochets.id))).toMatchObject({ quantity: "200 pièces" });

    const added = await agent.post(`/v1/takeoffs/${draft.id}/lines`).send({ designation: "Closoir ventilé", quantity: "12", unit: "ml" });
    expect(added.status).toBe(201);
    expect(added.body.lines.at(-1)).toMatchObject({ designation: "Closoir ventilé", origin: "manual" });
    // Une ligne ajoutée à la main est sur la liste, telle qu'écrite.
    expect(added.body.purchase.toBuy.map((b: { label: string }) => b.label)).toContain("Closoir ventilé");

    const removed = await agent.delete(`/v1/takeoff-lines/${added.body.lines.at(-1).id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.purchase.toBuy.map((b: { label: string }) => b.label)).not.toContain("Closoir ventilé");

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

  it("n'autorise la validation qu'une fois chaque doute vu : la même ligne écrite deux fois de suite se confirme", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await clientQuote(agent, ["devis", "cgv"], DOUBLON);
    const draft = (await agent.post(`/v1/documents/${documentId}/takeoff`)).body;
    expect(draft.lines).toHaveLength(7);
    // Deux faîtières identiques qui se suivent : doublon ou quantités à additionner ? À l'artisan de dire (§49.1 : jamais fusionnées).
    expect(draft.counts.toVerify).toBe(2);
    const doubles = draft.lines.filter((l: { status: string }) => l.status === "to_verify");
    expect(doubles.map((l: { designation: string }) => l.designation)).toEqual(["Faîtière ronde à emboîtement", "Faîtière ronde à emboîtement"]);
    expect(doubles[0].issues.map((i: { code: string }) => i.code)).toContain("DUPLICATE_LINE");

    const refused = await agent.post(`/v1/takeoffs/${draft.id}/validate`);
    expect(refused.status).toBe(400);
    expect(refused.body.error.details).toMatchObject({ reason: "lines_to_check" });

    let current = draft;
    for (const line of doubles) {
      current = (await agent.post(`/v1/takeoff-lines/${line.id}/confirm`).expect(200)).body;
    }
    expect(current.lines.filter((l: { confirmed: boolean }) => l.confirmed)).toHaveLength(2);
    expect(current.counts.toVerify).toBe(0);
    expect((await agent.post(`/v1/takeoffs/${draft.id}/validate`)).body.status).toBe("validated");

    // Une ligne corrigée après confirmation est relue : plus confirmée, plus un doublon.
    const edited = await agent.patch(`/v1/takeoff-lines/${doubles[0].id}`).send({ designation: "Faîtière ronde à emboîtement", quantity: "84", unit: "u" });
    expect(edited.body.lines.find((l: { id: string }) => l.id === doubles[0].id)).toMatchObject({ confirmed: false, status: "certain", quantity: "84" });
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
    // Les deux pages partent en image. L'IA simulée n'y trouve aucune ligne : rien ne part vide, la lecture le dit.
    expect(JSON.stringify(res.body)).toContain("nothing_read");
    const execution = await ctx.prisma.aiExecution.findFirstOrThrow();
    expect(execution).toMatchObject({ route: "vision", pagesVision: 2, pagesText: 0 });
  });
});
