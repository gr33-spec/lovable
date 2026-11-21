/**
 * Retour du fondateur (2026-10-12, capture iPhone, devis DE00000071) : « Un champ n'est pas correctement rempli » au
 * « Calculer ma liste », alors que tout était rempli. Cause : la case « Autre » d'une question écrite accepte 300
 * caractères, le serveur en refusait plus de 120. Et « donne la possibilité de supprimer des questions avec une
 * poubelle » : une question retirée part sans réponse (`null`) ; §51.6, sa ligne reste orange, sa question sur la ligne.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { DE00000071_PDF } from "./support/de00000071-pdf.js";

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

async function depose(agent: Agent) {
  const res = await agent.post("/v1/quantitatifs").field("reference", "DE00000071").field("adresse", "22620 Ploubazlanec").attach("file", Buffer.from(await DE00000071_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status).toBe(201);
  return { id: res.body.id as string, projetId: res.body.projetId as string };
}

type Row = { status: string; reason?: string; decisionKey?: string };
const rows = async (agent: Agent, projetId: string) => {
  const t = (await agent.get(`/v1/projects/${projetId}/takeoff`).expect(200)).body.takeoff as { view: { decisions: { key: string; question: unknown }[] }; purchase: { screen: { groups: { rows: Row[] }[] } } };
  return { rows: t.purchase.screen.groups.flatMap((g) => g.rows), questions: t.view.decisions.filter((d) => d.question).map((d) => d.key) };
};

describe("l'écran des questions : réponse écrite et question retirée", () => {
  it("une réponse écrite sous « Autre » de 300 caractères passe ; au-delà, le refus nomme la réponse fautive", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const { id } = await depose(agent);
    const ecrite = `Membrane EPDM en un seul lé, relevés de 15 cm sous les tôles, naissance au milieu du chéneau. ${"Détail. ".repeat(40)}`.slice(0, 300);
    expect(ecrite.length).toBe(300);
    const trop = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: "engine:param:developpe_gouttiere", valeur: "25", unite: "cm" }, { question: "engine:fiche:cheneau_membrane", valeur: `${ecrite}x` }] });
    expect(trop.status).toBe(400);
    expect(trop.body.error.details).toEqual([expect.objectContaining({ path: "reponses.1.valeur" })]);
    const ok = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: "engine:param:developpe_gouttiere", valeur: "25", unite: "cm" }, { question: "engine:fiche:cheneau_membrane", valeur: ecrite }] });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
  }, 30_000);

  it("une question retirée (poubelle) part sans réponse : le calcul passe, sa ligne reste orange avec sa question", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const { id, projetId } = await depose(agent);
    const res = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: "engine:param:developpe_gouttiere", valeur: null }] });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const vue = await rows(agent, projetId);
    const gouttiere = vue.rows.find((r) => r.decisionKey === "engine:param:developpe_gouttiere")!;
    expect(gouttiere).toMatchObject({ status: "check", reason: "Développé à préciser" });
    expect(vue.questions).toContain("engine:param:developpe_gouttiere");
  }, 30_000);
});
