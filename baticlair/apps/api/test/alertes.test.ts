import { HttpException, type ArgumentsHost } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ALERT_QUIET_MS, ChannelAlerter, type AlertKind } from "../src/platform/alerts/alerter.js";
import { ErrorFilter } from "../src/platform/http/error.filter.js";
import type { AppLogger } from "../src/platform/logging/logger.js";
import { lieuDesAlertes } from "../src/platform/email/email.module.js";

/** AUDIT DE LANCEMENT, B5 : une panne en production prévient l'équipe, sans noyer sa messagerie. */
const logger = { warn: () => {}, error: () => {}, info: () => {} } as unknown as AppLogger;

function alerter(channels: { webhookUrl?: string; email?: string }) {
  const posts: { url: string; body: unknown }[] = [];
  const mails: { to: string; subject: string }[] = [];
  let now = 0;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    posts.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;
  const a = new ChannelAlerter({ ...channels, env: "production" }, { send: async (m) => void mails.push(m) }, logger, fetchImpl, () => now);
  return { a, posts, mails, tick: (ms: number) => (now += ms) };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("alertes de production", () => {
  it("sans canal configuré : rien ne part, et la santé le dit", () => {
    const { a, posts } = alerter({});
    expect(a.enabled).toBe(false);
    a.alert("server_error", "x");
    expect(posts).toHaveLength(0);
  });

  it("webhook (Slack, Discord, ntfy) et e-mail : le même message, lisible", async () => {
    const { a, posts, mails } = alerter({ webhookUrl: "https://hooks.example/x", email: "alerte@example.fr" });
    a.alert("ai_reading_failed", "raison : timeout.");
    await flush();
    expect(posts).toEqual([{ url: "https://hooks.example/x", body: { text: "Mobiiz (production) — Lecture de devis échouée : raison : timeout.", content: "Mobiiz (production) — Lecture de devis échouée : raison : timeout." } }]);
    expect(mails[0]).toMatchObject({ to: "alerte@example.fr" });
  });

  it("une panne qui dure : une alerte par sorte toutes les 10 minutes, avec le nombre d'erreurs tues", async () => {
    const { a, posts, tick } = alerter({ webhookUrl: "https://hooks.example/x" });
    for (let i = 0; i < 5; i++) a.alert("server_error", "internal_error");
    a.alert("ai_reading_failed", "raison : timeout.");
    await flush();
    expect(posts.map((p) => (p.body as { text: string }).text.split(" — ")[1]!.split(" :")[0])).toEqual(["Erreur serveur", "Lecture de devis échouée"]);
    tick(ALERT_QUIET_MS + 1);
    a.alert("server_error", "internal_error");
    await flush();
    expect((posts[2]!.body as { text: string }).text).toMatch(/\(\+4 autres depuis la dernière alerte\)$/);
  });

  it("une erreur 500 de l'API déclenche l'alerte, une erreur 400 non", () => {
    const sent: { kind: AlertKind; message: string }[] = [];
    const filter = new ErrorFilter(logger, { enabled: true, alert: (kind, message) => sent.push({ kind, message }) });
    const host = (method: string) =>
      ({
        switchToHttp: () => ({
          getResponse: () => ({ status: () => ({ json: () => {} }) }),
          getRequest: () => ({ method, route: { path: "/v1/projects/:id" } }),
        }),
      }) as unknown as ArgumentsHost;
    filter.catch(new HttpException("bad", 400), host("POST"));
    expect(sent).toHaveLength(0);
    filter.catch(new Error("boom"), host("GET"));
    expect(sent).toEqual([{ kind: "server_error", message: expect.stringMatching(/^internal_error sur GET \/v1\/projects\/:id \(code support [A-Z0-9-]+\)\.$/) }]);
  });
});

describe("l'e-mail d'une alerte (Greg, 28 novembre 2026 : un essai arrivé dans les indésirables)", () => {
  it("objet court : le lieu et la sorte d'alerte, jamais le message coupé ; le message entier dans le corps", async () => {
    const mails: { to: string; subject: string; text: string }[] = [];
    const a = new ChannelAlerter({ email: "alerte@example.fr", env: lieuDesAlertes("production", "preview") }, { send: async (m) => void mails.push(m) }, logger);
    const long = "la sauvegarde de cette nuit a échoué à l'étape « Test de restauration ». ".repeat(3);
    a.alert("sauvegarde_echec", long);
    await new Promise((r) => setTimeout(r, 10));
    expect(mails[0]!.subject).toBe("Mobiiz (site de test) · Sauvegarde échouée");
    expect(mails[0]!.text).toContain(long.trim());
    expect(lieuDesAlertes("production", "production")).toBe("production");
  });
});
