import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { D2026_015_LINES } from "../../../packages/domain/test/devis-reels/d2026-015.js";
import { PISCINE_LINES } from "../../../packages/domain/test/devis-reels/piscine.js";
import { LEZARDRIEUX_LINES } from "../../../packages/domain/test/devis-reels/platrerie-lezardrieux.js";
import type { BenchLine } from "../../../packages/domain/test/devis-reels/truth.js";
import { CompanyMemory } from "../src/modules/learning/application/company-memory.js";
import { CorrectionJournal } from "../src/modules/learning/application/correction-journal.js";
import type { TenantContext } from "../src/modules/tenancy/index.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * L'ÉCRAN DE L'ARTISAN sur les vrais devis du banc, par l'API : des
 * décisions (pas des lignes en erreur), une réponse qui règle tout ce
 * qu'elle peut, et jamais un ✓ obtenu en fermant une alerte.
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

interface Counts {
  verified: number;
  toConfirm: number;
  missing: number;
}
interface Decision {
  key: string;
  state: string;
  title: string;
  text: string;
  lineIds: string[];
  pieceLineIds: string[];
  primary: { action: string; label: string } | null;
  question: { key: string; kind: string } | null;
}
interface Item {
  kind: string;
  id: string;
  state: string;
  proof: { key: string; status: string; origin: string | null }[];
  calculation: { trace: { origin: string | null; from: string }[] } | null;
}
interface View {
  counts: Counts;
  decisions: Decision[];
  measures: { lineIds: string[]; text: string } | null;
  items: Item[];
}

async function tenantOf(companyId: string): Promise<TenantContext> {
  const m = await ctx.prisma.membership.findFirstOrThrow({ where: { companyId } });
  return { companyId, userId: m.userId, role: "owner", trades: [] };
}

/** Un chantier dont la liste reprend, ligne par ligne, un vrai devis du banc. */
async function projectWith(agent: Agent, bench: BenchLine[]) {
  const project = await agent.post("/v1/projects").send({ name: "Chantier test" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  for (const l of takeoff.lines) await agent.delete(`/v1/takeoff-lines/${l.id}`).expect(200);
  for (const l of bench) {
    await agent
      .post(`/v1/takeoffs/${takeoff.id}/lines`)
      .send({ designation: l.designation.slice(0, 300), quantity: l.quantity, unit: l.unit })
      .expect(201);
  }
  const body = (await agent.get(`/v1/projects/${project.body.id}/takeoff`)).body.takeoff;
  return { projectId: project.body.id as string, takeoffId: takeoff.id as string, view: body.view as View };
}

const getView = async (agent: Agent, projectId: string) => (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.view as View;

describe("piscine : 37 lignes, une seule décision", () => {
  it("une interaction règle les 37 éléments, chaque ligne est journalisée, la liste se valide", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "p@example.fr", "Piscines Martin", ["other"]);
    const { projectId, takeoffId, view } = await projectWith(agent, PISCINE_LINES);
    expect(view.counts).toEqual({ verified: 0, toConfirm: 37, missing: 0 });
    expect(view.decisions).toHaveLength(1);
    const [d] = view.decisions;
    expect(d).toMatchObject({ key: "group:unknown", primary: { action: "pieces", label: "Oui, tels qu'écrits" } });
    expect(d!.lineIds).toHaveLength(37);
    expect(d!.pieceLineIds).toHaveLength(32);

    // Valider avant de décider : refusé, rien ne part avec un ⚠ non tranché.
    expect((await agent.post(`/v1/takeoffs/${takeoffId}/validate`)).status).toBe(400);

    const after = (await agent.post(`/v1/takeoffs/${takeoffId}/decisions`).send({ action: "pieces", lineIds: d!.lineIds, pieceLineIds: d!.pieceLineIds }).expect(200)).body.view as View;
    expect(after.counts).toEqual({ verified: 37, toConfirm: 0, missing: 0 });
    expect(after.decisions).toEqual([]);
    await agent.post(`/v1/takeoffs/${takeoffId}/validate`).expect(200);

    // Le feutre « au m² » n'est pas passé à la pièce ; les lignes sans unité, si.
    const lines = (await getView(agent, projectId)).items;
    expect(lines).toHaveLength(37);
    const journal = await ctx.app.get(CorrectionJournal).list(await tenantOf(companyId), { projectId });
    expect(journal.filter((e) => e.action === "edit" && e.after?.unit === "u")).toHaveLength(32);
    expect(journal.filter((e) => e.action === "confirm")).toHaveLength(37);
  });
});

describe("une information manquante ne devient jamais ✓ en fermant l'écran", () => {
  it("plâtrerie : les ouvrages mesurés restent « ? », même après avoir tout validé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "l@example.fr", "Plâtrerie Martin", ["drywall"]);
    const { projectId, takeoffId, view } = await projectWith(agent, LEZARDRIEUX_LINES);
    expect(view.measures?.lineIds.length).toBeGreaterThan(10);
    // Revenir sur l'écran sans rien faire ne change rien.
    expect(await getView(agent, projectId)).toEqual(view);
    for (const d of view.decisions.filter((x) => x.primary?.action === "keep" || x.primary?.action === "pieces")) {
      await agent.post(`/v1/takeoffs/${takeoffId}/decisions`).send({ action: d.primary!.action, lineIds: d.lineIds, pieceLineIds: d.pieceLineIds }).expect(200);
    }
    const after = await getView(agent, projectId);
    for (const id of view.measures!.lineIds) expect(after.items.find((i) => i.id === id)?.state).toBe("missing");
    // « C'est bon » sur un ouvrage mesuré ne le rend pas ✓ non plus.
    await agent.post(`/v1/takeoff-lines/${view.measures!.lineIds[0]}/confirm`).expect(200);
    expect((await getView(agent, projectId)).items.find((i) => i.id === view.measures!.lineIds[0])?.state).toBe("missing");
  });
});

describe("questions du calcul : une réponse, une seule fois, et la preuve", () => {
  it("couverture : « aucun de ces modèles » arrête la question, la réponse est journalisée", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { projectId, takeoffId, view } = await projectWith(agent, D2026_015_LINES);
    const faitiere = view.decisions.filter((d) => d.question?.key === "product:faitiere");
    expect(faitiere).toHaveLength(1);
    const after = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:faitiere", value: null }).expect(200)).body.view as View;
    expect(after.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    const events = await ctx.app.get(CorrectionJournal).list(await tenantOf(companyId), { projectId });
    expect(events.filter((e) => e.action === "answer")).toEqual([expect.objectContaining({ after: expect.objectContaining({ designation: "product:faitiere", reference: "aucun" }) })]);
  });

  it("aucune donnée non vérifiée ne devient établie à l'écran", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { takeoffId } = await projectWith(agent, D2026_015_LINES);
    const view = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:faitiere", value: "edilians-faitiere-angulaire-710" }).expect(200)).body.view as View;
    const needs = view.items.filter((i) => i.kind === "need");
    // Seules les faîtières se calculent (règle et donnée vérifiées) ; les règles en attente ne produisent rien.
    expect(needs.map((n) => [n.id, n.state])).toEqual([["faitieres", "verified"]]);
    // « Voir le calcul » : chaque élément dit d'où il vient (devis, référentiel, chantier).
    expect(needs[0]!.calculation!.trace.filter((t) => t.origin === null).map((t) => t.from)).toEqual([]);
    expect(new Set(needs[0]!.calculation!.trace.map((t) => t.origin))).toEqual(new Set(["devis", "referential", "project", "company"]));
  });

  it("la préférence de l'entreprise A n'apparaît jamais chez B", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    await ctx.app.get(CompanyMemory).set(await tenantOf(a.companyId), { kind: "product", key: "slot:faitiere", value: "edilians-faitiere-angulaire-710", projectId: null });

    const viewA = (await projectWith(a.agent, D2026_015_LINES)).view;
    const viewB = (await projectWith(b.agent, D2026_015_LINES)).view;
    // Chez A : le produit habituel répond à la question, et la preuve le dit (« votre entreprise »).
    expect(viewA.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    const faitieres = viewA.items.find((i) => i.id === "faitieres")!;
    expect(faitieres.proof.find((p) => p.key === "product")?.origin).toBe("company");
    // Chez B : rien de A, la question est posée.
    expect(viewB.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(true);
    expect(viewB.items.some((i) => i.proof.some((p) => p.key === "product" && p.origin === "company"))).toBe(false);
    expect(JSON.stringify(viewB)).not.toContain("Préférence de votre entreprise");
  });
});
