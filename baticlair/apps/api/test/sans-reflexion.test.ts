import { describe, expect, it } from "vitest";
import { sansReflexion } from "../src/platform/ai/anthropic-document-reader.js";

/**
 * Greg, 17 novembre 2026 : « Lecture du devis : 24 secondes, c'est trop long. Mesure où part le temps. » Mesure : le temps
 * est celui des mots que le modèle écrit, réflexion comprise. Le réglage `AI_EXTRACTION_REFLEXION=minimale` demande au
 * modèle d'écrire sans réfléchir d'abord, seulement là où la documentation du fournisseur le permet.
 */
describe("écrire sans réfléchir d'abord : seulement les modèles et les efforts qui l'acceptent", () => {
  it("Haiku 5.5 : la réflexion se coupe jusqu'à l'effort « high »", () => {
    for (const effort of ["low", "medium", "high"] as const) expect(sansReflexion("claude-haiku-5-5", effort)).toEqual({ thinking: { type: "disabled" } });
  });
  it("Sonnet 5.5 : la réponse sans réflexion préalable (« between_tools »), jamais « disabled »", () => {
    for (const effort of ["low", "medium", "high"] as const) expect(sansReflexion("claude-sonnet-5-5", effort)).toEqual({ thinking: { type: "between_tools" } });
  });
  it("aux efforts « xhigh » et « max », et sur les autres modèles, rien n'est envoyé (ils le refuseraient)", () => {
    expect(sansReflexion("claude-haiku-5-5", "xhigh")).toEqual({});
    expect(sansReflexion("claude-sonnet-5-5", "max")).toEqual({});
    expect(sansReflexion("claude-opus-5-5", "medium")).toEqual({});
    expect(sansReflexion("claude-haiku-4-5", "low")).toEqual({});
  });
});
