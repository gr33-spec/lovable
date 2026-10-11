import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { priceLeak } from "../src/modules/price-requests/application/supplier-packet.js";
import { TAKEOFF_EXTRACTOR } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES 7 TESTS DU §44.5 (référentiel couverture, infos chantier facultatives), tenus en permanence. Le devis de
 * référence : 200 m² d'ardoises 30×22 au crochet et 24 ml de gouttière zinc, à Brest (29200).
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(TAKEOFF_EXTRACTOR).useValue(new FakeTakeoffExtractor()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const LIGNES = [
  { libelle: "Couverture en ardoises naturelles d'Espagne 1er choix 30x22 posées au crochet", quantite: "200", unite: "m²" },
  { libelle: "Gouttière demi-ronde zinc développé 33, crochets bandeau, descentes Ø80", quantite: "24", unite: "ml" },
];
const BREST = { adresse: "12 rue de Siam, 29200 Brest", lignes: LIGNES };
type Morceau = { texte: string; cle?: string; valeur?: string; confiance: string };
type Ligne = { libelle: string; quantite: number | null; explication: { morceaux: Morceau[] } };
type Q = { id: string; projetId: string; questions: { id: string; texte: string; boutons: { label: string; valeur: string }[] }[]; lignes: Ligne[]; hypotheses: { cle: string }[] };
const ardoises = (q: Q) => q.lignes.find((l) => l.libelle === "Ardoises naturelles Espagne 1er choix 30×22");
const ids = (q: Q) => q.questions.map((x) => x.id).sort();

describe("§44.5 — infos chantier facultatives", () => {
  it("1. devis seul : même résultat qu'avant, aucune question en plus (une note sans mesure n'en ajoute pas non plus)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const seul = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    expect(ardoises(seul)?.quantite).toBe(9200);
    const contexte = (await agent.post("/v1/quantitatifs").send({ ...BREST, infos: "Accès par la cour. Prévoir une nacelle." })).body as Q;
    expect(ardoises(contexte)?.quantite).toBe(9200);
    expect(ids(contexte)).toEqual(ids(seul));
  });

  it("2. devis + note « Pente 35°. Rampant 6 m. 2 descentes » : aucune question, recouvrement recalculé, ligne en estimation si hors table Cupa", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const seul = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    expect(ids(seul)).toContain("engine:param:nb_descentes");
    const q = (await agent.post("/v1/quantitatifs").send({ ...BREST, infos: "Pente 35°. Rampant 6 m. 2 descentes" })).body as Q;
    expect(q.questions).toEqual([]);
    expect(ardoises(q)?.quantite).toBe(10478);
    expect(ardoises(q)?.explication.morceaux.some((m) => m.confiance === "estimation")).toBe(true);
  });

  it("3. note contredisant le devis : la note gagne, les deux valeurs apparaissent dans l'explication", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const lignes = [{ ...LIGNES[0]!, libelle: `${LIGNES[0]!.libelle}, pente 40°` }];
    const q = (await agent.post("/v1/quantitatifs").send({ ...BREST, lignes, infos: "Pente 35°" })).body as Q;
    const pente = ardoises(q)!.explication.morceaux.find((m) => m.cle === "param:pente")!;
    expect(pente).toMatchObject({ valeur: "35", confiance: "artisan" });
    expect(JSON.stringify(ardoises(q))).toMatch(/40/);
    expect(q.questions.map((x) => x.id)).not.toContain("engine:param:pente");
  });

  it("4. document contredisant le devis : question posée, envoi fournisseur bloqué tant qu'elle est ouverte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const rows: FixtureRow[] = [["ARD", "Ardoises 30x22 au crochet, pente 40°", "200 m²", "85,00", "17 000,00"]];
    const pdf = await makePdf(["devis"], rows, "Total HT 17 000,00", "DEVIS N° 2026-120 – Toitures Martin  ·  Pente 35°");
    const q = (await agent.post("/v1/quantitatifs").field("adresse", "29200 Brest").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" })).body as Q;
    expect(q.questions.find((x) => x.id === "engine:param:pente")?.boutons.map((b) => b.valeur)).toEqual(["40", "35"]);
    const refused = await agent.post(`/v1/quantitatifs/${q.id}/validation`);
    expect(refused.status).toBeGreaterThanOrEqual(400);
    expect((await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [] })).status).toBeGreaterThanOrEqual(400);
  });

  it("5. phrase d'exclusion : la ligne disparaît du « À commander » et apparaît dans le détail sans prix avec la mention", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const lignes = [...LIGNES, { libelle: "Couverture du garage en tuiles mécaniques", quantite: "20", unite: "m²" }];
    const sans = (await agent.post("/v1/quantitatifs").send({ ...BREST, lignes, infos: "Pente 35°. Rampant 6 m. 2 descentes" })).body as Q & { compris: string[]; a_chiffrer: { libelle: string }[] };
    expect(sans.compris.join(" ")).toMatch(/tuiles/);
    expect(JSON.stringify([sans.questions, sans.a_chiffrer])).toMatch(/tuile|garage/i);
    const q = (await agent.post("/v1/quantitatifs").send({ ...BREST, lignes, infos: "Pente 35°. Rampant 6 m. 2 descentes. Garage non compris." })).body as Q & { compris: string[]; a_chiffrer: { libelle: string }[] };
    expect(q.compris.join(" ")).not.toMatch(/tuiles/);
    expect(JSON.stringify([q.lignes, q.questions, q.a_chiffrer])).not.toMatch(/tuile|garage/i);
    expect(ardoises(q)?.quantite).toBe(10478);
    // Le détail sans prix (§42) envoyé au fournisseur garde la ligne, marquée.
    await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
    const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce Breizh", email: "negoce@example.fr" })).body;
    const created = (await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] })).body;
    // Le détail sans prix est le bloc 4 du PDF (§45.3) : la ligne y est, avec la mention.
    const body = (created.packet.detail as { libelle: string; mesure: string | null; precisions: string[] }[]).map((d) => [d.libelle, d.mesure, ...d.precisions].filter(Boolean).join(" · ")).join("\n");
    expect(body).toContain("Couverture du garage en tuiles mécaniques · 20 m² · exclu par l'artisan (« Garage non compris »)");
    expect(created.packet.articles.join("\n")).not.toMatch(/[Tt]uile/);
  });

  it("6. banc de 30 phrasés d'artisan : tenu par packages/domain/test/note-artisan-30-phrases.test.ts (chaque mesure trouvée, aucune fausse)", async () => {
    const { readSiteNotes, ROOFING_REFERENTIAL } = await import("@baticlair/domain");
    expect(readSiteNotes(ROOFING_REFERENTIAL, "2 rampants de 6,5. pte ~40°. deux descentes").map((f) => `${f.key}=${f.value}`).sort()).toEqual(["longueur_rampant=6.5", "nb_descentes=2", "pente=40"]);
    expect(readSiteNotes(ROOFING_REFERENTIAL, "Prévoir 9 000 ardoises, budget 12 000 €")).toEqual([]);
  });

  it("7. la note transmise au fournisseur ne contient jamais de prix (même test qu'au §43)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ ...BREST, infos: "Pente 35°. Rampant 6 m. 2 descentes\nBudget client 12 000,00 € HT\nAccès par la cour" })).body as Q;
    await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
    const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce Breizh", email: "negoce@example.fr" })).body;
    const created = (await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] })).body;
    expect(created.packet.resume).toHaveLength(1);
    expect(created.packet.resume[0]).toContain("Accès par la cour");
    expect(priceLeak(created.recipients[0].email.body)).toBeNull();
    expect(JSON.stringify(created.packet)).not.toMatch(/12 000|€/);
  });
});
