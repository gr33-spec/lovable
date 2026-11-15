import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
});

const linkIn = (text: string) => text.match(/https?:\/\/\S+/)?.[0] ?? "";

describe("identité", () => {
  it("refuse toute route métier sans session, avec une erreur normalisée", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/v1/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: "unauthenticated", retryable: false });
    expect(res.body.error.supportId).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("laisse la route de santé publique et reprend un x-request-id fourni", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/v1/health").set("x-request-id", "abcd1234-test");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe("abcd1234-test");
    expect(res.body).toEqual({ status: "ok", db: "ok", origine: { acceptees: ["http://localhost:3000"], demande: null, acceptee: null }, features: { email: true, ai: true, aiKey: null, alerts: false, groupe: false, commandeCommune: "mois", missions: false, memoire: false, connexions: false, chantierFictif: false, metiersOuverts: "tous" } });
  });

  it("inscrit, connecte immédiatement et envoie l'e-mail de vérification", async () => {
    const agent = await signUp(ctx.app, "jean@example.fr", "Jean Martin");
    const me = await agent.get("/v1/me");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      user: { email: "jean@example.fr", name: "Jean Martin", emailVerified: false },
      companies: [],
    });

    const email = ctx.emails.lastTo("jean@example.fr");
    expect(email?.subject).toBe("Confirme ton adresse e-mail");

    const verify = await agent.get(new URL(linkIn(email!.text)).pathname + new URL(linkIn(email!.text)).search);
    expect([200, 302]).toContain(verify.status);
    expect((await agent.get("/v1/me")).body.user.emailVerified).toBe(true);
  });

  it("refuse un mot de passe trop court", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/v1/auth/sign-up/email")
      .set("origin", WEB_ORIGIN)
      .send({ email: "court@example.fr", password: "court", name: "X" });
    expect(res.status).toBe(400);
  });

  it("réinitialise le mot de passe et révoque les anciennes sessions", async () => {
    const agent = await signUp(ctx.app, "paul@example.fr");
    const server = ctx.app.getHttpServer();

    const asked = await request(server)
      .post("/v1/auth/request-password-reset")
      .set("origin", WEB_ORIGIN)
      .send({ email: "paul@example.fr", redirectTo: `${WEB_ORIGIN}/nouveau-mot-de-passe` });
    expect(asked.status).toBe(200);

    const email = ctx.emails.lastTo("paul@example.fr");
    expect(email?.subject).toBe("Ton nouveau mot de passe");
    // Le lien pointe vers l'API, qui redirige vers l'app web avec le jeton.
    const link = new URL(linkIn(email!.text));
    const redirect = await request(server).get(link.pathname + link.search);
    const token = new URL(redirect.headers.location as string).searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await request(server)
      .post("/v1/auth/reset-password")
      .set("origin", WEB_ORIGIN)
      .send({ token, newPassword: "nouveau-motdepasse" });
    expect(reset.status).toBe(200);

    expect((await agent.get("/v1/me")).status).toBe(401);
    const signIn = await request(server)
      .post("/v1/auth/sign-in/email")
      .set("origin", WEB_ORIGIN)
      .send({ email: "paul@example.fr", password: "nouveau-motdepasse" });
    expect(signIn.status).toBe(200);
  });

  // Lot B (Greg, 15 novembre 2026) : un compte connecté change son mot de passe sans passer par « Mot de passe oublié ? ».
  it("change le mot de passe depuis le compte : l'actuel est exigé, cet appareil reste connecté, les autres sont déconnectés", async () => {
    const server = ctx.app.getHttpServer();
    const agent = await signUp(ctx.app, "lea@example.fr");
    const autre = request.agent(server);
    expect((await autre.post("/v1/auth/sign-in/email").set("origin", WEB_ORIGIN).send({ email: "lea@example.fr", password: "motdepasse-solide" })).status).toBe(200);
    // Sans session : refusé.
    expect((await request(server).post("/v1/auth/change-password").set("origin", WEB_ORIGIN).send({ currentPassword: "motdepasse-solide", newPassword: "nouveau-motdepasse" })).status).toBe(401);
    // Un mot de passe actuel faux : refusé, sans rien dire d'autre ; rien ne change.
    const faux = await agent.post("/v1/auth/change-password").set("origin", WEB_ORIGIN).send({ currentPassword: "pas-le-bon-mot", newPassword: "nouveau-motdepasse", revokeOtherSessions: true });
    expect(faux.status).toBe(400);
    expect(faux.body.code).toBe("INVALID_PASSWORD");
    expect(JSON.stringify(faux.body)).not.toMatch(/motdepasse-solide|lea@example/);
    // Trop court : refusé.
    const court = await agent.post("/v1/auth/change-password").set("origin", WEB_ORIGIN).send({ currentPassword: "motdepasse-solide", newPassword: "court" });
    expect(court.status).toBe(400);
    expect(court.body.code).toBe("PASSWORD_TOO_SHORT");
    expect((await autre.get("/v1/me")).status).toBe(200);
    // Le bon : accepté ; cet appareil reste connecté, l'autre est déconnecté, l'ancien mot de passe ne marche plus.
    const ok = await agent.post("/v1/auth/change-password").set("origin", WEB_ORIGIN).send({ currentPassword: "motdepasse-solide", newPassword: "nouveau-motdepasse", revokeOtherSessions: true });
    expect(ok.status).toBe(200);
    expect((await agent.get("/v1/me")).status).toBe(200);
    expect((await autre.get("/v1/me")).status).toBe(401);
    expect((await request(server).post("/v1/auth/sign-in/email").set("origin", WEB_ORIGIN).send({ email: "lea@example.fr", password: "motdepasse-solide" })).status).toBe(401);
    expect((await request(server).post("/v1/auth/sign-in/email").set("origin", WEB_ORIGIN).send({ email: "lea@example.fr", password: "nouveau-motdepasse" })).status).toBe(200);
    // Le compte dit par quel moyen il se connecte (pour ne pas montrer un formulaire inutile à un compte Google).
    const comptes = await agent.get("/v1/auth/list-accounts");
    expect(comptes.status).toBe(200);
    expect(comptes.body.map((c: { providerId?: string; provider?: string }) => c.providerId ?? c.provider)).toEqual(["credential"]);
  });

  it("ne révèle pas si un compte existe lors d'une demande de réinitialisation", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/v1/auth/request-password-reset")
      .set("origin", WEB_ORIGIN)
      .send({ email: "inconnu@example.fr", redirectTo: `${WEB_ORIGIN}/nouveau-mot-de-passe` });
    expect(res.status).toBe(200);
    expect(ctx.emails.sent).toHaveLength(0);
  });
});
