/**
 * TEMPS DEUX, les questions (directive du fondateur, 2026-10-12) : « Quand tout est répondu, un deuxième appel Opus
 * réanalyse la fiche avec les réponses et peut en poser une de plus. » Et « Article ajouté à la main sans unité : orange
 * avec question « unité ? » (case avec unité), jamais vert sans unité (51.6). »
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FICHE_RELECTEUR, type FicheRelecteur, type RelectureInput, type RelectureWire } from "../src/modules/takeoff/application/fiche-relecture.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { DE00000071_PDF } from "./support/de00000071-pdf.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/** Un relecteur qui ne fait que le bilan : la première fois, il demande la largeur du chéneau. */
class BilanStub implements FicheRelecteur {
  readonly provider = "fake";
  calls: RelectureInput[] = [];
  async relire(input: RelectureInput): Promise<ReadAttempt<RelectureWire>> {
    this.calls.push(input);
    const first = this.calls.filter((c) => c.question.key === "bilan").length === 1 && input.question.key === "bilan";
    return {
      provider: "fake",
      model: "claude-opus-5-5",
      usage: { inputTokens: 600, outputTokens: 80 },
      status: "success",
      output: { fiche: [], reponses: [], manque: first ? { donnee: "largeur du chéneau", question: "Le chéneau fait quelle largeur, en cm ?" } : { donnee: "", question: "" } },
      errorCode: null,
      durationMs: 1,
    };
  }
}

const stub = new BilanStub();
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(FICHE_RELECTEUR).useValue(stub));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  stub.calls = [];
});

type Question = { id: string; texte: string };
type Ligne = { libelle: string; texte: string | null; couleur?: string; statut?: string };

async function depose(agent: Agent) {
  const res = await agent.post("/v1/quantitatifs").field("reference", "DE00000071").field("adresse", "22620 Ploubazlanec").attach("file", Buffer.from(await DE00000071_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("temps deux : le bilan IA des réponses, une fois, avant de calculer", () => {
  it("toutes les réponses données, l'IA relit la fiche avec elles et pose UNE question de plus ; le calcul suivant ne la refait pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const id = await depose(agent);
    const first = (await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: "engine:param:developpe_gouttiere", valeur: "25", unite: "cm" }] }).expect(200)).body as { questions: Question[] };
    const bilans = stub.calls.filter((c) => c.question.key === "bilan");
    expect(bilans).toHaveLength(1);
    // Le bilan lit les réponses données : la question posée et la réponse choisie, en clair.
    expect(bilans[0]!.texte).toMatch(/De 25/);
    const extra = first.questions.find((q) => q.id === "fiche:largeur_du_cheneau");
    expect(extra).toMatchObject({ texte: "Le chéneau fait quelle largeur, en cm ?" });
    const second = (await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: extra!.id, valeur: "60" }] }).expect(200)).body as { questions: Question[]; etat?: string };
    expect(stub.calls.filter((c) => c.question.key === "bilan")).toHaveLength(1);
    expect(second.questions.map((q) => q.id)).not.toContain(extra!.id);
  }, 30_000);

  it("sans aucune réponse donnée, pas de bilan (rien à relire)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const id = await depose(agent);
    await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({}).expect(200);
    expect(stub.calls.filter((c) => c.question.key === "bilan")).toHaveLength(0);
  }, 30_000);
});

describe("temps deux : une ligne ajoutée à la main sans unité demande son unité", () => {
  it("orange « Unité à préciser » avec sa question ; l'unité répondue la passe au vert", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const id = await depose(agent);
    await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({}).expect(200);
    const added = (await agent.post(`/v1/quantitatifs/${id}/corrections?ecran=1`).send({ action: "ajouter", ligne: { libelle: "Bâche de protection 4 × 5 m", quantite: "2" } }).expect(201)).body as { questions: Question[]; lignes: Ligne[] };
    const q = added.questions.find((x) => x.id.startsWith("engine:unite:"));
    expect(q).toMatchObject({ texte: "Bâche de protection 4 × 5 m : quelle unité ?" });
    const done = (await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: q!.id, valeur: "u" }] }).expect(201)).body as { questions: Question[]; lignes: Ligne[] };
    expect(done.questions.map((x) => x.id)).not.toContain(q!.id);
    expect(done.lignes.find((l) => /^Bâche/.test(l.libelle))?.texte).toBe("2 pièces");
  }, 30_000);
});
