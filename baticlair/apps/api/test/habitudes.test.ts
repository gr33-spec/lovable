import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * HABITUDES DE L'ENTREPRISE (§41, demande du fondateur du 2026-10-03) : « je façonne » répondu sur deux chantiers
 * différents devient l'habitude de l'entreprise ; au troisième chantier la question n'est plus posée, la réponse est
 * dite dans le calcul et reste modifiable d'un tap.
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

const JOINT_DEBOUT = { lignes: [{ libelle: "Couverture zinc joint debout", quantite: "91", unite: "m²" }] };
type Q = { id: string; questions: { id: string }[]; lignes: { libelle: string; quantite: number | null; unite: string | null; explication: { morceaux: { cle?: string; confiance: string }[] } }[] };

describe("« je façonne » : apprise à la deuxième confirmation, plus jamais demandée ensuite", () => {
  it("chantier 1 et 2 : la question se pose, l'artisan répond ; chantier 3 : plus de question, la bobine se calcule, l'habitude est dite", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    for (const n of [1, 2]) {
      const q = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: `Chantier ${n}` })).body as Q;
      expect(q.questions.map((x) => x.id)).toContain("engine:param:faconnage");
      const res = await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:faconnage", valeur: "1" }] });
      expect(res.status).toBe(201);
      const answered = res.body as Q;
      expect(answered.questions.map((x) => x.id)).not.toContain("engine:param:faconnage");
    }
    const third = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 3" })).body as Q;
    expect(third.questions.map((x) => x.id)).not.toContain("engine:param:faconnage");
    const bobine = third.lignes.find((l) => /bobine/i.test(l.libelle))!;
    expect(bobine).toMatchObject({ libelle: "Bobine zinc naturel 0,65 mm, largeur 500 mm", quantite: 221, unite: "ml" });
    expect(bobine.explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:faconnage", confiance: "artisan" }));
    // Un autre chantier peut toujours dire autre chose : la réponse du chantier passe devant l'habitude.
    const res = await agent.post(`/v1/quantitatifs/${third.id}/reponses`).send({ reponses: [{ question: "param:faconnage", valeur: "2", unite: "u" }] });
    expect(res.status).toBe(201);
    const bacs = res.body as Q;
    expect(bacs.lignes.some((l) => /^Bacs/.test(l.libelle))).toBe(true);
    expect(bacs.lignes.some((l) => /bobine/i.test(l.libelle))).toBe(false);
  });

  it("une seule réponse ne fait pas une habitude : le chantier suivant redemande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    const q = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 1" })).body as Q;
    await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "param:faconnage", valeur: "1" }] });
    const next = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 2" })).body as Q;
    expect(next.questions.map((x) => x.id)).toContain("engine:param:faconnage");
  });
});
