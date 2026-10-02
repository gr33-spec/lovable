import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BillingService } from "../src/modules/billing/index.js";
import { DEFAULT_PLANS } from "../src/platform/config/plans.js";
import { PrismaService } from "../src/platform/database/prisma.service.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  // Formules réelles, avec l'essai limité à 3 chantiers comme à l'ouverture (en bêta, l'essai est sans limite).
  const plans = DEFAULT_PLANS.map((p) => (p.key === "trial" ? { ...p, projectLimit: 3 } : p));
  ctx = await createTestApp((b) =>
    b.overrideProvider(BillingService).useFactory({
      factory: (p: PrismaService) => new BillingService(p, { plans, activationCodes: { "TEST-SOLO-2026": "solo" } }),
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

describe("bêta : essai sans limite de chantiers", () => {
  it("les formules par défaut ne bloquent jamais un chantier pendant l'essai", () => {
    expect(DEFAULT_PLANS.find((p) => p.key === "trial")?.projectLimit).toBeNull();
  });
});

describe("formules : essai, limite, activation", () => {
  it("essai de 3 chantiers : la démonstration ne compte pas, le 4e chantier est bloqué, un chantier commencé continue", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const status = (await agent.get("/v1/billing").expect(200)).body;
    expect(status).toMatchObject({
      plan: { key: "trial", label: "Essai gratuit", projectLimit: 3 },
      usage: { projects: 0, limit: 3, remaining: 3 },
      limitReached: false,
      activationEnabled: true,
    });
    expect(status.offers.map((o: { key: string }) => o.key)).toEqual(["solo", "pro"]);

    await agent.post("/v1/demo/project").expect(201);
    for (const name of ["A", "B", "C"]) await agent.post("/v1/projects").send({ name }).expect(201);
    expect((await agent.get("/v1/billing")).body).toMatchObject({ usage: { projects: 3, remaining: 0 }, limitReached: true });

    const refused = await agent.post("/v1/projects").send({ name: "D" });
    expect(refused.status).toBe(402);
    expect(refused.body.error).toMatchObject({ code: "plan_limit_reached", details: { plan: "trial", limit: 3, used: 3 } });

    // La démonstration reste possible, et un chantier commencé n'est jamais bloqué.
    await agent.post("/v1/demo/project").expect(201);
    const project = (await agent.get("/v1/projects")).body.items.find((p: { name: string }) => p.name === "A");
    await agent.patch(`/v1/projects/${project.id}`).send({ clientName: "M. Durand" }).expect(200);
  });

  it("« Choisir cette formule » note la demande ; un code active la formule et lève le blocage", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    for (const name of ["A", "B", "C"]) await agent.post("/v1/projects").send({ name }).expect(201);

    expect((await agent.post("/v1/billing/request").send({ plan: "trial" })).status).toBe(400);
    const requested = (await agent.post("/v1/billing/request").send({ plan: "solo" }).expect(200)).body;
    expect(requested).toMatchObject({ requestedPlan: "solo", limitReached: true });

    const wrong = await agent.post("/v1/billing/activate").send({ code: "MAUVAIS-CODE" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details).toMatchObject({ reason: "invalid_activation_code" });

    const activated = (await agent.post("/v1/billing/activate").send({ code: "TEST-SOLO-2026" }).expect(200)).body;
    expect(activated).toMatchObject({ plan: { key: "solo", projectLimit: 10, period: "month" }, requestedPlan: null, limitReached: false });
    await agent.post("/v1/projects").send({ name: "D" }).expect(201);
  });

  it("chaque entreprise a sa propre formule", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Leroy");
    await a.agent.post("/v1/billing/activate").send({ code: "TEST-SOLO-2026" }).expect(200);
    expect((await b.agent.get("/v1/billing")).body.plan.key).toBe("trial");
  });
});
