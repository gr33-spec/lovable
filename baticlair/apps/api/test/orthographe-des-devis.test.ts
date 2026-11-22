import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

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

/**
 * LES FAUTES D'ORTHOGRAPHE DES ARTISANS (Greg, 22 novembre 2026) : le devis est remis au propre avant le calcul ; « En cas
 * de vrai doute sur un mot, on demande : Tu as écrit "…", c'est bien … ? ». « Arretier » peut être l'arêtier (la ligne de
 * toit) ou l'arêtière (la tuile) : la question se pose, la réponse remplace le mot.
 */
const LIGNES: FixtureRow[] = [
  ["1", "Couverture en ardoize naturelle 32x22 au croché inox", "80 m2", "95,00", "7 600,00"],
  ["2", "Arretier zinc 10 ml", "1 u", "300,00", "300,00"],
];

describe("le devis remis au propre, par l'API", () => {
  it("un vrai doute est une question ; la réponse remplace le mot et la question ne revient plus", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs").field("reference", "Fautes").attach("file", Buffer.from(await makePdf(["devis"], LIGNES)), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    const id = res.body.id as string;
    const ecran = async () => (await agent.get(`/v1/quantitatifs/${id}?ecran=1`)).body as { questions: { id: string; texte: string; boutons?: { label: string; valeur: string }[] }[] };
    const doute = (await ecran()).questions.find((q) => q.id.includes("orthographe:"));
    expect(doute?.texte).toMatch(/^Tu as écrit « Arretier », c'est bien /);
    const r = await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: doute!.id, valeur: "arêtier" }] });
    expect(r.status).toBeLessThan(300);
    expect((await ecran()).questions.some((q) => q.id.includes("orthographe:"))).toBe(false);
  }, 60_000);
});
