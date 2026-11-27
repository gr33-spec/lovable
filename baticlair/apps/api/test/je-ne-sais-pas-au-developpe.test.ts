import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * « JE NE SAIS PAS » AU DÉVELOPPÉ (Greg, 23 novembre 2026 : « Ensuite : « Je ne sais pas » au développé mène à « Combien de
 * feuilles ? », sans bloquer l'écran. »). L'écran n'envoie ses « Je ne sais pas » qu'au calcul : la question des feuilles
 * naît donc à ce moment-là. Le serveur ne calcule pas : il rend l'écran des questions avec elle (200, phase « questions »).
 * Répondue, le calcul part et la ligne prend le nombre dit ; laissée sans réponse, le calcul part quand même.
 * Le devis : C01 du banc d'essai (ardoise, faîtage zinc sans développé), lecture enregistrée.
 */
const LIGNES: FixtureRow[] = [["1", "JEU-BANC-C01 Faîtage zinc", "8 ml", "40,00", "320,00"]];

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

type Q = { id: string; texte: string; boutons?: { label: string; valeur: string }[] };
type Ecran = { phase: string; questions: Q[]; lignes?: unknown };

describe("« Je ne sais pas » au développé, par l'API", () => {
  it("le calcul revient avec « Combien de feuilles ? » ; répondue, la liste sort avec le nombre dit", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs").field("reference", "Feuilles").attach("file", Buffer.from(await makePdf(["devis"], LIGNES)), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    const id = res.body.id as string;
    const ecran = (await agent.get(`/v1/quantitatifs/${id}?ecran=1`)).body as Ecran;
    const faconnage = ecran.questions.find((q) => /pli|fa[çc]onn/i.test(q.texte));
    const dev = ecran.questions.find((q) => /developpe/.test(q.id));
    expect(dev, JSON.stringify(ecran.questions.map((q) => q.id))).toBeTruthy();
    // Comme l'écran : la réponse « je plie » part dès qu'elle est donnée, les « Je ne sais pas » au calcul.
    if (faconnage) expect((await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: faconnage.id, valeur: "1" }] })).status).toBeLessThan(300);
    const autres = ecran.questions.filter((q) => q !== faconnage && q.id.startsWith("engine:")).map((q) => ({ question: q.id, valeur: null }));
    const c = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: autres });
    expect(c.status).toBe(200);
    const retour = c.body as Ecran;
    expect(retour.phase).toBe("questions");
    const feuilles = retour.questions.find((q) => /feuilles_/.test(q.id))!;
    expect(feuilles.texte).toBe("Pour le faîtage, combien de feuilles de zinc te faut-il ?");
    const fin = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: feuilles.id, valeur: "3" }] });
    expect(fin.status).toBe(200);
    expect((fin.body as Ecran).phase).not.toBe("questions");
    expect(JSON.stringify(fin.body.lignes)).toMatch(/Feuilles[^"]*2 × 1 m/);
  }, 120_000);

  it("« Je ne sais pas » aussi aux feuilles : le calcul part, sans reposer la question", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs").field("reference", "Feuilles").attach("file", Buffer.from(await makePdf(["devis"], LIGNES)), { filename: "devis.pdf", contentType: "application/pdf" });
    const id = res.body.id as string;
    const ecran = (await agent.get(`/v1/quantitatifs/${id}?ecran=1`)).body as Ecran;
    const faconnage = ecran.questions.find((q) => /pli|fa[çc]onn/i.test(q.texte));
    if (faconnage) await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: faconnage.id, valeur: "1" }] });
    const autres = ecran.questions.filter((q) => q !== faconnage && q.id.startsWith("engine:")).map((q) => ({ question: q.id, valeur: null }));
    const retour = (await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: autres })).body as Ecran;
    const feuilles = retour.questions.find((q) => /feuilles_/.test(q.id))!;
    const fin = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: feuilles.id, valeur: null }] });
    expect(fin.status).toBe(200);
    expect((fin.body as Ecran).phase).not.toBe("questions");
  }, 120_000);
});
