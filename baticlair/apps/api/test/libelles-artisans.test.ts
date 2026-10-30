import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * « ÉCRIS TA LISTE » (Greg, 30 octobre 2026) : l'intitulé part tel qu'écrit (« Crochet gouttière bandeau 25 » : le 25 est
 * le développé, pas la quantité) ; écrit par deux entreprises, il est proposé à tous quand on tape ses mots ; à son auteur
 * dès la première fois ; jamais une donnée personnelle, jamais les lignes d'un partenaire.
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

const ecrire = (agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], lignes: { libelle: string; quantite: string | null; unite: string }[]) =>
  agent.post("/v1/quantitatifs").send({ lignes }).expect(201);
const proposes = async (agent: Awaited<ReturnType<typeof signUpWithCompany>>["agent"], q: string) =>
  ((await agent.get(`/v1/catalogue?q=${encodeURIComponent(q)}`).expect(200)).body.ecrits as { designation: string; unite: string }[]).map((e) => e.designation);

describe("les intitulés écrits par les artisans", () => {
  it("l'intitulé et la quantité restent ceux de l'artisan ; proposé à son auteur, puis à tous dès deux entreprises", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B");
    const c = await signUpWithCompany(ctx.app, "c@toitures.fr", "Toitures C");
    const q = (await ecrire(a.agent, [{ libelle: "Crochet gouttière bandeau 25", quantite: "40", unite: "pièces" }, { libelle: "Gouttière pour M. Dupont 06 12 34 56 78", quantite: null, unite: "pièces" }])).body;
    const t = await ctx.prisma.takeoff.findFirstOrThrow({ where: { projectId: q.projetId } });
    const ligne = await ctx.prisma.takeoffLine.findFirstOrThrow({ where: { takeoffId: t.id }, orderBy: { position: "asc" } });
    expect([ligne.designation, ligne.quantityRaw]).toEqual(["Crochet gouttière bandeau 25", "40"]);

    expect(await proposes(a.agent, "crochet bandeau")).toEqual(["Crochet gouttière bandeau 25"]);
    expect(await proposes(c.agent, "crochet bandeau")).toEqual([]);
    await ecrire(b.agent, [{ libelle: "crochet gouttiere  bandeau 25", quantite: "12", unite: "pièces" }]);
    expect(await proposes(c.agent, "crochet band")).toEqual(["Crochet gouttière bandeau 25"]);
    // Rien de personnel n'est gardé.
    expect(await ctx.prisma.libelleEcrit.count({ where: { libelle: { contains: "Dupont" } } })).toBe(0);
  });
});
