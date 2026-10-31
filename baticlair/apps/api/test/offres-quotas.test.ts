import { randomUUID } from "node:crypto";
import { PHRASE_LECTURES_EPUISEES } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnalysisMeter } from "../src/modules/ai-usage/index.js";
import { DEVIS_7954_PDF } from "./support/devis7954-pdf.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES OFFRES ET LEURS QUOTAS (Greg, 30 octobre 2026, réponses aux six décisions) : Découverte (1 analyse de devis et
 * 3 scans de liste offerts, une fois), Essentiel (3 et 10 par mois), Pro (8 et 30 par mois) ; un devis de plus de 150
 * lignes compte pour 2 analyses, et l'artisan le voit AVANT la lecture ; les achats groupés ne demandent rien.
 */
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "MODE_REGROUPEMENT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT; // le défaut : automatique
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
const ceMois = () => new Date().toISOString().slice(0, 7);
const abonner = (companyId: string, formule: "essentiel" | "pro") =>
  ctx.prisma.abonnement.create({ data: { companyId, statut: "actif", fournisseur: "simule", formule, periodeDebut: new Date(), periodeFin: new Date(Date.now() + 30 * 86_400_000) } });
const analyse = (companyId: string, projectId: string, billingMonth: string, poids = 1) =>
  ctx.prisma.aiAnalysis.create({ data: { companyId, projectId, documentId: randomUUID(), kind: "client_quote", status: "completed", billable: true, billingMonth, poids } });
const scan = (companyId: string, quand = new Date()) =>
  ctx.prisma.aiExecution.create({ data: { companyId, task: "lecture_liste", route: "vision", provider: "anthropic", model: "test", promptId: "lecture_liste", promptVersion: 1, costMicroUsd: 0n, priceTableVersion: "test", status: "success", durationMs: 1, createdAt: quand } });

async function compte(email: string) {
  const a = await signUpWithCompany(ctx.app, email, "Toitures A", ["roofing"]);
  await a.agent.patch("/v1/company/profile").send({ name: "Toitures A", address: "3 rue de la Gare, 22300 Lannion", siret: null, phone: null, email: null }).expect(200);
  const projet = (await a.agent.post("/v1/projects").send({ name: "Chantier" }).expect(201)).body.id as string;
  return { ...a, projet };
}

describe("les quotas de la formule", () => {
  it("Découverte : 1 analyse de devis et 3 scans offerts, en tout ; la jauge le dit avant le dépôt", async () => {
    const a = await compte("a@toitures.fr");
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.quotas).toEqual({ formule: "decouverte", analyses: { limite: 1, utilisees: 0, restantes: 1 }, scans: { limite: 3, utilisees: 0, restantes: 3 }, parMois: false });
    await analyse(a.companyId, a.projet, "2026-07");
    const meter = ctx.app.get(AnalysisMeter);
    await expect(meter.begin({ companyId: a.companyId, userId: null, projectId: a.projet, documentId: randomUUID(), kind: "client_quote" })).rejects.toMatchObject({ details: { refus: "lectures", phrase: PHRASE_LECTURES_EPUISEES } });
    // Les scans : trois offerts, puis le paywall, sans rien lire ni dépenser.
    for (let i = 0; i < 3; i++) await scan(a.companyId);
    const r = await a.agent.post(`/v1/projects/${a.projet}/liste?ecran=1`).attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect(r.status).toBe(402);
    expect(r.body.error.details).toMatchObject({ refus: "scans", phrase: "Tes scans de liste offerts sont utilisés. Passe à Essentiel pour en avoir plus, ou note ta liste à la main : c'est gratuit." });
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } })).toBe(3);
  });

  it("Essentiel : 3 analyses et 10 scans par mois ; le mois passé ne compte plus ; Pro : 8 et 30", async () => {
    const a = await compte("a@toitures.fr");
    await abonner(a.companyId, "essentiel");
    await analyse(a.companyId, a.projet, "2026-07");
    await analyse(a.companyId, a.projet, ceMois());
    await scan(a.companyId, new Date(Date.UTC(2026, 6, 15)));
    await scan(a.companyId);
    expect((await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.quotas).toEqual({ formule: "essentiel", analyses: { limite: 3, utilisees: 1, restantes: 2 }, scans: { limite: 10, utilisees: 1, restantes: 9 }, parMois: true });
    await analyse(a.companyId, a.projet, ceMois(), 2);
    const meter = ctx.app.get(AnalysisMeter);
    await expect(meter.begin({ companyId: a.companyId, userId: null, projectId: a.projet, documentId: randomUUID(), kind: "client_quote" })).rejects.toMatchObject({ details: { refus: "lectures", phrase: "Tes analyses de devis du mois sont utilisées. Passe à Pro pour en avoir plus, ou note ta liste à la main : c'est gratuit." } });

    const b = await compte("b@toitures.fr");
    await abonner(b.companyId, "pro");
    expect((await b.agent.get("/v1/ai-usage/jauge").expect(200)).body.quotas).toMatchObject({ formule: "pro", analyses: { limite: 8, restantes: 8 }, scans: { limite: 30, restantes: 30 } });
  });

  it("un gros devis (plus de 150 lignes) : l'écran le dit AVANT la lecture, rien n'est décompté ; « Lancer » le lit, il compte pour 2", async () => {
    const a = await compte("a@toitures.fr");
    await abonner(a.companyId, "essentiel");
    // Le devis 7954 (anonymisé, régénéré à la volée) : 324 lignes.
    const doc = (await a.agent.post(`/v1/projects/${a.projet}/documents`).field("purpose", "client_quote").attach("file", Buffer.from(await DEVIS_7954_PDF()), { filename: "gros-devis.pdf", contentType: "application/pdf" }).expect(201)).body.id as string;
    const refus = await a.agent.post("/v1/quantitatifs?ecran=1").send({ documentId: doc });
    expect(refus.status).toBe(409);
    expect(refus.body.error.details).toMatchObject({ reason: "gros_devis", poids: 2, restantes: 3 });
    expect(refus.body.error.details.lignes).toBeGreaterThan(150);
    expect(refus.body.error.details.message).toMatch(/^Ce devis fait \d+ lignes : il compte pour 2 analyses\. Il t'en reste 3\.$/);
    expect(await ctx.prisma.aiAnalysis.count({ where: { companyId: a.companyId } })).toBe(0);
    await a.agent.post("/v1/quantitatifs?ecran=1").send({ documentId: doc, confirmeGros: true }).expect((r) => expect([200, 201, 202]).toContain(r.status));
    const lue = await ctx.prisma.aiAnalysis.findFirstOrThrow({ where: { companyId: a.companyId, documentId: doc } });
    expect(lue.poids).toBe(2);
  });
});
