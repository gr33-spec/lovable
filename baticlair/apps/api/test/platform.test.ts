import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/platform/config/config.js";
import { ResendEmailSender } from "../src/platform/email/resend-email.sender.js";
import { toSupportId } from "../src/platform/logging/request-context.js";

const base = { DATABASE_URL: "postgresql://x", AUTH_SECRET: "x".repeat(32) };

describe("loadConfig", () => {
  it("applique des valeurs par défaut sûres", () => {
    const c = loadConfig(base);
    expect(c).toMatchObject({ env: "development", port: 4000, emailProvider: "console", oauth: {} });
  });

  it("refuse de démarrer sans les variables obligatoires, sans afficher de valeur", () => {
    try {
      loadConfig({ AUTH_SECRET: "trop-court" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      const message = (e as Error).message;
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("AUTH_SECRET");
      expect(message).not.toContain("trop-court");
    }
  });

  it("refuse un e-mail simulé en production", () => {
    expect(() => loadConfig({ ...base, NODE_ENV: "production", EMAIL_PROVIDER: "console" })).toThrow(/EMAIL_PROVIDER/);
  });

  it("choisit le service d'e-mail selon l'environnement", () => {
    expect(loadConfig(base).emailProvider).toBe("console");
    expect(loadConfig({ ...base, NODE_ENV: "production" }).emailProvider).toBe("disabled");
    const withKey = loadConfig({ ...base, NODE_ENV: "production", RESEND_API_KEY: "re_x", EMAIL_FROM: "BatiClair <a@b.fr>" });
    expect(withKey).toMatchObject({ emailProvider: "resend", resend: { apiKey: "re_x", from: "BatiClair <a@b.fr>" } });
  });

  it("exige un expéditeur quand une clé Resend est fournie", () => {
    expect(() => loadConfig({ ...base, RESEND_API_KEY: "re_x" })).toThrow(/EMAIL_FROM/);
  });

  it("exige identifiant et secret OAuth ensemble", () => {
    expect(() => loadConfig({ ...base, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET/);
    const c = loadConfig({ ...base, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" });
    expect(c.oauth.google).toEqual({ clientId: "id", clientSecret: "s" });
  });
});

describe("toSupportId", () => {
  it("produit un code court lisible", () => {
    expect(toSupportId("7f3k92qa-1234-5678")).toBe("7F3K-92QA");
    expect(toSupportId("ab")).toBe("AB00-0000");
  });
});

describe("ResendEmailSender", () => {
  it("envoie via l'API Resend sans exposer la clé dans les logs", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const logs: unknown[] = [];
    const logger = { error: (o: unknown) => logs.push(o) } as never;
    const sender = new ResendEmailSender("re_secret", "BatiClair <a@b.fr>", logger, fakeFetch);
    await sender.send({ to: "jean@example.fr", subject: "Sujet", text: "Corps" });
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ from: "BatiClair <a@b.fr>", to: ["jean@example.fr"], subject: "Sujet", text: "Corps" });
    expect(logs).toHaveLength(0);
  });

  it("journalise un échec sans interrompre l'inscription", async () => {
    const fakeFetch = (async () => new Response("quota", { status: 429 })) as unknown as typeof fetch;
    const logs: unknown[] = [];
    const logger = { error: (o: unknown) => logs.push(o) } as never;
    await new ResendEmailSender("re_secret", "a@b.fr", logger, fakeFetch).send({ to: "x@y.fr", subject: "S", text: "T" });
    expect(logs).toEqual([{ status: 429, subject: "S" }]);
  });
});
