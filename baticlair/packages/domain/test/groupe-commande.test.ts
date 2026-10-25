/**
 * BATICLAIR GROUPÉ, ÉTAPE 7 : BONS DE COMMANDE, FACTURE, LIVRAISON, DÉSISTEMENT (document du fondateur, 2026-10-19,
 * section 2 étape 8, section 4 c, section 6), en code pur.
 */
import { describe, expect, it } from "vitest";
import { documentBonDeCommande, documentFacture, documentRecapitulatif, excluDuGroupe, factureARelancer, factureDeCommission, livraisonARelancer, sanctionDesistement, totalDuBon, type BonDeCommande } from "../src/index.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const bon: BonDeCommande = {
  numeroLot: 12,
  artisan: { nom: "Carrelages Martin", siret: "73282932000074", telephone: "06 00 00 00 00", email: "martin@example.fr" },
  numeroCompte: null,
  adresseChantier: "3 rue des Ajoncs, 22300 Lannion",
  lignes: [{ designation: "Carreau de sol 60×60 grès cérame", quantite: "23", unite: "cartons", prixUnitaire: 18.5 }],
  fenetre: { tot: d("2026-11-10"), tard: d("2026-11-20") },
  dateLivraison: d("2026-11-10"),
  negoce: "Négoce Carrelage",
};

describe("groupé, étape 7 : le bon de commande et le récapitulatif", () => {
  it("nom, « ouverture de compte demandée » sans numéro, adresse du chantier, quantités, fenêtre, « tarif groupé lot n° … »", () => {
    expect(totalDuBon(bon.lignes)).toBe(425.5);
    const doc = documentBonDeCommande(bon);
    expect(doc.titre).toBe("Bon de commande, regroupement n° 12");
    const texte = JSON.stringify(doc);
    expect(texte).toContain("Carrelages Martin");
    expect(texte).toContain("Ouverture de compte demandée chez Négoce Carrelage");
    expect(texte).toContain("3 rue des Ajoncs, 22300 Lannion");
    expect(texte).toContain("du 10 novembre 2026 au 20 novembre 2026");
    expect(texte).toContain("Total HT : 425,50 €");
    expect(JSON.stringify(documentBonDeCommande({ ...bon, numeroCompte: "C-12" }))).toContain("Numéro de compte chez Négoce Carrelage : C-12");
    const recap = documentRecapitulatif(12, "Négoce Carrelage", [bon, { ...bon, artisan: { ...bon.artisan, nom: "Carrelages Le Bihan" } }]);
    expect(JSON.stringify(recap)).toContain("2 bons de commande, total HT du lot : 851,00 €");
  });

  it("la facture : 2 % × total HT du lot + TVA 20 %, à 30 jours, l'émetteur de la configuration ; relancée une fois après l'échéance", () => {
    expect(factureDeCommission(851, d("2026-11-10"))).toEqual({ montantHt: 17.02, montantTva: 3.4, montantTtc: 20.42, echeanceLe: d("2026-12-10") });
    const emetteur = { nom: "Société Émettrice", forme: "SARL", siret: "000 000 000 00000", adresse: "1 rue de l'Exemple, 22000 Ville", tvaIntracom: "FR00000000000" };
    const doc = documentFacture({ numero: 1, numeroLot: 12, negoce: { nom: "Négoce Carrelage", email: "carrelage@example.com" }, totalLotHt: 851, montantHt: 17.02, emiseLe: d("2026-11-10"), echeanceLe: d("2026-12-10"), versionContrat: "2026-10-20", tvaPourcent: 20 }, emetteur);
    const texte = JSON.stringify(doc);
    expect(texte).toContain("Total HT : 17,02 €");
    expect(texte).toContain("TVA 20 % : 3,40 €");
    expect(texte).toContain("Total TTC : 20,42 €");
    expect(texte).toContain("Société Émettrice, SARL");
    expect(texte).toContain("TVA intracommunautaire FR00000000000");
    expect(texte).not.toContain("projet");
    expect(texte).toContain("payable à 30 jours, soit le 10 décembre 2026");
    expect(JSON.stringify(documentFacture({ numero: 1, numeroLot: 12, negoce: { nom: "N", email: "n@example.com" }, totalLotHt: 851, montantHt: 17.02, emiseLe: d("2026-11-10"), echeanceLe: d("2026-12-10"), versionContrat: "2026-10-20", tvaPourcent: 20 }, null))).toContain("Émetteur non configuré");
    expect(factureARelancer({ statut: "envoyee", echeanceLe: d("2026-12-10"), relanceeLe: null, payeeLe: null }, d("2026-12-11"))).toBe(true);
    expect(factureARelancer({ statut: "envoyee", echeanceLe: d("2026-12-10"), relanceeLe: null, payeeLe: null }, d("2026-12-10"))).toBe(false);
    expect(factureARelancer({ statut: "envoyee", echeanceLe: d("2026-12-10"), relanceeLe: d("2026-12-11"), payeeLe: null }, d("2026-12-20"))).toBe(false);
    expect(factureARelancer({ statut: "payee", echeanceLe: d("2026-12-10"), relanceeLe: null, payeeLe: d("2026-12-01") }, d("2026-12-20"))).toBe(false);
  });

  it("la livraison se relance à J+15 ; un désistement : avertissement, puis exclusion 6 mois sur 12 mois", () => {
    expect(livraisonARelancer({ statut: "prevue", datePrevue: d("2026-11-10"), relanceLe: null }, d("2026-11-24"))).toBe(false);
    expect(livraisonARelancer({ statut: "prevue", datePrevue: d("2026-11-10"), relanceLe: null }, d("2026-11-25"))).toBe(true);
    expect(livraisonARelancer({ statut: "livre", datePrevue: d("2026-11-10"), relanceLe: null }, d("2026-12-25"))).toBe(false);
    expect(sanctionDesistement([], d("2026-11-10"))).toEqual({ sanction: "avertissement", excluJusquau: null });
    expect(sanctionDesistement([d("2025-10-01")], d("2026-11-10"))).toEqual({ sanction: "avertissement", excluJusquau: null });
    expect(sanctionDesistement([d("2026-03-01")], d("2026-11-10"))).toEqual({ sanction: "exclusion", excluJusquau: d("2027-05-10") });
    expect(excluDuGroupe([null, d("2027-05-10")], d("2026-11-11"))).toBe(true);
    expect(excluDuGroupe([d("2026-05-10")], d("2026-11-11"))).toBe(false);
  });
});
