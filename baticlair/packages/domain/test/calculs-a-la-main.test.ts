import { describe, expect, it } from "vitest";
import {
  choisirLeNegoce,
  distanceRouteKm,
  documentBonDeCommande,
  economieEstimee,
  factureDeCommission,
  fraisDeLivraison,
  messageNouveauDevis,
  phraseCompteur,
  prixAuVolume,
  prixLivre,
  sanctionDesistement,
  suiviDuChantier,
  type ReponseAChoisir,
} from "../src/index.js";

/**
 * PLAN « FINITION » (Greg, 22 octobre), bloc 2 : « vérifie chaque calcul à la main sur trois cas (montants, distances,
 * paliers, compteurs) ». Les chiffres attendus ci-dessous ont été posés à la main (détail dans
 * `docs/groupe/TEST-COMPLET.md`, « Trois cas vérifiés à la main ») ; ce test les garde : si le code change un résultat,
 * la doc et le code ne peuvent plus diverger sans que la CI le dise.
 */
const jour = (s: string) => new Date(`${s}T08:00:00Z`);
const fenetre = { tot: jour("2026-11-02"), tard: jour("2026-11-20") };
const reponse = (negoceId: string, prix: [string | null, string][], livraisonHt: number, delaiJours = 5): ReponseAChoisir => ({
  negoceId,
  statutExtraction: "lue",
  prix: prix.map(([palier, pu]) => ({ palier, prixUnitaire: pu, totalHt: null })),
  delaiJours,
  deposeLe: jour("2026-10-26"),
  pasConcerneLe: null,
  livraisonHt,
});

describe("cas 1 : l'ardoise de la démo, Ploubazlanec (paliers, distance, prix livré, économie, commission)", () => {
  it("palier de 8 000 pour 8 200 pièces : 0,92 € ; Guingamp → Ploubazlanec 37 km, au-delà de 30 : 45 € ; prix livré 2 584,20 € ; économie 286,20 €", () => {
    // Paliers du négoce : dès 5 000 à 0,95 ; dès 8 000 à 0,92 ; dès 10 000 à 0,89. Volume ferme du lot : 8 200.
    expect(prixAuVolume([{ palier: "5000", prixUnitaire: "0,95", totalHt: null }, { palier: "8000", prixUnitaire: "0,92", totalHt: null }, { palier: "10000", prixUnitaire: "0,89", totalHt: null }], 8200)).toBe(0.92);
    // Guingamp (48,56 ; −3,15) → Ploubazlanec (48,80 ; −3,03) : 28,10 km à vol d'oiseau × 1,3 = 36,53 → 37 km.
    const km = distanceRouteKm({ lat: 48.56, lon: -3.15 }, { lat: 48.8, lon: -3.03 });
    expect(km).toBe(37);
    const livraison = fraisDeLivraison(km, { francoKm: 30, prixAuDela: 45 });
    expect(livraison).toBe(45);
    // 2 760 × 0,92 = 2 539,20 ; + 45 = 2 584,20. Habituel : 2 760 × 1,04 = 2 870,40. Économie : 2 870,40 − 2 584,20 = 286,20.
    expect(prixLivre({ quantite: 2760, prixUnitaire: 0.92, livraisonZone: livraison, prixHabituel: 1.04 })).toEqual({ totalHt: 2584.2, livraisonHt: 45, habituelHt: 2870.4, economieHt: 286.2 });
    // La carte « Mon offre » affiche la même économie (livraison comprise).
    expect(economieEstimee(1.04, 0.92, 2760, 45)).toBe(286.2);
    // Commission (si elle s'applique) : 2 % de 8 200 × 0,92 = 7 544,00 → 150,88 HT ; TVA 20 % 30,18 ; TTC 181,06.
    const f = factureDeCommission(7544, jour("2026-11-10"));
    expect([f.montantHt, f.montantTva, f.montantTtc]).toEqual([150.88, 30.18, 181.06]);
  });

  it("le bon de commande dit la livraison promise et le total livraison comprise", () => {
    const doc = documentBonDeCommande({
      numeroLot: 12,
      artisan: { nom: "Toitures Le Goff", siret: null, telephone: null, email: null },
      numeroCompte: "C-4512",
      adresseChantier: "6 rue du Port, 22620 Ploubazlanec",
      lignes: [{ designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "2760", unite: "pièces", prixUnitaire: 0.92 }],
      fenetre,
      dateLivraison: jour("2026-11-03"),
      negoce: "Négoce Exemple",
      livraison: { prixHt: 45, distanceKm: 37, francoKm: 30 },
    });
    const texte = JSON.stringify(doc.blocs).replace(/[\u202f\u00a0]/g, " "); // espaces fines des milliers
    expect(texte).toContain("Livraison : 45,00 € HT (37 km du dépôt, au-delà de 30 km)");
    expect(texte).toContain("Total HT : 2 539,20 €");
    expect(texte).toContain("Total HT livraison comprise : 2 584,20 €");
  });
});

describe("cas 2 : le moins cher LIVRAISON COMPRISE l'emporte, même avec un prix unitaire plus haut", () => {
  it("500 m² ; A 20,00 € et 120 € de livraisons (10 120 €) ; B 20,10 € et 30 € (10 080 €) : B retenu", () => {
    // Trois chantiers à 10 km, 40 km et une adresse introuvable (comptée au-delà).
    const distances = [10, 40, null];
    const livraisonsA = distances.reduce<number>((s, d) => s + fraisDeLivraison(d, { francoKm: 30, prixAuDela: 60 }), 0);
    const livraisonsB = distances.reduce<number>((s, d) => s + fraisDeLivraison(d, { francoKm: 50, prixAuDela: 30 }), 0);
    expect([livraisonsA, livraisonsB]).toEqual([120, 30]);
    // A : 500 × 20,00 + 120 = 10 120 ; B : 500 × 20,10 + 30 = 10 080.
    const choix = choisirLeNegoce({ volumeFerme: 500, fenetre }, [reponse("A", [[null, "20,00"]], livraisonsA), reponse("B", [[null, "20,10"]], livraisonsB)]);
    expect(choix.retenu).toMatchObject({ negoceId: "B", prixUnitaire: 20.1 });
    expect(choix.ecartes).toEqual([{ negoceId: "A", raison: "plus_cher" }]);
  });
});

describe("cas 3 : Paimpol → Lannion (palier insuffisant, franco, alertes, compteur, suivi, désistement)", () => {
  it("600 pièces : le négoce qui ne chiffre que dès 1 000 est écarté ; le prix sans palier est retenu ; 40 km gratuits sous 50 km", () => {
    const choix = choisirLeNegoce({ volumeFerme: 600, fenetre }, [reponse("C", [["1000", "0,95"]], 0), reponse("D", [[null, "1,02"]], 0)]);
    expect(choix.retenu).toMatchObject({ negoceId: "D", prixUnitaire: 1.02 });
    expect(choix.ecartes).toEqual([{ negoceId: "C", raison: "palier_insuffisant" }]);
    // Paimpol (48,78 ; −3,05) → Lannion (48,73 ; −3,46) : 30,57 km × 1,3 = 39,74 → 40 km.
    const km = distanceRouteKm({ lat: 48.78, lon: -3.05 }, { lat: 48.73, lon: -3.46 });
    expect(km).toBe(40);
    expect(fraisDeLivraison(km, { francoKm: 50, prixAuDela: 45 })).toBe(0);
    expect(fraisDeLivraison(km, { francoKm: 40, prixAuDela: 45 })).toBe(0); // 40 km, c'est « jusqu'à 40 km » : gratuit
    expect(fraisDeLivraison(km, { francoKm: 39, prixAuDela: 45 })).toBe(45);
  });

  it("alertes : 0,98 < 1,00 nouveau meilleur ; 1,00 au même prix ; 1,08 (+8 %) légèrement plus haut ; 1,12 (+12 %) plus haut", () => {
    const m = (pu: number) => messageNouveauDevis({ numero: 7, designation: "Ardoise naturelle 32×22", negoce: "Négoce Y", prixUnitaire: pu, meilleurAvant: 1 });
    expect(m(0.98).titre).toBe("Nouveau meilleur prix");
    expect(m(1).corps).toBe("Devis de Négoce Y, au même prix : 1,00 € HT contre 1,00 € pour ardoise naturelle 32×22.");
    expect(m(1.08).corps).toContain("légèrement plus haut : 1,08 € HT contre 1,00 €");
    expect(m(1.12).corps).toContain(", plus haut : 1,12 € HT contre 1,00 €");
  });

  it("compteur, suivi façon colis, désistement (avertissement puis six mois)", () => {
    expect(phraseCompteur({ artisans: 3, demandes: 2, devis: 1, meilleurPrix: 1.02 })).toBe("3 artisans, 2 demandes envoyées, 1 devis reçu, meilleur prix 1,02 €");
    expect(phraseCompteur({ artisans: 1, demandes: 0, devis: 0, meilleurPrix: null })).toBe("1 artisan, demande commune pas encore partie");
    const etat = { liste: true, lignesARegler: 0, demandes: 2, devis: 1, commande: false, meilleur: "1,02 €" };
    expect(suiviDuChantier(etat)).toMatchObject({ etape: 2, phrase: "1 devis reçu sur 2 demandes. Meilleur prix : 1,02 €." });
    expect(suiviDuChantier({ ...etat, commande: true })).toMatchObject({ etape: 3, phrase: "C'est commandé." });
    const maintenant = jour("2026-11-15");
    expect(sanctionDesistement([], maintenant)).toEqual({ sanction: "avertissement", excluJusquau: null });
    expect(sanctionDesistement([jour("2026-08-15")], maintenant)).toEqual({ sanction: "exclusion", excluJusquau: new Date("2027-05-15T08:00:00Z") });
    expect(sanctionDesistement([jour("2025-10-14")], maintenant)).toEqual({ sanction: "avertissement", excluJusquau: null });
  });
});
