import { describe, expect, it } from "vitest";
import { estAdresseGenerique } from "../src/groupe/contact-negoce.js";

/** Greg, lot final, point 2 : l'adresse générale d'un négoce se signale, celle d'un commercial passe. */
describe("l'e-mail du commercial", () => {
  it("reconnaît les adresses générales", () => {
    for (const e of ["contact@negoce.fr", "Accueil@negoce.fr", "info@x.fr", "commercial@x.fr", "info.lannion@x.fr", "devis-22@x.fr", "ventes@x.fr"]) expect(estAdresseGenerique(e), e).toBe(true);
  });
  it("laisse passer celle d'une personne", () => {
    for (const e of ["paul.le-goff@negoce.fr", "pleguen@x.fr", "jean@x.fr", "contactless@x.fr"]) expect(estAdresseGenerique(e), e).toBe(false);
  });
});
