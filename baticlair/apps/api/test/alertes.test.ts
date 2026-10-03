import { HttpException, type ArgumentsHost } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ALERT_QUIET_MS, ChannelAlerter, type AlertKind } from "../src/platform/alerts/alerter.js";
import { ErrorFilter } from "../src/platform/http/error.filter.js";
import type { AppLogger } from "../src/platform/logging/logger.js";

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
    expect(posts).toEqual([{ url: "https://hooks.example/x", body: { text: "BatiClair (production) — Lecture de devis échouée : raison : timeout.", content: "BatiClair (production) — Lecture de devis échouée : raison : timeout." } }]);
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
