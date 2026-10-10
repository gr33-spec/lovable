import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * §50.7, retour du fondateur (2026-10-10) : « je ne vois toujours pas les deux boutons flottants » sur une liste qui a
 * encore des lignes orange. L'« Aperçu » montre le mail et le PDF tels qu'ils partiraient, liste validée ou non : rien ne
 * part. L'export PDF d'une liste non validée ne s'ouvre qu'en aperçu ; l'envoi, lui, attend toujours la liste validée.
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

const LIGNES = [
  { libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "12", unite: "ml" },
  { libelle: "Ardoises naturelles 32x22 posées au crochet", quantite: "40", unite: "m²" },
];

describe("§50.7 : l'aperçu avant que la liste soit validée", () => {
  it("le mail et le PDF s'ouvrent en aperçu sur une liste en cours ; l'envoi attend la validation", async () => {
    const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
    await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", adresse: "18 rue de Siam, 29200 Brest", lignes: LIGNES }).expect(201)).body;
    const projectId = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body.projetId as string;
    const preview = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({}).expect(200)).body;
    expect(preview.subject).toMatch(/^Demande de devis/);
    expect(preview.mail).toMatch(/^Bonjour,/);
    const pdf = await agent.get(`/v1/projects/${projectId}/demande-de-devis.pdf?apercu=1`).buffer(true).expect(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    // Sans « apercu », l'export reste celui de la liste validée ; et rien ne part d'une liste non validée.
    await agent.get(`/v1/projects/${projectId}/demande-de-devis.pdf`).expect(400);
    const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce test", email: "devis@example.com" })).body;
    await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplier.id] }).expect(400);
  });
});
