import { describe, expect, it } from "vitest";
import { BLOCS_METIER, INTERPRETATION_PROMPT, INTERPRETATION_SYSTEM, PROMPT_REPONSES_SYSTEME, SOCLE_INTERDITS } from "../src/index.js";

/**
 * LES PROMPTS VERSIONNÉS (Greg, 16 novembre 2026 : « un socle commun plus un bloc par métier (couverture et zinguerie
 * d'abord, puis peinture) avec le vocabulaire du métier […] Des exemples réels dans le prompt, dont des réponses très
 * brèves. Tutoiement, phrases courtes, zéro jargon »).
 */
describe("les prompts : un socle commun et un bloc par métier", () => {
  it("couverture et zinguerie d'abord, puis peinture ; chacun a son vocabulaire et ses exemples réels", () => {
    expect(BLOCS_METIER.map((b) => b.metier)).toEqual(["couverture", "zinguerie", "peinture"]);
    for (const b of BLOCS_METIER) {
      expect(b.vocabulaire.length, b.metier).toBeGreaterThanOrEqual(5);
      expect(b.exemples.length, b.metier).toBeGreaterThanOrEqual(2);
      // Un exemple dit, pour chaque question, ce qu'il fallait comprendre.
      for (const e of b.exemples) expect(e.compris.length, `${b.metier} : ${e.reponse}`).toBe(e.questions.length);
    }
  });

  it("le prompt des réponses porte le socle, les interdits, les mots du chantier et le cas de Greg", () => {
    expect(INTERPRETATION_SYSTEM).toBe(PROMPT_REPONSES_SYSTEME);
    expect(INTERPRETATION_PROMPT).toEqual({ id: "interpretation_reponses", version: 3 });
    expect(PROMPT_REPONSES_SYSTEME).toContain(SOCLE_INTERDITS);
    for (const mot of ["dév. 33", "32×22", "joint debout", "façonné", "je pli", "tout fait", "bord de mer", "mat profond"]) expect(PROMPT_REPONSES_SYSTEME, mot).toContain(mot);
    expect(PROMPT_REPONSES_SYSTEME).toContain("« J'achète tout fait, 0,65, 1, chevron, ou je pli, bord de mer »");
    // Par le sens, puis par l'ordre ; un doute se redemande.
    expect(PROMPT_REPONSES_SYSTEME).toMatch(/D'abord par le sens/);
    expect(PROMPT_REPONSES_SYSTEME).toMatch(/Puis par l'ordre/);
    expect(PROMPT_REPONSES_SYSTEME).toMatch(/Un doute entre deux choix : « ambigu »/);
  });

  it("le même texte pour tous les appels (mis en cache), sans date ni donnée d'un artisan", () => {
    expect(PROMPT_REPONSES_SYSTEME).not.toMatch(/\d{4}-\d{2}-\d{2}|@|https?:/);
    expect(PROMPT_REPONSES_SYSTEME.length).toBeLessThan(9000);
  });
});
