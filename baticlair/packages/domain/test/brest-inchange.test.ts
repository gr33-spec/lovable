import { expect, it } from "vitest";
import { brestTable } from "./support/brest.js";

/**
 * LE TABLEAU DE BREST INCHANGÉ (lot B, compte rendu de chaque paquet) : brancher un métier ne touche jamais au couvreur.
 * Le chantier de Brest, à l'ouverture puis répondu, doit rester celui d'avant le lot B, mot pour mot.
 */
it("Brest : le tableau d'avant le lot B, mot pour mot", async () => {
  await expect(brestTable()).toMatchFileSnapshot("./__snapshots__/brest-tableau.md");
});
