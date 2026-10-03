import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * § 43.4 : les notifications ne sont pas demandées à l'installation mais au premier envoi fournisseur ;
 * si refusées, reproposées au troisième envoi, puis plus jamais ; un réglage dans Compte les active à
 * tout moment.
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

describe("notifications : proposées au 1er envoi, puis au 3e, puis plus jamais", () => {
  it("l'invitation suit les envois, et s'arrête quand c'est activé", async () => {
    const agent = await signUp(ctx.app, "a@example.fr");
    expect((await agent.get("/v1/me/notifications")).body).toEqual({ enabled: false, promptCount: 0, askAtNextSend: true });
    // Premier envoi : proposée, refusée (« Plus tard »).
    expect((await agent.post("/v1/me/notifications/prompted")).body).toEqual({ enabled: false, promptCount: 1, askAtNextSend: false });
    // Deuxième envoi : rien. Troisième : reproposée.
    expect((await agent.get("/v1/me/notifications")).body.askAtNextSend).toBe(false);
    expect((await agent.post("/v1/me/notifications/prompted")).body).toEqual({ enabled: false, promptCount: 2, askAtNextSend: true });
    expect((await agent.post("/v1/me/notifications/prompted")).body).toEqual({ enabled: false, promptCount: 3, askAtNextSend: false });
    expect((await agent.post("/v1/me/notifications/prompted")).body.askAtNextSend).toBe(false);
    // Le réglage dans Compte : activer à tout moment, puis couper.
    expect((await agent.post("/v1/me/notifications").send({ enabled: true })).body).toMatchObject({ enabled: true, askAtNextSend: false });
    expect((await agent.post("/v1/me/notifications").send({ enabled: false })).body).toMatchObject({ enabled: false });
    expect((await agent.post("/v1/me/notifications").send({ enabled: "oui" })).status).toBe(400);
  });

  it("l'état est propre à chaque personne", async () => {
    const a = await signUp(ctx.app, "a@example.fr");
    const b = await signUp(ctx.app, "b@example.fr");
    await a.post("/v1/me/notifications").send({ enabled: true });
    expect((await b.get("/v1/me/notifications")).body.enabled).toBe(false);
  });
});
