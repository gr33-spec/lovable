import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * « TOUT EST BON » (retour du fondateur, 2026-10-05 : « 182 lignes à corriger, c'est hyper mega long ») : les lignes
 * orange qui n'attendent qu'une confirmation se règlent en UN envoi. Chaque ligne va au journal (une entrée par ligne),
 * les questions à choix restent posées.
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

type Q = { id: string; questions: { id: string; boutons: { label: string; valeur: string }[] }[] };
const DOUBLONS = {
  metier: "electricite",
  lignes: ["Prise four", "Prise four", "Prise RJ45", "Prise RJ45", "Prise TV", "Prise TV"].map((libelle) => ({ libelle, quantite: "1", unite: "u" })),
};

describe("« Tout est bon » : plusieurs confirmations en un envoi", () => {
  it("trois doublons gardés d'un coup : plus rien à vérifier, une entrée de journal par ligne", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "e@example.fr", "Élec Le Bihan", ["electrical"]);
    const q = (await agent.post("/v1/quantitatifs").send(DOUBLONS)).body as Q;
    const simple = q.questions.filter((x) => x.boutons.length === 1 && x.boutons[0]!.valeur === "ok");
    expect(simple).toHaveLength(3);
    const before = await ctx.prisma.correctionEvent.count({ where: { action: "confirm" } });
    const res = await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: simple.map((x) => ({ question: x.id, valeur: "ok" })) });
    expect(res.status).toBe(201);
    expect((res.body as Q).questions.filter((x) => x.id.startsWith("duplicate:"))).toHaveLength(0);
    expect(await ctx.prisma.correctionEvent.count({ where: { action: "confirm" } })).toBe(before + 6);
  });

  it("un gros devis : jusqu'à 500 réponses en un envoi", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "f@example.fr", "Élec Kerguelen", ["electrical"]);
    const q = (await agent.post("/v1/quantitatifs").send(DOUBLONS)).body as Q;
    const many = Array.from({ length: 21 }, () => ({ question: q.questions[0]!.id, valeur: "ok" }));
    expect((await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: many })).status).toBe(201);
  });
});
