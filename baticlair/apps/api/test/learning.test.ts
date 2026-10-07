import { DEFAULT_PREFERENCE_POLICIES, ROOFING_REFERENTIAL } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { COMPANY_MEMORY_STORE, CompanyMemory, type CompanyMemoryStore } from "../src/modules/learning/application/company-memory.js";
import { CorrectionJournal } from "../src/modules/learning/application/correction-journal.js";
import type { TenantContext } from "../src/modules/tenancy/index.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * APPRENTISSAGE CONTRÔLÉ (PD-045) — tests volontairement sévères :
 *  - l'entreprise A apprend → B n'en hérite RIEN ;
 *  - une correction ne modifie JAMAIS le référentiel général ;
 *  - une correction garde TOUJOURS l'avant et l'après ;
 *  - une préférence ancienne ou à reconfirmer ne s'applique jamais en silence.
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

async function tenantOf(companyId: string): Promise<TenantContext> {
  const m = await ctx.prisma.membership.findFirstOrThrow({ where: { companyId } });
  return { companyId, userId: m.userId, role: "owner", trades: ["roofing"] };
}

async function twoCompanies() {
  const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
  const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
  return { a: { ...a, tenant: await tenantOf(a.companyId) }, b: { ...b, tenant: await tenantOf(b.companyId) } };
}

/** Chantier avec un devis lu (IA simulée) : la liste de matériaux proposée. */
async function takeoffFor(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  return { projectId: project.body.id as string, takeoff };
}

const ecran = { kind: "product" as const, key: "slot:ecran" };

describe("mémoire de l'entreprise : aucune contamination", () => {
  it("A apprend son écran habituel → B n'en hérite absolument rien", async () => {
    const { a, b } = await twoCompanies();
    const memory = ctx.app.get(CompanyMemory);
    await memory.recordChoice(a.tenant, { ...ecran, value: "soprema-sop-ecran-hpv-r2-150x50", projectId: "00000000-0000-7000-8000-000000000001" });
    await memory.recordChoice(a.tenant, { ...ecran, value: "soprema-sop-ecran-hpv-r2-150x50", projectId: "00000000-0000-7000-8000-000000000002" });
    expect(await memory.forEngine(a.tenant)).toEqual({ products: { ecran: "soprema-sop-ecran-hpv-r2-150x50" }, proposals: {}, params: {} });

    expect(await memory.forEngine(b.tenant)).toEqual({ products: {}, proposals: {}, params: {} });
    expect(await memory.list(b.tenant)).toEqual([]);
    expect(await memory.resolve(b.tenant, "product", "slot:ecran")).toBeNull();

    // B fait un autre choix pour la même clé : A n'est pas « contredit ».
    await memory.recordChoice(b.tenant, { ...ecran, value: "autre-ecran", projectId: "00000000-0000-7000-8000-000000000003" });
    expect(await memory.resolve(a.tenant, "product", "slot:ecran")).toMatchObject({ value: "soprema-sop-ecran-hpv-r2-150x50", use: "silent" });
  });

  it("B ne peut pas modifier une préférence de A, même avec son identifiant", async () => {
    const { a, b } = await twoCompanies();
    const memory = ctx.app.get(CompanyMemory);
    const store = ctx.app.get<CompanyMemoryStore>(COMPANY_MEMORY_STORE);
    await memory.set(a.tenant, { ...ecran, value: "ecran-a", projectId: null });
    const [prefA] = await store.list(a.tenant);
    await store.save(b.tenant, [{ ...prefA!, status: "disabled" }]);
    expect(await memory.resolve(a.tenant, "product", "slot:ecran")).toMatchObject({ value: "ecran-a", use: "silent" });
    expect(await store.list(b.tenant)).toEqual([]);
  });

  it("une préférence ancienne n'est plus appliquée en silence : elle est seulement proposée", async () => {
    const { a } = await twoCompanies();
    const store = ctx.app.get<CompanyMemoryStore>(COMPANY_MEMORY_STORE);
    const journal = ctx.app.get(CorrectionJournal);
    let now = new Date("2025-01-10T00:00:00Z");
    const memory = new CompanyMemory(store, journal, DEFAULT_PREFERENCE_POLICIES, () => now);
    await memory.recordChoice(a.tenant, { ...ecran, value: "ecran-a", projectId: "00000000-0000-7000-8000-000000000001" });
    await memory.recordChoice(a.tenant, { ...ecran, value: "ecran-a", projectId: "00000000-0000-7000-8000-000000000002" });
    expect(await memory.forEngine(a.tenant)).toEqual({ products: { ecran: "ecran-a" }, proposals: {}, params: {} });
    now = new Date("2026-06-01T00:00:00Z");
    expect(await memory.forEngine(a.tenant)).toEqual({ products: {}, proposals: { ecran: "ecran-a" }, params: {} });
  });

  it("les seuils sont des paramètres de bêta : on les change sans toucher au code", async () => {
    const { a } = await twoCompanies();
    const store = ctx.app.get<CompanyMemoryStore>(COMPANY_MEMORY_STORE);
    const oneProject = { ...DEFAULT_PREFERENCE_POLICIES, product: { ...DEFAULT_PREFERENCE_POLICIES.product, confirmationsToActivate: 1 } };
    const memory = new CompanyMemory(store, ctx.app.get(CorrectionJournal), oneProject);
    await memory.recordChoice(a.tenant, { ...ecran, value: "ecran-a", projectId: "00000000-0000-7000-8000-000000000001" });
    expect(await memory.resolve(a.tenant, "product", "slot:ecran")).toMatchObject({ use: "silent" });
  });

  it("« Désormais » et « Ne plus utiliser » sont journalisés, l'ancien choix reste dans l'historique", async () => {
    const { a } = await twoCompanies();
    const memory = ctx.app.get(CompanyMemory);
    await memory.set(a.tenant, { ...ecran, value: "ecran-a", projectId: null });
    await memory.set(a.tenant, { ...ecran, value: "ecran-b", projectId: null });
    await memory.disable(a.tenant, ecran);
    expect((await memory.list(a.tenant)).map((p) => [p.value, p.status])).toEqual([
      ["ecran-a", "replaced"],
      ["ecran-b", "disabled"],
    ]);
    const events = await ctx.app.get(CorrectionJournal).list(a.tenant);
    expect(events.map((e) => [e.action, e.cause, e.before?.reference ?? null, e.after?.reference ?? null])).toEqual([
      ["preference", "company_preference", null, "ecran-a"],
      ["preference", "company_preference", "ecran-a", "ecran-b"],
      ["preference", "company_preference", "ecran-b", null],
    ]);
  });
});

describe("journal des corrections : l'avant et l'après, toujours", () => {
  it("corriger deux fois la même ligne : deux entrées, la première garde ce que BatiClair avait proposé", async () => {
    const { a } = await twoCompanies();
    const { projectId, takeoff } = await takeoffFor(a.agent);
    const line = takeoff.lines[0];
    await a.agent.patch(`/v1/takeoff-lines/${line.id}`).send({ designation: line.designation, quantity: "1300", unit: line.unit }).expect(200);
    await a.agent.patch(`/v1/takeoff-lines/${line.id}`).send({ designation: line.designation, quantity: "1350", unit: line.unit }).expect(200);

    const events = await ctx.app.get(CorrectionJournal).list(a.tenant, { takeoffLineId: line.id });
    expect(events.map((e) => [e.action, e.cause, e.before?.quantity, e.after?.quantity])).toEqual([
      ["edit", "reading", line.quantity, "1300"],
      ["edit", "reading", "1300", "1350"],
    ]);
    const first = events[0]!;
    // Ce que BatiClair avait compris (nature, famille, achat ou ouvrage, état montré) et ce que contenait le devis.
    expect(first.before).toMatchObject({ designation: line.designation, kind: "material", basis: "purchase" });
    expect(first.before?.state).toMatch(/verified|to_confirm|missing/);
    expect(first.documentExcerpt.length).toBeGreaterThan(0);
    expect(first.context).toMatchObject({ trade: "roofing", promptId: "takeoff_extraction", promptVersion: 13 });
    expect(first).toMatchObject({ projectId, takeoffId: takeoff.id, userId: a.tenant.userId });
    expect(first.patternKey).not.toContain(line.designation);
  });

  it("supprimer, ajouter, confirmer : chaque geste est gardé, même après la disparition de la ligne", async () => {
    const { a } = await twoCompanies();
    const { takeoff } = await takeoffFor(a.agent);
    const [first, second] = takeoff.lines;
    await a.agent.post(`/v1/takeoff-lines/${second.id}/confirm`).expect(200);
    await a.agent.delete(`/v1/takeoff-lines/${first.id}`).expect(200);
    await a.agent.post(`/v1/takeoffs/${takeoff.id}/lines`).send({ designation: "Closoir ventilé rouge", quantity: "12", unit: "ml" }).expect(201);

    const events = await ctx.app.get(CorrectionJournal).list(a.tenant);
    expect(events.map((e) => [e.action, e.cause, e.before?.designation ?? null, e.after?.designation ?? null])).toEqual([
      ["confirm", null, second.designation, second.designation],
      ["delete", "not_to_order", first.designation, null],
      ["add", "missed_line", null, "Closoir ventilé rouge"],
    ]);
  });

  it("le journal d'une entreprise est invisible pour une autre", async () => {
    const { a, b } = await twoCompanies();
    const { projectId, takeoff } = await takeoffFor(a.agent);
    await a.agent.delete(`/v1/takeoff-lines/${takeoff.lines[0].id}`).expect(200);
    const journal = ctx.app.get(CorrectionJournal);
    expect(await journal.list(a.tenant)).toHaveLength(1);
    expect(await journal.list(b.tenant)).toEqual([]);
    expect(await journal.list(b.tenant, { projectId })).toEqual([]);
    // B ne peut pas non plus corriger une ligne de A (et donc rien journaliser chez A).
    expect((await b.agent.delete(`/v1/takeoff-lines/${takeoff.lines[1].id}`)).status).toBe(404);
    expect(await journal.list(a.tenant)).toHaveLength(1);
  });

  it("aucune correction ni préférence ne modifie le référentiel général", async () => {
    const before = JSON.stringify(ROOFING_REFERENTIAL);
    const { a } = await twoCompanies();
    const { takeoff } = await takeoffFor(a.agent);
    const line = takeoff.lines[0];
    await a.agent.patch(`/v1/takeoff-lines/${line.id}`).send({ designation: "Tuile HP10 rouge", quantity: "999", unit: "u" }).expect(200);
    const memory = ctx.app.get(CompanyMemory);
    await memory.set(a.tenant, { ...ecran, value: "edilians-hp10-huguenot", projectId: null });
    await memory.recordChoice(a.tenant, { kind: "naming", key: "name:tuile maison", value: "edilians-hp10-huguenot", projectId: "00000000-0000-7000-8000-000000000001" });
    expect(JSON.stringify(ROOFING_REFERENTIAL)).toBe(before);
  });
});
