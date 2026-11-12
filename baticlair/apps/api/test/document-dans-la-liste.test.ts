import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LISTES_ENREGISTREES } from "../src/modules/takeoff/infrastructure/fake-liste-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * UN DOCUMENT DANS LA LISTE EN COURS (Greg, 12 novembre 2026 : « l'artisan doit pouvoir commencer manuellement, puis
 * transmettre un devis, un PDF ou une autre liste pour compléter son quantitatif en cours […] aucun ajout sans accord,
 * même brouillon, pas de second quantitatif, isolation entre entreprises »). `POST /v1/assistant/document` LIT et rend
 * les lignes ; rien n'est créé ni gardé. Tests demandés par Greg : autorisation, double clic et nouvel essai sans double
 * décompte, échec sans consommation de quota, aucune fusion de doublons, rien de visible par une autre entreprise.
 * Lecture simulée (crédit API à zéro) : aucun appel payant.
 */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");
let ctx: TestContext;
const VARS = ["GROUPE", "ZONES_ACTIVES", "MODE_REGROUPEMENT"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  delete process.env.MODE_REGROUPEMENT;
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

const compter = async () => ({
  chantiers: await ctx.prisma.project.count(),
  quantitatifs: await ctx.prisma.quantitatif.count(),
  listes: await ctx.prisma.takeoff.count(),
  fichiers: await ctx.prisma.document.count(),
});
const lire = (agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], nom = "bon-du-negoce.png") => agent.post("/v1/assistant/document").attach("file", PNG, { filename: nom, contentType: "image/png" });

describe("un document lu dans la liste en cours", () => {
  it("les lignes reviennent telles qu'écrites ; RIEN n'est créé : ni chantier, ni quantitatif, ni fichier ; la lecture est journalisée et compte un scan", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const zero = await compter();
    const r = await lire(a.agent).expect(200);
    expect(r.body.nature).toBe("liste");
    expect(r.body.lignes).toEqual(LISTES_ENREGISTREES.bon.lignes.map((l) => ({ libelle: l.designation, quantite: l.quantite, unite: l.unite })));
    expect(await compter()).toEqual(zero);
    const journal = await ctx.prisma.aiExecution.findMany({ where: { companyId: a.companyId, task: "lecture_liste" } });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ status: "success", projectId: null, documentId: null });
  });

  it("AUCUNE FUSION : une ligne déjà dans la liste de l'artisan revient quand même, telle qu'écrite (l'écran la signale, l'artisan décide)", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const un = (await lire(a.agent).expect(200)).body.lignes as { libelle: string }[];
    const deux = (await lire(a.agent).expect(200)).body.lignes as { libelle: string }[];
    expect(deux).toEqual(un);
    expect(new Set(deux.map((l) => l.libelle)).size).toBe(deux.length);
  });

  it("DOUBLE CLIC et NOUVEL ESSAI avec la même clé : une seule lecture, un seul décompte, la même réponse", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const cle = randomUUID();
    const [x, y] = await Promise.all([lire(a.agent).set("Idempotency-Key", cle), lire(a.agent).set("Idempotency-Key", cle)]);
    // Le second clic arrive pendant la lecture : il est refusé (« en cours ») ou rejoue la réponse ; jamais une seconde lecture.
    expect([x.status, y.status].filter((s) => s === 200).length).toBeGreaterThanOrEqual(1);
    const encore = await lire(a.agent).set("Idempotency-Key", cle).expect(200);
    expect(encore.body.lignes).toHaveLength(LISTES_ENREGISTREES.bon.lignes.length);
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId, task: "lecture_liste" } })).toBe(1);
  });

  it("ÉCHEC D'ANALYSE : la panne se dit, AUCUN scan n'est décompté, et le nouvel essai relit", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.patch("/v1/company/profile").send({ name: "Toitures A", address: "3 rue de la Gare, 22300 Lannion", siret: null, phone: null, email: null }).expect(200);
    const jauge = async () => (await a.agent.get("/v1/ai-usage/jauge").expect(200)).body.quotas.scans as { utilisees: number };
    const cle = randomUUID();
    const r = await lire(a.agent, "panne-liste.png").set("Idempotency-Key", cle);
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.body.error.code).toBe("analysis_failed");
    expect((await jauge()).utilisees).toBe(0);
    const vide = await lire(a.agent, "liste-floue.png");
    expect(vide.body.error).toMatchObject({ code: "analysis_failed", details: { reason: "nothing_read" } });
    await lire(a.agent).expect(200);
    expect((await jauge()).utilisees).toBe(2); // la photo floue a été lue (rien dessus) ; la panne ne compte pas
  });

  it("QUOTA PRIS : refus avant toute lecture, rien n'est dépensé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.patch("/v1/company/profile").send({ name: "Toitures A", address: "3 rue de la Gare, 22300 Lannion", siret: null, phone: null, email: null }).expect(200);
    for (let i = 0; i < 3; i++) await lire(a.agent).expect(200);
    const r = await lire(a.agent);
    expect(r.status).toBe(402);
    expect(r.body.error.details).toMatchObject({ refus: "scans" });
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: a.companyId } })).toBe(3);
  });

  it("AUTORISATION : sans session, rien ; le journal d'une entreprise n'est jamais celui d'une autre ; un fichier qui n'est ni image ni PDF est refusé", async () => {
    const { default: request } = await import("supertest");
    const anonyme = await request(ctx.app.getHttpServer()).post("/v1/assistant/document").attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect(anonyme.status).toBe(401);
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await lire(a.agent).expect(200);
    expect(await ctx.prisma.aiExecution.count({ where: { companyId: b.companyId } })).toBe(0);
    // B, avec l'en-tête de l'entreprise de A : refusé.
    const vol = await b.agent.post("/v1/assistant/document").set("x-company-id", a.companyId).attach("file", PNG, { filename: "liste.png", contentType: "image/png" });
    expect([401, 403, 404]).toContain(vol.status);
    const texte = await a.agent.post("/v1/assistant/document").attach("file", Buffer.from("du texte"), { filename: "note.txt", contentType: "text/plain" });
    expect(texte.body.error).toMatchObject({ code: "unreadable_document", details: { reason: "not_pdf" } });
  });
});
