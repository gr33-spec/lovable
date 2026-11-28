import { describe, expect, it } from "vitest";
import { CHAMPS_PUBLIES, instantaneLu, memeInstantane, modeleDe, MODELES_SITE, PALETTES_SITE, COULEURS_BOUTONS, TEINTES, publicationPermise, refusAdresse, texteSurCouleur } from "../src/page-entreprise/index.js";

/** Le socle des sites (Greg, 27 novembre 2026, cahier 03) : modèles, palettes, brouillon et publié, droit de publier, adresses. */
describe("sites des artisans : le socle", () => {
  it("deux modèles ; un modèle inconnu ou retiré retombe sur le premier (jamais une page sans habillage)", () => {
    expect(MODELES_SITE.map((m) => m.id)).toEqual(["atelier", "sobre"]);
    expect(modeleDe("sobre").id).toBe("sobre");
    expect(modeleDe("inconnu").id).toBe("atelier");
    expect(modeleDe(null).id).toBe("atelier");
  });

  it("chaque palette n'utilise que des teintes et des couleurs de boutons déjà proposées, et son texte de bouton se lit", () => {
    for (const p of PALETTES_SITE) {
      expect(TEINTES.some((t) => t.hex === p.teinte), p.id).toBe(true);
      expect(COULEURS_BOUTONS.some((c) => c.hex === p.boutons), p.id).toBe(true);
      expect(["#FFFFFF", "#15120E", "#fff", "#000", "#ffffff", "#000000"].map((x) => x.toLowerCase())).toContain(texteSurCouleur(p.boutons).toLowerCase());
    }
    // Le jaune Mobiiz n'est qu'une palette parmi d'autres.
    expect(PALETTES_SITE.filter((p) => p.boutons === "#FED206")).toHaveLength(1);
  });

  it("instantané : un format inconnu vaut « rien de publié » ; deux instantanés pareils ne demandent pas de publication", () => {
    expect(instantaneLu(null)).toBeNull();
    expect(instantaneLu({ version: 2, champs: {}, photos: [], realisations: [] })).toBeNull();
    const a = instantaneLu({ version: 1, champs: { accroche: "x" }, photos: ["p1"], realisations: [{ id: "r1", titre: "T" }] })!;
    expect(memeInstantane(a, { ...a })).toBe(true);
    expect(memeInstantane(a, { ...a, champs: { accroche: "y" } })).toBe(false);
    expect(memeInstantane(a, { ...a, photos: ["p1", "p2"] })).toBe(false);
    // Tous les réglages de l'éditeur sont publiés, même ceux qu'un modèle n'affiche pas.
    expect(CHAMPS_PUBLIES).toEqual(expect.arrayContaining(["modele", "couleur", "couleurBoutons", "horaires", "certifications", "afficherAdresse", "couvertureId"]));
  });

  it("droit de publier : coupé = tout le monde ; allumé = abonnement en cours seulement", () => {
    const maintenant = new Date("2026-11-27T12:00:00Z");
    expect(publicationPermise(false, null, maintenant)).toBe(true);
    expect(publicationPermise(true, null, maintenant)).toBe(false);
    expect(publicationPermise(true, { statut: "actif", periodeFin: new Date("2026-12-27") }, maintenant)).toBe(true);
    expect(publicationPermise(true, { statut: "resilie", periodeFin: new Date("2026-12-01") }, maintenant)).toBe(true);
    expect(publicationPermise(true, { statut: "resilie", periodeFin: new Date("2026-11-01") }, maintenant)).toBe(false);
    expect(publicationPermise(true, { statut: "echec", periodeFin: new Date("2026-12-27") }, maintenant)).toBe(false);
  });

  it("adresses réservées : messagerie, technique et marque", () => {
    for (const a of ["mail", "smtp", "www", "api", "api-test", "static", "cdn", "mobiiz", "admin", "mon-site", "staging"]) expect(refusAdresse(a), a).toBe("Cette adresse est réservée.");
    expect(refusAdresse("toits-martin")).toBeNull();
  });
});
