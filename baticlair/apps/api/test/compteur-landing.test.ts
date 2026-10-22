import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * Landing du 22 octobre (Greg) : « X couvreurs déjà inscrits dans les Côtes-d'Armor », vrai chiffre de la base, masqué
 * sous 10. Public, un seul nombre ; les autres métiers, les autres départements et les comptes de démonstration ne comptent pas.
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

async function couvreur(email: string, address: string, trades = ["roofing"]) {
  const { companyId } = await signUpWithCompany(ctx.app, email, `Toitures ${email}`, trades);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { address } });
}

describe("GET /v1/public/compteur", () => {
  it("masqué sous 10 couvreurs du 22, puis le vrai nombre ; sans session, sans rien d'une entreprise", async () => {
    const { default: request } = await import("supertest");
    const anon = () => request(ctx.app.getHttpServer()).get("/v1/public/compteur");
    for (let i = 0; i < 9; i++) await couvreur(`c${i}@example.fr`, `${i} rue du Port, 22500 Paimpol`);
    // Hors compte : un autre département, un autre métier, un compte de démonstration.
    await couvreur("brest@example.fr", "5 rue de Siam, 29200 Brest");
    await couvreur("carreleur@example.fr", "3 rue des Ajoncs, 22300 Lannion", ["tiling"]);
    await couvreur("demo-1@demo.baticlair.fr", "1 rue du Quai, 22000 Saint-Brieuc");
    expect((await anon().expect(200)).body).toEqual({ departement: "22", couvreurs: null });
    await couvreur("c9@example.fr", "Le Bourg 22620 Ploubazlanec");
    expect((await anon().expect(200)).body).toEqual({ departement: "22", couvreurs: 10 });
  });
});
