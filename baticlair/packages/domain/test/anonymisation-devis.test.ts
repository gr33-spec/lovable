import { describe, expect, it } from "vitest";
import { ADRESSE_RETIREE, anonymiserLigne, anonymiserLignes, CLIENT_RETIRE, EMAIL_RETIRE, TELEPHONE_RETIRE } from "../src/index.js";

/**
 * RGPD, POINT 3 (Greg, 24 octobre 2026) : un devis importé porte les coordonnées d'un particulier. Avant tout stockage
 * durable du texte et tout envoi à l'IA, BatiClair retire nom, téléphone, e-mail et rue ; seule la commune reste. Devis
 * entièrement fictif (aucune personne réelle).
 */
const DEVIS_FICTIF = [
  "TOITURES DU TRÉGOR - 4 ZA de Kerfolic, 22500 Paimpol - Tél. 02 96 20 11 22 - contact@toitures-tregor.fr",
  "DEVIS N° D-2026-999 du 12/10/2026",
  "Client : M. et Mme Kerbrat Yann",
  "Adresse : 17 bis, rue des Goélands 22300 Lannion",
  "Tél. client : 06 12 34 56 78 / +33 7 98 76 54 32",
  "E-mail : yann.kerbrat@exemple.fr",
  "Chantier : maison de Madame Le Goff, Lieu-dit Kerbras, 22300 Lannion",
  "1 Dépose de la couverture existante 85 m²",
  "2 Ardoise naturelle 32x22 Espagne 1er choix 85 m² 42,50 3 612,50",
  "3 Crochets inox 110 mm 2 boîtes",
  "4 Gouttière zinc dév. 33 - 12 ml - 2 descentes de 3 m",
  "5 Liteaux sapin traité 27x38 340 ml",
  "Total HT 6 812,40   TVA 10 % 681,24   Total TTC 7 493,64",
];

describe("retirer les données du client final, garder la commune", () => {
  const { lignes, retraits, commune } = anonymiserLignes(DEVIS_FICTIF);
  const tout = lignes.join("\n");

  it("aucun nom, téléphone, e-mail ni rue du client ne reste", () => {
    expect(tout).not.toMatch(/Kerbrat|Yann|Le Goff|Goélands|Kerbras|06 12 34 56 78|98 76 54 32|yann\.kerbrat|@exemple\.fr/);
    expect(tout).toContain(CLIENT_RETIRE);
    expect(tout).toContain(ADRESSE_RETIREE);
    expect(tout).toContain(TELEPHONE_RETIRE);
    expect(tout).toContain(EMAIL_RETIRE);
    expect(retraits).toBeGreaterThanOrEqual(7);
  });

  it("la commune du chantier reste", () => {
    expect(lignes[3]).toBe(`Adresse : ${ADRESSE_RETIREE}, 22300 Lannion`);
    expect(tout).toContain("22300 Lannion");
    expect(commune).toBe("22500 Paimpol");
  });

  it("les lignes de fournitures ne bougent pas d'un caractère", () => {
    for (const i of [7, 8, 9, 10, 11, 12]) expect(lignes[i]).toBe(DEVIS_FICTIF[i]);
  });

  it("des motifs courts restent intacts : quantités, dimensions, références, « côté rue »", () => {
    for (const l of ["Faîtage côté rue 12 ml", "Bande zinc 0,65 mm 2 x 1 m", "Velux MK04 78x98", "Rive 2 côtés 14,20 ml", "Total 1 250,00", "Descente Ø80 2 x 3 m"]) {
      expect(anonymiserLigne(l)).toEqual({ texte: l, retraits: [] });
    }
  });

  it("les variantes de civilité et d'étiquette", () => {
    expect(anonymiserLigne("Monsieur DUPONT Jean-Pierre").texte).toBe(CLIENT_RETIRE);
    expect(anonymiserLigne("À l'attention de : SCI Les Mouettes").texte).toBe(`À l'attention de : ${CLIENT_RETIRE}`);
    expect(anonymiserLigne("Maître d'ouvrage : Mme Morvan, 5 impasse du Port, 29600 Morlaix").texte).toBe(`Maître d'ouvrage : ${CLIENT_RETIRE}, 29600 Morlaix`);
    expect(anonymiserLigne("Tél : 0296201122").texte).toBe(`Tél : ${TELEPHONE_RETIRE}`);
  });
});
