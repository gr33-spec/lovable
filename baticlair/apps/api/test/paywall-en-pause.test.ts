/**
 * Retour du fondateur (2026-10-11, capture « Limite de ta formule atteinte ») : « fais en sorte que je puisse utiliser
 * pour l'instant ; on mettra le paywall actif plus tard ». Le paywall est EN PAUSE par défaut : aucune formule ne bloque
 * la création d'un chantier, l'écran de limite ne s'affiche plus ; l'usage reste compté. `PAYWALL=on` le rallume.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BillingService } from "../src/modules/billing/index.js";
import { loadConfig } from "../src/platform/config/config.js";
import { DEFAULT_PLANS } from "../src/platform/config/plans.js";
import { PrismaService } from "../src/platform/database/prisma.service.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  // Une formule Pro réduite à 2 chantiers : la limite est atteinte vite, comme chez le fondateur avec ses 30.
  const plans = DEFAULT_PLANS.map((p) => (p.key === "trial" ? { ...p, projectLimit: 2 } : p));
  ctx = await createTestApp((b) =>
    b.overrideProvider(BillingService).useFactory({
      factory: (p: PrismaService) => new BillingService(p, { plans, activationCodes: {}, enforced: false }),
      inject: [PrismaService],
    }),
  );
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("paywall en pause (fondateur, 2026-10-11)", () => {
  it("par défaut, le paywall est éteint ; PAYWALL=on le rallume", () => {
    const base = { ...process.env };
    expect(loadConfig({ ...base, PAYWALL: undefined }).billing.enforced).toBe(false);
    expect(loadConfig({ ...base, PAYWALL: "on" }).billing.enforced).toBe(true);
  });

  it("au-delà de la limite, le chantier se crée quand même, et l'écran de limite ne s'affiche pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    for (const name of ["A", "B", "C", "D"]) await agent.post("/v1/projects").send({ name }).expect(201);
    expect((await agent.get("/v1/billing")).body).toMatchObject({ usage: { projects: 4, limit: 2 }, limitReached: false, payant: false });
  });
});
