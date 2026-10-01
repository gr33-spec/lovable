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
    // Cas de référence D-2026-015 : l'intitulé envoyé est simplifié, mais AUCUNE caractéristique ne se perd.
    const { supplierLineLabel } = await import("../src/modules/price-requests/application/price-request-email.js");
    const D2026015: [string, string[]][] = [
      [
        "Écran de sous-toiture respirant (Fourniture & Pose) - Fourniture et pose d'un écran de sous-toiture HPV (Hautement Perméable à la Vapeur) respirant, posé sur fermettes d'entraxe 90 cm (Surface : 120 m²)",
        ["respirant", "HPV"],
      ],
      ["Contre-lattage en liteaux 27x40 (Fourniture & Pose) - Fourniture et pose de contre-lattes en liteaux de section 27x40 mm pour la création de la lame d'air (Surface : 120 m²)", ["27x40", "contre-lattes"]],
      ["Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose) - Fourniture et pose de tuiles en terre cuite grand moule type HP10 de coloris rouge (Surface : 120 m²)", ["HP10", "rouge", "terre cuite", "grand moule"]],
      ["Rives de toit (Fourniture & Pose) - Fourniture et pose de tuiles de rive pour la finition des rives latérales (4 rives de 6 m)", ["tuiles de rive"]],
      ["Faîtage (Fourniture & Pose) - Fourniture et pose de faîtières ventilées avec closoir ventilé et accessoires de fixation (Longueur : 10 m)", ["faîtières ventilées", "closoir ventilé", "accessoires de fixation"]],
      [
        "Gouttière PVC de 25 sable (Fourniture & Pose) - Fourniture et pose de gouttières demi-ronde de 25 en PVC de coloris sable, crochets et naissances compris (Longueur : 2 x 10 m)",
        ["PVC", "de 25", "sable", "demi-ronde", "crochets et naissances compris"],
      ],
      [
        "Descente d'eau pluviale PVC Ø80 avec coudes (Fourniture & Pose) - Fourniture et pose d'un ensemble de descente d'eau pluviale en PVC Ø80 coloris sable, hauteur 4m, comprenant 2 jeux de coudes et les colliers de fixation par descente (2 ensembles au total)",
        ["PVC", "Ø80", "sable", "hauteur 4 m", "2 jeux de coudes", "colliers"],
      ],
      ["Chatières de ventilation (Fourniture & Pose) - Fourniture et pose de tuiles chatières de ventilation adaptées au modèle HP10 (5 de chaque côté)", ["chatières", "HP10"]],
      [
        "Sortie de toit Poujoulat (Fourniture & Pose) - Fourniture et pose d'une sortie de toit complète de marque Poujoulat avec solin d'étanchéité adapté à la tuile HP10",
        ["Poujoulat", "solin", "HP10"],
      ],
    ];
    for (const [designation, kept] of D2026015) {
      const label = supplierLineLabel(designation);
      for (const k of kept) expect(label, label).toContain(k);
      expect(label).not.toMatch(/fourniture|lame d'air/i);
    }
    expect(supplierLineLabel(D2026015[1]![0])).toBe("Contre-lattage en liteaux 27x40 (contre-lattes en liteaux de section 27x40 mm)");
    // La mention « (Fourniture & Pose) » du devis client ne part pas chez le fournisseur.
    expect(purchaseLabel("Faîtage (Fourniture & Pose)")).toBe("Faîtage");
    expect(purchaseLabel("Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose)")).toBe("Couverture en tuiles terre cuite HP10 rouge");
    expect(purchaseLabel("Tuile romane canal rouge 12,5 u/m²")).toBe("Tuile romane canal rouge 12,5 u/m²");
  });
});
