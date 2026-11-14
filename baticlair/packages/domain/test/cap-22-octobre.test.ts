import { describe, expect, it } from "vitest";
import { choisirLeNegoce, distanceRouteKm, fraisDeLivraison, lireRegleDeLivraison, livraisonComplete, messageNouveauDevis, phraseCompteur, prixLivre, suiviDuChantier, totalLivraison, zoneDeLivraison, zonesDuLot } from "../src/index.js";

/** Nouveau cap (Greg, 22 octobre 2026, section 0 du doc « BatiClair Groupé »), points 5 à 8. */
describe("le compteur du groupe", () => {
  it("« 30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 € »", () => {
    expect(phraseCompteur({ artisans: 30, demandes: 15, devis: 3, meilleurPrix: 1.12 }, "roofing")).toBe("30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 €");
  });
  it("au singulier, avant le départ, et pour un autre métier", () => {
    expect(phraseCompteur({ artisans: 1, demandes: 1, devis: 0, meilleurPrix: null }, "roofing")).toBe("1 couvreur, 1 demande envoyée, 0 devis reçu");
    expect(phraseCompteur({ artisans: 2, demandes: 0, devis: 0, meilleurPrix: null }, "roofing")).toBe("2 couvreurs, demande commune pas encore partie");
    expect(phraseCompteur({ artisans: 4, demandes: 2, devis: 2, meilleurPrix: 8.5 }, "masonry")).toBe("4 artisans, 2 demandes envoyées, 2 devis reçus, meilleur prix 8,50 €");
  });
});

describe("l'alerte à chaque nouveau devis", () => {
  const base = { numero: 12, designation: "Ardoise naturelle 32×22", negoce: "Négoce du Trieux" };
  it("le premier devis, ou un devis moins cher : « Nouveau meilleur prix »", () => {
    expect(messageNouveauDevis({ ...base, prixUnitaire: 1.12, meilleurAvant: null })).toMatchObject({ titre: "Nouveau meilleur prix", corps: "1,12 € HT chez Négoce du Trieux pour ardoise naturelle 32×22." });
    expect(messageNouveauDevis({ ...base, prixUnitaire: 1.05, meilleurAvant: 1.12 }).titre).toBe("Nouveau meilleur prix");
  });
  it("un devis plus cher : « Devis de X, légèrement plus haut » (au-delà de 10 % : « plus haut »)", () => {
    expect(messageNouveauDevis({ ...base, prixUnitaire: 1.18, meilleurAvant: 1.12 }).corps).toBe("Devis de Négoce du Trieux, légèrement plus haut : 1,18 € HT contre 1,12 € pour ardoise naturelle 32×22.");
    expect(messageNouveauDevis({ ...base, prixUnitaire: 1.4, meilleurAvant: 1.12 }).corps).toMatch(/^Devis de Négoce du Trieux, plus haut :/);
  });
});

describe("la livraison par zone", () => {
  it("la zone d'un chantier : son code postal et sa ville", () => {
    expect(zoneDeLivraison("12 rue du Port, 22500 Paimpol")).toBe("22500 Paimpol");
    expect(zoneDeLivraison("Lieu-dit Kerity 22620 Ploubazlanec")).toBe("22620 Ploubazlanec");
    expect(zoneDeLivraison("sans adresse")).toBeNull();
    expect(zonesDuLot(["1 rue A, 22500 Paimpol", "3 rue B, 22500 Paimpol", "Bourg, 22620 Ploubazlanec"])).toEqual(["22500 Paimpol", "22620 Ploubazlanec"]);
  });
  it("chaque zone doit avoir son prix ; zéro vaut franco", () => {
    expect(livraisonComplete(["22500 Paimpol", "22620 Ploubazlanec"], [{ zone: "22500 Paimpol", prixHt: "45" }])).toEqual({ ok: false, manquantes: ["22620 Ploubazlanec"] });
    expect(livraisonComplete(["22500 Paimpol"], [{ zone: "22500 Paimpol", prixHt: "0" }])).toEqual({ ok: true, prix: [{ zone: "22500 Paimpol", prixHt: 0 }] });
    expect(livraisonComplete(["22500 Paimpol"], [{ zone: "22500 Paimpol", prixHt: "abc" }]).ok).toBe(false);
  });
  it("le moins cher se juge livraison comprise", () => {
    const fenetre = { tot: new Date("2026-11-02"), tard: new Date("2026-11-30") };
    const commun = { statutExtraction: "lue", delaiJours: 5, deposeLe: new Date("2026-10-25"), pasConcerneLe: null };
    const choix = choisirLeNegoce({ volumeFerme: 100, fenetre }, [
      { ...commun, negoceId: "a", prix: [{ palier: null, prixUnitaire: "1,10", totalHt: null }], livraisonHt: 60 },
      { ...commun, negoceId: "b", prix: [{ palier: null, prixUnitaire: "1,15", totalHt: null }], livraisonHt: 0 },
    ]);
    expect(choix.retenu?.negoceId).toBe("b");
    expect(totalLivraison([{ zone: "a", prixHt: 45 }, { zone: "b", prixHt: 30 }], ["a", "b"])).toBe(75);
  });
  it("le prix livré chez l'artisan, comparé à son prix habituel", () => {
    expect(prixLivre({ quantite: 2760, prixUnitaire: 0.92, livraisonZone: 45, prixHabituel: 1.04 })).toEqual({ totalHt: 2584.2, livraisonHt: 45, habituelHt: 2870.4, economieHt: 286.2 });
    expect(prixLivre({ quantite: 10, prixUnitaire: 2, livraisonZone: null, prixHabituel: null })).toEqual({ totalHt: 20, livraisonHt: 0, habituelHt: null, economieHt: null });
  });
});

describe("le suivi façon colis", () => {
  const vide = { liste: false, lignesARegler: 0, demandes: 0, devis: 0, commande: false };
  it("Liste prête → Prix demandés → Prix reçus → Commandé, avec une phrase et ce qu'il faut faire", () => {
    expect(suiviDuChantier({ ...vide, liste: true, lignesARegler: 2 })).toMatchObject({ etape: 0, phrase: "Ta liste est là.", aFaire: "Règle 2 lignes orange, puis envoie-la à tes négoces." });
    expect(suiviDuChantier({ ...vide, liste: true })).toMatchObject({ etape: 0, aFaire: "Envoie-la à tes négoces, ou ajoute-la au regroupement." });
    // Plan « finition », bloc 5 : devis lu, questions en attente : rien n'est coché, et on dit quoi faire.
    expect(suiviDuChantier({ ...vide, questions: true })).toMatchObject({ etape: -1, phrase: "Ta liste se prépare.", aFaire: "Réponds aux questions, puis « Calculer ma liste »." });
    expect(suiviDuChantier({ ...vide, liste: true, demandes: 2 })).toMatchObject({ etape: 1, phrase: "Demande envoyée à 2 négoces. Tu seras prévenu à chaque réponse.", aFaire: null });
    const recu = suiviDuChantier({ ...vide, liste: true, demandes: 2, devis: 1, meilleur: "1 840,00 € HT" });
    expect(recu).toMatchObject({ etape: 2, phrase: "1 devis reçu sur 2 demandes. Meilleur prix : 1 840,00 € HT.", aFaire: "Ouvre les devis et retiens le négoce de ton choix." });
    expect(recu.etapes.map((e) => e.fait)).toEqual([true, true, true, false]);
    expect(suiviDuChantier({ ...vide, liste: true, demandes: 2, devis: 2, commande: true })).toMatchObject({ etape: 3, phrase: "C'est commandé." });
    expect(suiviDuChantier(vide).etape).toBe(-1);
  });
});

describe("la livraison : franco jusqu'à X km, Y € au-delà (décision de Greg, 22 octobre)", () => {
  const paimpol = { lat: 48.78, lon: -3.05 };
  const lannion = { lat: 48.73, lon: -3.46 };
  it("la distance par la route : vol d'oiseau × 1,3, au kilomètre", () => {
    expect(distanceRouteKm(paimpol, paimpol)).toBe(0);
    // Paimpol–Lannion : environ 31 km à vol d'oiseau, 40 par la route.
    expect(distanceRouteKm(paimpol, lannion)).toBe(40);
  });
  it("gratuite jusqu'à X km, Y € au-delà ; une distance inconnue se compte au-delà", () => {
    const regle = { francoKm: 30, prixAuDela: 45 };
    expect(fraisDeLivraison(12, regle)).toBe(0);
    expect(fraisDeLivraison(30, regle)).toBe(0);
    expect(fraisDeLivraison(39, regle)).toBe(45);
    expect(fraisDeLivraison(null, regle)).toBe(45);
  });
  it("la saisie du négoce : son adresse de départ et deux nombres", () => {
    expect(lireRegleDeLivraison({ depart: "ZA de Kerfolic, 22500 Paimpol", francoKm: "30", prixAuDela: "45,00" })).toEqual({ depart: "ZA de Kerfolic, 22500 Paimpol", francoKm: 30, prixAuDela: 45 });
    expect(lireRegleDeLivraison({ depart: "", francoKm: "30", prixAuDela: "45" })).toBeNull();
    expect(lireRegleDeLivraison({ depart: "ZA de Kerfolic, 22500 Paimpol", francoKm: "trente", prixAuDela: "45" })).toBeNull();
  });
});
