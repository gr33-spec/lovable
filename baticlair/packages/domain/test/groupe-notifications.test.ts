/**
 * BATICLAIR GROUPÉ, ÉTAPE 8 : LES NOTIFICATIONS (document du fondateur, 2026-10-19, section 3), en code pur : les quatre
 * messages mot pour mot, le nom du département, l'avertissement après un désistement, l'adresse de réponse d'un lot.
 */
import { describe, expect, it } from "vitest";
import { adresseDeReponse, messageBesoinAccepte, messageDemandeEnvoyee, messageDesistement, messageLivraisonDuJour, messageNegoceRetenu, nomDuDepartement, numeroDuLotDansAdresse } from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("groupé, étape 8 : les quatre messages de la section 3", () => {
  it("les textes, mot pour mot, sans nom d'artisan", () => {
    expect(nomDuDepartement("22")).toBe("Côtes-d'Armor");
    expect(nomDuDepartement("2A")).toBe("Corse-du-Sud");
    expect(nomDuDepartement("99")).toBe("département 99");
    expect(messageBesoinAccepte({ quantite: "31", unite: "bacs", zone: "22", projectId: "p" }).corps).toBe("Vos 31 bacs sont dans le groupé Côtes-d'Armor. Prochain lot lundi.");
    expect(messageDemandeEnvoyee({ numero: 12, negoces: 4 }).corps).toBe("Le groupé est parti chez 4 négoces. Réponses attendues sous 7 jours.");
    expect(messageDemandeEnvoyee({ numero: 12, negoces: 1 }).corps).toBe("Le groupé est parti chez 1 négoce. Réponses attendues sous 7 jours.");
    expect(messageNegoceRetenu({ quantite: "31", unite: "bacs", prixUnitaire: 18.5, prixReference: 21, negoce: "A", dateLivraison: d("2026-11-03"), numero: 12 }).corps).toBe("Vos 31 bacs : 18,50 € chez A (−12 %). Bon de commande transmis, livraison le 3 nov.");
    expect(messageNegoceRetenu({ quantite: "31", unite: "bacs", prixUnitaire: 18.5, prixReference: null, negoce: "A", dateLivraison: null, numero: 12 }).corps).toBe("Vos 31 bacs : 18,50 € chez A. Bon de commande transmis.");
    expect(messageLivraisonDuJour({ numero: 12 }).corps).toBe("Livraison aujourd'hui. Tout est arrivé ?");
    // Une étiquette par lot : une seule notification à la fois.
    expect(messageDemandeEnvoyee({ numero: 12, negoces: 2 }).etiquette).toBe("groupe-lot-12");
  });

  it("l'avertissement après un désistement, puis l'exclusion ; l'adresse de réponse du lot", () => {
    expect(messageDesistement({ sanction: "avertissement", excluJusquau: null }).objet).toContain("avertissement");
    expect(messageDesistement({ sanction: "exclusion", excluJusquau: d("2027-05-10") }).texte).toContain("jusqu'au 10 mai 2027");
    expect(adresseDeReponse(12, "reponses.baticlair.fr")).toBe("lot-12@reponses.baticlair.fr");
    expect(numeroDuLotDansAdresse(["Regroupement <lot-12@reponses.baticlair.fr>"], "reponses.baticlair.fr")).toBe(12);
    expect(numeroDuLotDansAdresse(["lot-12@autre.fr"], "reponses.baticlair.fr")).toBeNull();
    expect(numeroDuLotDansAdresse(["contact@example.com"], "reponses.baticlair.fr")).toBeNull();
  });
});
