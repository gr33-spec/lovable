import { describe, expect, it } from "vitest";
import { readQuote } from "./support/read-quote.js";

/**
 * Retour du fondateur (2026-10-10, écran des questions) : « Je dois pouvoir choisir autre chose que HP10, il existe énormément
 * de variétés de tuiles ! Quand l'application ne sait pas, elle demande et laisse de quoi écrire. » Un modèle écrit sous
 * « Autre » n'est pas au référentiel : la question se ferme, la ligne porte le nom écrit, orange « Quantité à préciser » (le
 * nombre de pièces dépend du modèle) ; « C'est bon » la laisse au fournisseur. Jamais deux lignes pour la même surface.
 */
const TOITURE = [{ ref: "1", designation: "Couverture en tuiles mécaniques terre cuite", quantity: "120", unit: "m²" }];
const read = (answers: Record<string, unknown>) => readQuote(TOITURE, answers as never, [], undefined, { acceptDraft: true });

describe("« Autre » : un modèle écrit par l'artisan", () => {
  it("la question des tuiles se ferme ; une seule ligne, au nom écrit, orange « Quantité à préciser »", () => {
    const p = read({ "product:tuile": "Tuile Romane Canal Monier" });
    expect(p.questions.filter((q) => q.question?.key === "product:tuile")).toEqual([]);
    expect(p.toQuote.map((q) => q.label)).toEqual(["Tuile Romane Canal Monier"]);
    const rows = p.screen.groups.flatMap((g) => g.rows);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("check");
    expect(p.questions.find((q) => q.key === rows[0]!.decisionKey)!.text).toMatch(/^Quantité à préciser/);
  });

  it("« C'est bon » la laisse au fournisseur : plus rien à régler", () => {
    const p = read({ "product:tuile": "Tuile Romane Canal Monier", "a-preciser:product:tuile": "ok" });
    expect(p.screen.groups.flatMap((g) => g.rows).map((r) => r.status)).toEqual(["supplier"]);
  });

  it("un modèle du référentiel choisi au bouton se calcule comme avant", () => {
    const p = read({ "product:tuile": "edilians-hp10-huguenot" });
    expect(p.toBuy.some((b) => /HP10/.test(b.label) && b.quantity)).toBe(true);
    expect(p.questions.filter((q) => q.key.startsWith("a-preciser:"))).toEqual([]);
  });

  it("aucun modèle (question close sans réponse) : une seule ligne pour la surface, jamais deux", () => {
    const p = read({ "product:tuile": null });
    expect(p.toQuote.filter((q) => q.lineIds.includes("1"))).toHaveLength(1);
  });
});
