import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LECTURE_READER, type LectureReader, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import type { LectureDevis } from "@baticlair/domain";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ». La lecture rend la prestation et la fourniture qu'elle contient ; ce qui est
 * enregistré, c'est la fourniture. Une ligne sans fourniture (heures, forfait, accès, évacuation) est repliée à part.
 */
const sans = (ref: string, designation: string, quantite: string, unite: string, role: "hors_quantitatif" | "pose"): LectureDevis["lignes"][number] => ({ ref, designation, quantite, unite, role, fournitures: [] });
/** La lecture du modèle sur le devis de réparation D.2026.105 (§49.9, §51.5) : la fourniture de chaque prestation, ses questions. */
const REPARATION: LectureDevis = {
  fiche: { donnees: [] },
  bref: [],
  questions: [
    { cle: "modele_teinte_tuile", texte: "Modèle et teinte de la tuile ?", boutons: [], unite: null, donnee: "modèle et teinte de tuile", ligne: "2" },
    { cle: "type_element_de_rive", texte: "Type d'élément de rive ?", boutons: [{ label: "tuile de rive", valeur: "tuile de rive" }, { label: "bande zinc", valeur: "bande zinc" }], unite: null, donnee: "type d'élément de rive", ligne: "4" },
  ],
  lignes: [
    sans("1", "Accès toiture et mise en sécurité (échelle, harnais, protections)", "1", "fft", "hors_quantitatif"),
    {
      ref: "2",
      designation: "Remplacement unitaire d'une tuile cassée, comprenant accès toit, dépose de la tuile cassée et pose de la tuile neuve – Tuile terre cuite mécanique",
      quantite: "20",
      unite: "u",
      role: "fourniture_et_pose",
      fournitures: [{ nom: "Tuile terre cuite mécanique", quantite: "20", unite: "u", ouvrage: null, emplacement: null, donnees: {}, attend: ["modele_teinte_tuile"], aPreciser: [], precision: null }],
    },
    sans("3", "Repositionnement des tuiles", "1,5", "h", "pose"),
    {
      ref: "4",
      designation: "Reprise de l'élément de rive, y compris les petites fournitures de fixation",
      quantite: "1",
      unite: "fft",
      role: "fourniture_et_pose",
      fournitures: [{ nom: "Fixations pour l'élément de rive", quantite: "1", unite: "jeu", ouvrage: null, emplacement: null, donnees: {}, attend: ["type_element_de_rive"], aPreciser: [], precision: null }],
    },
    sans("5", "Évacuation des déchets et nettoyage de fin de chantier", "1", "fft", "hors_quantitatif"),
  ],
  contexte: null,
  notes: [],
};
class Reparation implements LectureReader {
  readonly provider = "fake";
  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis> | null> {
    const r = await new FakeLectureReader().lire(request);
    return r ? { ...r, output: structuredClone(REPARATION) } : r;
  }
}
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new Reparation()));
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
