import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/platform/config/config.js";
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
    expect(() => loadConfig({ ...base, NODE_ENV: "production" })).toThrow(/EMAIL_PROVIDER/);
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
