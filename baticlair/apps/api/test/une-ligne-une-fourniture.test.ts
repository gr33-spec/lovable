import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type ExtractionOutput, type ExtractionRequest, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ». La lecture rend la prestation et la fourniture qu'elle contient ; ce qui est
 * enregistré, c'est la fourniture. Une ligne sans fourniture (heures, forfait, accès, évacuation) est repliée à part.
 */
const line = (designation: string, quantity: string, unit: string, reading: NonNullable<ExtractionOutput["lines"][number]["reading"]>): ExtractionOutput["lines"][number] => ({
  designation,
  quantity,
  unit,
  reference: null,
  sourceRefs: [],
  sourcePages: [1],
  doubt: null,
  section: [],
  reading,
});
const REPARATION: ExtractionOutput["lines"] = [
  line("Accès toiture et mise en sécurité (échelle, harnais, protections)", "1", "fft", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }),
  line("Remplacement unitaire d'une tuile cassée, comprenant accès toit, dépose de la tuile cassée et pose de la tuile neuve – Tuile terre cuite mécanique", "20", "u", {
    role: "fourniture_et_pose",
    articles: [{ nom: "Tuile terre cuite mécanique", materiau: null, quantite: "20", unite: "u", elements: null }],
    faconnage: null,
    manque: ["modèle et teinte de tuile"],
  }),
  line("Repositionnement des tuiles", "1,5", "h", { role: "pose", articles: [], faconnage: null, manque: [] }),
  line("Reprise de l'élément de rive, y compris les petites fournitures de fixation", "1", "fft", {
    role: "fourniture_et_pose",
    articles: [{ nom: "Fixations pour l'élément de rive", materiau: null, quantite: "1", unite: "jeu", elements: null }],
    faconnage: null,
    manque: ["type d'élément de rive (tuile de rive, bande zinc)"],
  }),
  line("Évacuation des déchets et nettoyage de fin de chantier", "1", "fft", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }),
];
class Reparation implements TakeoffExtractor {
  readonly provider = "fake";
  private inner = new FakeTakeoffExtractor();
  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const r = await this.inner.extract(request);
    return r.output ? { ...r, output: { ...r.output, lines: REPARATION } } : r;
  }
}
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(TAKEOFF_EXTRACTOR).useValue(new Reparation()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("§49.9 une ligne nomme une fourniture", () => {
  it("devis de réparation : 2 fournitures nommées par l'article, aucune phrase ni unité h/fft ; 3 lignes sans fourniture repliées", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "r@example.fr", "Toitures Martin");
    const project = await agent.post("/v1/projects").send({ name: "Réparation", address: "12 rue des Lilas, Vannes" });
    const doc = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`).expect(201)).body;
    const toBuy = takeoff.purchase.toBuy as { label: string; quantity: string | null }[];
    expect(toBuy.map((b) => [b.label, b.quantity])).toEqual([
      ["Tuile terre cuite mécanique", "20 pièces"],
      ["Fixations pour l'élément de rive", "1 jeu"],
    ]);
    expect(takeoff.purchase.toQuote).toEqual([]);
    const shown = JSON.stringify([takeoff.purchase.toBuy, takeoff.purchase.toQuote]);
    for (const phrase of ["Remplacement", "Repositionnement", "Reprise", "Accès", "Évacuation"]) expect(shown).not.toContain(phrase);
    expect(shown).not.toMatch(/\b\d+(?:,\d+)? (?:h|fft|forfait|jours?)\b/);
    expect((takeoff.sansFourniture as { label: string; measure: string }[]).map((l) => l.measure)).toEqual(["1 fft", "1,5 h", "1 fft"]);
  });
});
