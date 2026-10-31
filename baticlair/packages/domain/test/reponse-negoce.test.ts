import { describe, expect, it } from "vitest";
import { dateHeureCourte, premiereLigneDuMessage } from "../src/index.js";

/** Greg, 28 octobre 2026, point 8 (capture « Re: [TEST → materiaux@… », texte cité, nom de fichier). */
describe("la carte de réponse d'un négoce", () => {
  it("la première ligne du message, sans le texte cité ni une salutation seule", () => {
    expect(premiereLigneDuMessage("Bonjour voici le devis\n\n\n\nLe 28 oct. 2026 à 08:31, Bati invest via Mobiiz <x@mobiiz.fr> a écrit :\n> Bonjour,")).toBe("Bonjour voici le devis");
    expect(premiereLigneDuMessage("Bonjour,\n\nCi-joint notre offre, livraison sous 8 jours.\nCordialement")).toBe("Ci-joint notre offre, livraison sous 8 jours.");
    expect(premiereLigneDuMessage("> cité seulement")).toBeNull();
    expect(premiereLigneDuMessage("")).toBeNull();
    expect(premiereLigneDuMessage("-----Message d'origine-----\nDe : moi")).toBeNull();
    expect(premiereLigneDuMessage("x".repeat(200))!.length).toBe(140);
  });
  it("la date courte : « 28 oct. à 8 h 31 »", () => {
    expect(dateHeureCourte(new Date("2026-10-28T07:31:00Z"))).toBe("28 oct. à 8 h 31");
    expect(dateHeureCourte(new Date("2026-11-02T13:05:00Z"))).toBe("2 nov. à 14 h 05");
  });
});
