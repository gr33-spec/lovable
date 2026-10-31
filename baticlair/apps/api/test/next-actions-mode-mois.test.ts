import { afterAll, beforeAll, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * Greg (23 octobre 2026) : avec la commande du mois, l'accueil ne propose plus l'ancienne logique (« Ajouter le devis
 * client », « Comparer les offres ») ; un chantier vide n'a rien « à faire ». La santé dit le mode à l'écran.
 */
let ctx: TestContext;
const avant = process.env.GROUPE;
beforeAll(async () => {
  process.env.GROUPE = "on";
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
});
afterAll(async () => {
  await ctx.app.close();
  if (avant === undefined) delete process.env.GROUPE;
  else process.env.GROUPE = avant;
});

it("en mode mois, un chantier sans devis n'a pas d'action « Ajouter le devis client » ; la santé dit le mode", async () => {
  const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
  await agent.post("/v1/projects").send({ name: "Chantier Martin" }).expect(201);
  expect((await agent.get("/v1/next-actions").expect(200)).body.items).toEqual([]);
  expect((await agent.get("/v1/health").expect(200)).body.features).toMatchObject({ groupe: true, commandeCommune: "mois" });
  // Une liste à valider reste une action.
  await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2000", unite: "pièces" }] }).expect(201);
  const items = (await agent.get("/v1/next-actions").expect(200)).body.items as { kind: string }[];
  expect(items.map((i) => i.kind)).not.toContain("add_quote");
});

it("l'accueil montre la commande du mois d'une entreprise sans adresse d'après son dernier chantier adressé", async () => {
  const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B", ["roofing"]);
  expect((await agent.get("/v1/commande-du-mois").expect(200)).body.prochaine).toBeNull();
  await agent.post("/v1/projects").send({ name: "Toiture Garnier", address: "5 rue du Port, 56000 Vannes" }).expect(201);
  const prochaine = (await agent.get("/v1/commande-du-mois").expect(200)).body.prochaine as { zone: string; clotureLe: string; toi: string | null; vide: boolean };
  expect(prochaine).toMatchObject({ zone: "56", toi: null, vide: true });
  expect(prochaine.clotureLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  // Afficher la commande ne crée rien en base : le cycle naît au premier dépôt.
  expect(await ctx.prisma.cycleCommande.count({ where: { zone: "56" } })).toBe(0);
});
