import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LE QUANTITATIF À LA VOIX, PAR L'API (Greg, 28 novembre 2026). « Décris ton chantier » : le texte dicté part au serveur,
 * qui le remet au propre et le range en lignes par le code ; le quantitatif s'ouvre sur les QUESTIONS (comme un devis), puis
 * le calcul, les suggestions et la liste. Jamais des m² envoyés tels quels, jamais une caractéristique inventée, aucun
 * appel IA. La phrase exacte de Greg, de bout en bout.
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

type Q = { id: string; texte: string; boutons?: { label: string; valeur: string }[] };
type Ecran = { phase: string; questions: Q[]; lignes: { libelle: string; quantite: string | null; texte?: string | null }[] };
const PHRASE = "je dois environ 50 m² d'ardoise 32x22, j'ai une gouttière bandeau avec les crochets, gouttière bandeau de 25, et je dois prévoir également deux châtia";

describe("« Décris ton chantier » passe par le moteur", () => {
  it("la phrase de Greg : questions d'abord, puis la liste en unités de vente (aucun m²), chatières comprises", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "voix@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ dictee: PHRASE, reference: "À la voix" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    const id = res.body.id as string;
    let e = res.body as Ecran;
    expect(e.phase).toBe("questions");
    const posees: string[] = [];
    for (let i = 0; i < 12 && e.questions.length > 0; i++) {
      const q = e.questions[0]!;
      posees.push(q.texte);
      const valeur = /longueur de goutti/i.test(q.texte) ? "12" : q.boutons?.[0]?.valeur ?? null;
      const r = await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: q.id, valeur, ...(/longueur/i.test(q.texte) ? { unite: "m" } : {}) }] });
      expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBeLessThan(300);
      e = r.body as Ecran;
    }
    expect(posees.join(" | ")).toMatch(/agrafe ou à pointe/);
    expect(posees.join(" | ")).toMatch(/Longueur de gouttière/);
    expect(posees.join(" | ")).not.toMatch(/Gouttière de 25, de 28|bandeau\) \?/);
    const fin = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: "suggestions:choisies", valeur: "aucune" }] });
    expect(fin.status).toBe(200);
    const liste = ((fin.body as Ecran).lignes ?? []).map((l) => `${l.libelle} = ${l.texte ?? l.quantite}`);
    const texte = liste.join(" | ");
    expect(texte).toMatch(/Ardoises naturelles .*32×22 = [\d  ]+ pièces/);
    expect(texte).toMatch(/Crochets d'ardoise/);
    expect(texte).toMatch(/Gouttière dév\. 25 = 4 longueurs de 4 m/);
    expect(texte).toMatch(/Crochets de gouttière bandeau dév\. 25 = 31 pièces/);
    expect(texte).toMatch(/Chatières = 2 pièces/);
    expect(texte).not.toMatch(/m²/);
    // Le relevé du test, pour le compte rendu (aucune donnée de personne).
    (await import("node:fs")).writeFileSync(process.env.LISTE_VOIX ?? "/dev/null", `QUESTIONS\n${posees.join("\n")}\n\nLISTE\n${liste.join("\n")}\n`);
  }, 120_000);

  it("une dictée vide de tout article ne fait jamais une liste", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "voix2@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ dictee: "bonjour" });
    expect(res.status).toBe(400);
  });
});
