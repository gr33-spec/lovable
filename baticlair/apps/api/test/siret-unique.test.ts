import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * UN SEUL COMPTE PAR SIRET VÉRIFIÉ (Greg, 14 novembre 2026, recette n° 2). Avant : deux comptes « Entreprise vérifiée »
 * avec le même SIRET, qui n'était à aucun des deux. Les autres tests partagent le SIRET fictif des jeux de test
 * (`SIRETS_DE_TEST`) ; ici la vraie règle, sans exception.
 */
let ctx: TestContext;
const avant = { SIRETS_DE_TEST: process.env.SIRETS_DE_TEST, GROUPE: process.env.GROUPE };
const SIRET = "73282932000074";
const AUTRE = "55208131766522";
beforeAll(async () => {
  process.env.SIRETS_DE_TEST = "";
  process.env.GROUPE = "on";
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const profil = (siret: string) => ({ name: "Toitures", address: "3 rue des Ajoncs, 22300 Lannion", siret, phone: null, email: null });

describe("un seul compte par SIRET vérifié", () => {
  it("le premier compte vérifie son SIRET ; un second compte avec le même SIRET est refusé, avec une phrase claire", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await a.agent.patch("/v1/company/profile").send(profil(SIRET)).expect(200);
    await b.agent.patch("/v1/company/profile").send(profil(SIRET)).expect(200);
    expect((await a.agent.post("/v1/groupe/siret").expect(200)).body).toMatchObject({ verifie: true });
    const refus = (await b.agent.post("/v1/groupe/siret").expect(200)).body;
    expect(refus).toMatchObject({ verifie: false, statut: "deja_utilise" });
    expect(refus.message).toBe("Ce SIRET est déjà vérifié sur un autre compte Mobiiz. Si c'est bien ton entreprise, écris à contact@mobiiz.fr.");
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: b.companyId } })).siretVerifieLe).toBeNull();
    // Le premier compte peut revérifier le sien.
    expect((await a.agent.post("/v1/groupe/siret").expect(200)).body).toMatchObject({ verifie: true });
  });

  it("un SIRET qui change n'est plus « vérifié » : pas de vérification empruntée", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.patch("/v1/company/profile").send(profil(SIRET)).expect(200);
    await a.agent.post("/v1/groupe/siret").expect(200);
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: a.companyId } })).siretVerifieLe).not.toBeNull();
    // Le même SIRET réenregistré ne change rien.
    await a.agent.patch("/v1/company/profile").send(profil(SIRET)).expect(200);
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: a.companyId } })).siretVerifieLe).not.toBeNull();
    await a.agent.patch("/v1/company/profile").send(profil(AUTRE)).expect(200);
    expect((await ctx.prisma.company.findUniqueOrThrow({ where: { id: a.companyId } })).siretVerifieLe).toBeNull();
  });
});
