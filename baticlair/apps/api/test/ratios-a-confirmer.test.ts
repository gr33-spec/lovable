import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §47.7 (1 et 4) : une quantité calculée avec un ratio « à vérifier » sort ORANGE avec la mention « Quantité à
 * confirmer » et la règle ; « C'est bon » la passe au vert et crée une entrée de journal. Trois confirmations du même
 * ratio par trois comptes différents le passent « validé » (vert partout ensuite) ; deux confirmations par le même
 * compte ne comptent qu'une fois. L'envoi attend que tout soit vert ou gris (§47.3).
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

type Ligne = { id: string; libelle: string; quantite: number | null; a_confirmer: boolean; raison?: string };
type Q = { id: string; peut_partir: boolean; lignes: Ligne[]; questions: { id: string; texte: string; boutons: { label: string; valeur: string }[] }[] };
const CLOISON = { lignes: [{ libelle: "Cloison 72/48 BA13 sur ossature", quantite: "40", unite: "m²" }] };
const rails = (q: Q) => q.lignes.find((l) => /[Rr]ail/.test(l.libelle))!;

describe("§47 : la ligne « Quantité à confirmer »", () => {
  it("orange avec sa règle, « C'est bon » la passe au vert, une entrée de journal ; l'envoi attend", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "p@example.fr", "Plâtres Le Gall", ["drywall"]);
    const q = (await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q;
    expect(rails(q)).toMatchObject({ a_confirmer: true, raison: expect.stringMatching(/^Quantité à confirmer : .+/) });
    expect(rails(q).quantite).toBeGreaterThan(0);
    // Tant qu'une ligne est orange, la liste ne part pas.
    expect(q.peut_partir).toBe(false);
    const question = q.questions.find((x) => x.id === `ratio:${rails(q).id}`)!;
    expect(question.boutons).toEqual([{ label: "C'est bon", valeur: "ok" }]);
    const before = await ctx.prisma.correctionEvent.count({ where: { action: "confirm" } });
    const after = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: "ok" }] })).body as Q;
    expect(rails(after).a_confirmer).toBe(false);
    expect(await ctx.prisma.correctionEvent.count({ where: { action: "confirm" } })).toBe(before + 1);
  });

  it("trois entreprises différentes valident le ratio ; deux « C'est bon » de la même entreprise comptent une fois", async () => {
    const confirm = async (email: string, company: string, times = 1) => {
      const { agent } = await signUpWithCompany(ctx.app, email, company, ["drywall"]);
      for (let i = 0; i < times; i++) {
        const q = (await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q;
        const key = `ratio:${rails(q).id}`;
        if (q.questions.some((x) => x.id === key)) await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: key, valeur: "ok" }] });
      }
      return agent;
    };
    await confirm("a@example.fr", "Plâtres A", 2);
    const b = await confirm("b@example.fr", "Plâtres B");
    // Deux entreprises seulement (A a confirmé deux fois) : toujours orange ailleurs.
    expect(rails((await b.post("/v1/quantitatifs").send(CLOISON)).body as Q).a_confirmer).toBe(true);
    await confirm("c@example.fr", "Plâtres C");
    // Trois entreprises : validé, vert pour tout le monde, même un nouveau compte.
    const { agent } = await signUpWithCompany(ctx.app, "d@example.fr", "Plâtres D", ["drywall"]);
    expect(rails((await agent.post("/v1/quantitatifs").send(CLOISON)).body as Q).a_confirmer).toBe(false);
  });
});
