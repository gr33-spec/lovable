import { describe, expect, it } from "vitest";
import { motifAnthropic } from "../src/platform/ai/anthropic-document-reader.js";

// Recette en ligne du 25 octobre 2026 : toutes les lectures échouaient en « http_400 » sans la cause. Le motif d'Anthropic suit
// désormais le code dans le journal des appels (type et message, jamais la clé).
describe("motif d'une erreur d'Anthropic", () => {
  it("dit le type et le message", () => {
    const erreur = { error: { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } } };
    expect(`http_400${motifAnthropic(erreur)}`).toBe("http_400: invalid_request_error, Your credit balance is too low to access the Anthropic API.");
  });
  it("ne dit rien quand Anthropic n'a rien rendu de lisible", () => {
    expect(motifAnthropic({})).toBe("");
    expect(motifAnthropic({ error: "texte" })).toBe("");
  });
  it("reste court", () => {
    expect(motifAnthropic({ error: { error: { type: "x", message: "m".repeat(500) } } }).length).toBeLessThanOrEqual(162);
  });
});
