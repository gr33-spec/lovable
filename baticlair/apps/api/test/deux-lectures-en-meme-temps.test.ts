import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * DEUX LECTURES EN MÊME TEMPS (cause trouvée le 18 novembre 2026, en cherchant pourquoi trois parcours tombaient sous la
 * charge). La première lecture qui rencontre une version de la fiche en écrit l'instantané ; une seconde lecture lancée
 * au même instant butait sur la clé unique et l'artisan lisait « Un problème est survenu de notre côté ».
 * RÈGLE PERMANENTE : l'instantané déjà écrit par un autre n'est pas une erreur ; les deux lectures aboutissent.
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
  await ctx.prisma.referentialSnapshot.deleteMany({});
});

describe("deux artisans lancent une lecture au même instant", () => {
  it("les six listes sont créées, aucune erreur du serveur", async () => {
    const comptes = await Promise.all(["a", "b", "c", "d", "e", "f"].map((x) => signUpWithCompany(ctx.app, `${x}@example.fr`, `Toitures ${x.toUpperCase()}${x}`)));
    const lignes = [{ libelle: "Gouttière zinc demi-ronde de 25", quantite: "24", unite: "ml" }];
    const reponses = await Promise.all(comptes.map(({ agent }) => agent.post("/v1/quantitatifs").send({ reference: "Maison", adresse: "29200 Brest", lignes })));
    expect(reponses.map((r) => r.status)).toEqual([201, 201, 201, 201, 201, 201]);
  });
});
