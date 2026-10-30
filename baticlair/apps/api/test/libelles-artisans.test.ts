import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { doubleAuthentification } from "./support/admin.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * « ÉCRIS TA LISTE » (Greg, 30 octobre 2026, puis la nuit même) : l'intitulé part tel qu'écrit (« Crochet gouttière bandeau
 * 25 » : le 25 est le développé, pas la quantité) ; il revient à son auteur seulement, jamais diffusé aux autres ; écrit par
 * plusieurs entreprises et générique, il devient une proposition que l'admin ajoute au catalogue, et seulement alors il est
 * proposé à tous. Jamais une donnée personnelle, jamais les lignes d'un partenaire.
 */
let ctx: TestContext;
const avant = process.env.GROUPE_ADMINS;
beforeAll(async () => {
  process.env.GROUPE_ADMINS = "greg@example.fr";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE_ADMINS;
  else process.env.GROUPE_ADMINS = avant;
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

type Agent = Awaited<ReturnType<typeof signUpWithCompany>>["agent"];
const ecrire = (agent: Agent, lignes: { libelle: string; quantite: string | null; unite: string }[]) => agent.post("/v1/quantitatifs").send({ lignes }).expect(201);
const proposes = async (agent: Agent, q: string) => {
  const b = (await agent.get(`/v1/catalogue?q=${encodeURIComponent(q)}`).expect(200)).body as { resultats: { designation: string }[]; ecrits: { designation: string }[] };
  return [...b.resultats, ...b.ecrits].map((e) => e.designation);
};

describe("les intitulés écrits par les artisans", () => {
  it("l'intitulé et la quantité restent ceux de l'artisan ; proposé à son auteur seulement ; générique et écrit par 3 entreprises, il attend l'admin, puis passe au catalogue de tous", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B");
    const c = await signUpWithCompany(ctx.app, "c@toitures.fr", "Toitures C");
    const d = await signUpWithCompany(ctx.app, "d@toitures.fr", "Toitures D");
    const q = (await ecrire(a.agent, [{ libelle: "Crochet gouttière bandeau 25", quantite: "40", unite: "pièces" }, { libelle: "Gouttière pour M. Dupont 06 12 34 56 78", quantite: null, unite: "pièces" }, { libelle: "Zinc chantier Martin", quantite: "3", unite: "m" }])).body;
    const t = await ctx.prisma.takeoff.findFirstOrThrow({ where: { projectId: q.projetId } });
    const ligne = await ctx.prisma.takeoffLine.findFirstOrThrow({ where: { takeoffId: t.id }, orderBy: { position: "asc" } });
    expect([ligne.designation, ligne.quantityRaw]).toEqual(["Crochet gouttière bandeau 25", "40"]);
    expect(await proposes(a.agent, "crochet bandeau")).toContain("Crochet gouttière bandeau 25");

    // Écrit par trois entreprises : toujours rien chez une quatrième.
    await ecrire(b.agent, [{ libelle: "crochet gouttiere  bandeau 25", quantite: "12", unite: "pièces" }, { libelle: "Zinc chantier Martin", quantite: "1", unite: "m" }]);
    await ecrire(c.agent, [{ libelle: "Crochet gouttière bandeau 25", quantite: "8", unite: "pièces" }, { libelle: "Zinc chantier Martin", quantite: "1", unite: "m" }]);
    expect(await proposes(d.agent, "crochet bandeau")).not.toContain("Crochet gouttière bandeau 25");
    expect(await proposes(d.agent, "zinc chantier")).not.toContain("Zinc chantier Martin");

    // L'admin voit la proposition générique, jamais l'intitulé qui porte un nom, et l'ajoute au catalogue.
    const greg = await signUpWithCompany(ctx.app, "greg@example.fr", "Bati Invest");
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    const items = (await greg.agent.get("/v1/admin/catalogue/propositions").expect(200)).body.items as { cle: string; libelle: string; entreprises: number }[];
    expect(items.map((i) => [i.libelle, i.entreprises])).toEqual([["Crochet gouttière bandeau 25", 3]]);
    await d.agent.get("/v1/admin/catalogue/propositions").expect(403);
    await greg.agent.post("/v1/admin/catalogue/propositions/accepter").send({ cle: items[0]!.cle, metier: "couverture", famille: "Zinguerie" }).expect((r) => expect([200, 201]).toContain(r.status));
    expect(await proposes(d.agent, "crochet bandeau")).toContain("Crochet gouttière bandeau 25");
    expect((await greg.agent.get("/v1/admin/catalogue/propositions").expect(200)).body.items).toEqual([]);
    // Rien de personnel n'est gardé.
    expect(await ctx.prisma.libelleEcrit.count({ where: { libelle: { contains: "Dupont" } } })).toBe(0);
  });
});
