import { describe, expect, it } from "vitest";
import { briefResume, briefTexte, ficheCorrigee, type FicheChantier, type SiteBrief } from "../src/index.js";

/**
 * §50.7, retour du fondateur (2026-10-11, capture iPhone) : « Le chantier en bref doit être un texte résumé en un seul
 * bloc, un joli texte descriptif ; là ça prend trop de place. Le nom du client et l'adresse doivent être optionnels : un
 * négoce n'a pas à savoir ça pour chiffrer. »
 */
const FICHE: FicheChantier = {
  donnees: [
    { cle: "client", libelle: "Client", valeur: "SCI DU TREGOR", origine: "devis" },
    { cle: "adresse", libelle: "Adresse", valeur: "30/32 rue de Goas An Abat, 22700 PERROS GUIRREC", origine: "devis" },
    { cle: "code_postal", libelle: "Code postal", valeur: "22700", origine: "devis" },
    { cle: "littoral", libelle: "Littoral", valeur: "oui", origine: "deduite" },
    { cle: "ouvrage", libelle: "Ouvrage", valeur: "couverture en tuiles canal", origine: "devis" },
    { cle: "materiau", libelle: "Matériau", valeur: "tuiles canal couleur sablée, liteaunage bois traité", origine: "devis" },
    { cle: "surface", libelle: "Surface", valeur: "100 m²", origine: "devis" },
    { cle: "depose", libelle: "Dépose", valeur: "oui, ancienne couverture tuiles canal 100 m²", origine: "devis" },
    { cle: "renovation", libelle: "Rénovation", valeur: "oui", origine: "devis" },
    { cle: "nombre_de_rives", libelle: "Nombre de rives", valeur: "4", origine: "devis" },
    { cle: "longueur_de_rive", libelle: "Longueur de rive", valeur: "5 m", origine: "devis" },
    { cle: "rampant", libelle: "Rampant", valeur: "5 m", origine: "devis" },
  ],
} as FicheChantier;
const BRIEF: SiteBrief = { ouvrage: "couverture en tuiles canal", faits: [], complements: [], ville: "Perros-Guirec", situation: "bord de mer" };

describe("le chantier en bref, un seul texte", () => {
  it("un paragraphe descriptif, sans le client ni l'adresse par défaut", () => {
    const texte = briefTexte(briefResume(BRIEF, null, {}, FICHE));
    expect(texte).toBe(
      "Couverture en tuiles canal, 100 m². Tuiles canal couleur sablée, liteaunage bois traité. Dépose : ancienne couverture tuiles canal 100 m², rénovation, 4 rives, longueur de rive 5 m, rampant 5 m. Chantier à Perros-Guirec, bord de mer.",
    );
    expect(texte).not.toMatch(/SCI|Goas|22700|Littoral/);
  });

  it("le client et l'adresse s'ajoutent sur demande de l'artisan (« bref:avec-client »)", () => {
    const texte = briefTexte(briefResume(BRIEF, null, { "bref:avec-client": "oui" }, FICHE));
    expect(texte).toMatch(/ Client : SCI DU TREGOR, adresse : 30\/32 rue de Goas An Abat, 22700 PERROS GUIRREC\.$/);
  });

  it("une ligne corrigée ou retirée sur le document l'est dans le texte", () => {
    const answers = { "bref:fiche-rampant": "Rampant : 6,5 m", "bref:fiche-renovation": "" };
    const texte = briefTexte(briefResume(BRIEF, null, answers, ficheCorrigee(FICHE, answers)));
    expect(texte).toMatch(/rampant 6,5 m/);
    expect(texte).not.toMatch(/rénovation/);
  });
});
