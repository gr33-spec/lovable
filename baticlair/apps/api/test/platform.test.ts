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

describe("remarques de l'IA pour l'artisan", () => {
  it("écarte le jargon technique et garde ce qui sert aux achats", async () => {
    const { artisanNotes } = await import("../src/platform/ai/artisan-notes.js");
    expect(
      artisanNotes([
        "Les lignes du devis ont été lues sur le PDF (page 1) : aucune référence [page:ligne] de texte n'est disponible, sourceRefs est donc vide.",
        "Non listés : dépose de l'ancienne couverture (main-d'œuvre), cheminée fournie par le client.",
        "  ",
      ]),
    ).toEqual(["Non listés : dépose de l'ancienne couverture (main-d'œuvre), cheminée fournie par le client."]);
  });
});

describe("textes pour l'artisan et le fournisseur", () => {
  it("écarte les remarques sur la façon dont l'IA a lu le devis", async () => {
    const { artisanNotes } = await import("../src/platform/ai/artisan-notes.js");
    expect(
      artisanNotes([
        "Les pages du devis ont été lues en image : aucune ligne de texte numérotée n'était disponible, donc les références de ligne sont vides.",
        "Le client fournit la cheminée.",
      ]),
    ).toEqual(["Le client fournit la cheminée."]);
  });

  it("retire « Fourniture » des lignes envoyées au fournisseur, sans perdre le détail", async () => {
    const { purchaseLabel } = await import("../src/modules/price-requests/application/price-request-email.js");
    expect(purchaseLabel("Fourniture isolation murs 100mm - Fourniture de laine de verre")).toBe("Isolation murs 100mm - laine de verre");
    expect(purchaseLabel("Fourniture et pose descente zinc diamètre 80")).toBe("Descente zinc diamètre 80");
    // Surface d'ouvrage : jamais présentée au fournisseur comme une quantité d'achat.
    const { requestedQuantityText } = await import("../src/modules/price-requests/application/price-request-email.js");
    const line = { designation: "Liteaux 27x40", quantity: "120", unit: "m²", reference: null };
    expect(requestedQuantityText(line)).toBe("120 m²");
    expect(requestedQuantityText({ ...line, basis: "work" })).toBe("pour une surface de 120 m² (quantité à calculer)");
    // Cas de référence D-2026-015 : « Rives 24 m », « Faîtage 10 m » sont des longueurs d'ouvrage.
    expect(requestedQuantityText({ designation: "Rives de toit", quantity: "24", unit: "m", reference: null, basis: "work" })).toBe(
      "pour une longueur de 24 m (quantité à calculer)",
    );
    // La mention « (Fourniture & Pose) » du devis client ne part pas chez le fournisseur.
    expect(purchaseLabel("Faîtage (Fourniture & Pose)")).toBe("Faîtage");
    expect(purchaseLabel("Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose)")).toBe("Couverture en tuiles terre cuite HP10 rouge");
    expect(purchaseLabel("Tuile romane canal rouge 12,5 u/m²")).toBe("Tuile romane canal rouge 12,5 u/m²");
  });
});
