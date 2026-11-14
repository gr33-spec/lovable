import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";

/**
 * DÉCISION DE GREG (25 octobre 2026) : « aucun test automatique ne doit appeler l'API réelle, jamais ». Les 20 $ de la clé
 * sont partis le 24 octobre dans 8 passages du workflow « Vraie lecture (Opus) », lancé à chaque pose de l'étiquette. Seule
 * la recette manuelle que Greg lance lui-même consomme.
 */
const racine = path.resolve(import.meta.dirname, "../../../..");
const lire = (f: string) => readFileSync(path.join(racine, f), "utf8");

describe("aucun test automatique n'appelle l'API Anthropic réelle", () => {
  it("la vraie lecture ne part qu'à la main (workflow_dispatch), jamais sur une étiquette, un push ou une PR", () => {
    const wf = lire(".github/workflows/lecture-reelle.yml");
    const declencheurs = /^on:\n((?:\s{2}.*\n)+)/m.exec(wf)?.[1] ?? "";
    expect(declencheurs.trim()).toBe("workflow_dispatch:");
  });

  it("aucun autre workflow ne reçoit une clé Anthropic", () => {
    for (const f of ["ci.yml", "patrimoine.yml"]) expect(lire(`.github/workflows/${f}`)).not.toMatch(/ANTHROPIC/);
  });

  it("les tests tournent sans clé et avec les lectures enregistrées", () => {
    expect(process.env.BATICLAIR_ANTHROPIC_KEY).toBeUndefined();
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(loadConfig(process.env).ai.provider).toBe("fake");
    expect(lire("baticlair/apps/web/playwright.config.ts")).toMatch(/AI_PROVIDER: "fake"/);
    expect(lire("baticlair/apps/web/playwright.config.ts")).toMatch(/delete process\.env\.BATICLAIR_ANTHROPIC_KEY/);
  });

  it("un appel réseau vers Anthropic échoue tout de suite en test", async () => {
    await expect(fetch("https://api.anthropic.com/v1/messages", { method: "POST" })).rejects.toThrow(/refusé en test/);
  });
});
