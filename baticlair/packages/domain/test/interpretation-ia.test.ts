/**
 * Greg, 6 novembre 2026 (prompt maître, points 3 et 15 ; lot 7) : l'IA rattache les réponses libres que le code n'a pas
 * comprises ; tout ce qu'elle rend est revalidé par le code ; elle n'invente jamais une valeur ; le code l'emporte.
 */
import { describe, expect, it } from "vitest";
import {
  INTERPRETATION_SYSTEM,
  PRICE_TABLES,
  computeAiCost,
  fusionnerInterpretations,
  interpretationDossier,
  interpreterReponsesNumerotees,
  jetonsEstimes,
  questionsPourIa,
  validerInterpretation,
  type QuestionNumerotee,
} from "../src/index.js";

const QUESTIONS: QuestionNumerotee[] = [
  { numero: 1, cle: "param:matiere", texte: "Ta descente, en PVC, en zinc ou en alu ?", options: [{ label: "PVC", value: "pvc" }, { label: "Zinc", value: "zinc" }, { label: "Alu", value: "alu" }], unite: null },
  { numero: 2, cle: "param:diametre", texte: "Quel diamètre ?", options: [], unite: "mm", numerique: true, libre: "number" },
  { numero: 3, cle: "fiche:teinte", texte: "Quelle teinte pour les tuiles ?", options: [], unite: null, libre: "written" },
];
const TEXTE = "pour la descente on part sur du métal gris pas le plastique, le tuyau fait 80, et les tuiles rouge vieilli";

describe("l'interprétation IA des réponses libres", () => {
  it("la consigne interdit d'inventer ; le dossier donne les questions, les boutons et la réponse", () => {
    expect(INTERPRETATION_SYSTEM).toMatch(/N'invente jamais une quantité, une dimension, une qualité, une référence ou une compatibilité/);
    const d = interpretationDossier(QUESTIONS, TEXTE);
    expect(d).toContain("1. Ta descente, en PVC, en zinc ou en alu ? Boutons (valeur = libellé) : pvc = PVC ; zinc = Zinc ; alu = Alu.");
    expect(d).toContain("2. Quel diamètre ? Valeur chiffrée en mm.");
    expect(d).toContain(TEXTE);
  });

  it("le code passe d'abord ; seules les questions qu'il n'a pas comprises vont à l'IA", () => {
    const code = interpreterReponsesNumerotees(QUESTIONS, TEXTE);
    const pourIa = questionsPourIa(QUESTIONS, code, TEXTE);
    expect(pourIa.length).toBeGreaterThan(0);
    expect(pourIa.every((q) => code.find((c) => c.numero === q.numero)!.statut !== "compris")).toBe(true);
    expect(questionsPourIa(QUESTIONS, code, " ")).toEqual([]);
  });

  it("la sortie de l'IA est revalidée : bouton connu, nombre dit, mots de l'artisan ; le reste est reposé", () => {
    const ok = validerInterpretation(QUESTIONS, TEXTE, {
      reponses: [
        { numero: 1, statut: "compris", valeur: "zinc" },
        { numero: 2, statut: "compris", valeur: "80" },
        { numero: 3, statut: "compris", valeur: "rouge vieilli" },
      ],
    });
    expect(ok.map((r) => [r.statut, r.valeur])).toEqual([
      ["compris", "zinc"],
      ["compris", "80"],
      ["compris", "rouge vieilli"],
    ]);
    const invente = validerInterpretation(QUESTIONS, TEXTE, {
      reponses: [
        { numero: 1, statut: "compris", valeur: "cuivre" },
        { numero: 2, statut: "compris", valeur: "100" },
        { numero: 3, statut: "compris", valeur: "rouge vieilli nuancé Edilians" },
        { numero: 9, statut: "compris", valeur: "zinc" },
      ],
    });
    expect(invente.map((r) => r.statut)).toEqual(["ambigu", "ambigu", "ambigu"]);
    expect(invente.every((r) => r.valeur === null)).toBe(true);
  });

  it("ce que le code a compris n'est jamais remplacé par l'IA", () => {
    const code = interpreterReponsesNumerotees(QUESTIONS, "1. zinc");
    const ia = validerInterpretation(QUESTIONS, "1. zinc", { reponses: [{ numero: 1, statut: "compris", valeur: "pvc" }] });
    expect(fusionnerInterpretations(code, ia)[0]).toMatchObject({ statut: "compris", valeur: "zinc" });
  });

  it("le coût estimé d'une interprétation, avec la grille de prix du domaine : moins d'un centime de dollar", () => {
    const j = jetonsEstimes(3, TEXTE.length);
    const c = computeAiCost("claude-haiku-4-5", j, PRICE_TABLES[0]!);
    expect(c.totalMicroUsd).toBeLessThan(10_000);
  });
});
