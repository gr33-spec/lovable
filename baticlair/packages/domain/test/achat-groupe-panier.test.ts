import { describe, expect, it } from "vitest";
import {
  CONDITIONS_OUVERTURE,
  PHRASE_ENGAGEMENT,
  PHRASE_PREMIER_OFFERT,
  comparerPourArtisan,
  cumulerPanier,
  datesAchatGroupePanier,
  demandeNegocePanier,
  droitAchatGroupe,
  exclu,
  exclusionJusquau,
  lecturesRestantes,
  lignesASuggerer,
  lignesPourNegoce,
  phraseAlerteMetier,
  phraseManquantes,
  phraseOuvertureCompte,
  phrasePublication,
  phraseSuggestion,
  reponseComplete,
  titreAchatGroupe,
  type LignePanier,
} from "../src/index.js";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message : ce message fait foi sur le précédent) : le panier,
 * l'orientation, l'engagement et ses sorties, la réponse ligne par ligne, la comparaison par artisan, l'accès.
 */
const A3222: LignePanier = { cle: "ardoise:32x22:espagne", libelle: "Ardoise 32×22 Espagne 1er choix", famille: "couverture", unite: "pièces", quantite: 1800 };
const LITEAU: LignePanier = { cle: "liteau:27x38", libelle: "Liteaux 27×38", famille: "couverture", unite: "m", quantite: 400 };
const CHEVRON: LignePanier = { cle: "chevron:63x75", libelle: "Chevrons 63×75", famille: "charpente", unite: "m", quantite: 120 };

describe("A. un achat groupé = un métier + une zone + une période, un panier", () => {
  it("le titre, et les dates (validation admin comprise dans la clôture)", () => {
    expect(titreAchatGroupe({ famille: "couverture", secteur: "Paimpol", dateBesoin: new Date("2026-11-30") })).toBe("Couverture · secteur Paimpol · livraison avant le 30 novembre");
    const d = datesAchatGroupePanier(new Date("2026-11-30"), { delaiLivraisonJours: 10, delaiReponseJours: 3, validationAdminHeures: 24 });
    expect(d.clotureLe.toISOString()).toBe("2026-11-16T10:00:00.000Z");
    expect(d.reponseAvantLe.toISOString()).toBe("2026-11-19T10:00:00.000Z");
  });
  it("la liste propre du négoce : quantités cumulées par référence ; un spécialiste ne reçoit que ses familles", () => {
    const panier = cumulerPanier([A3222, { ...A3222, quantite: 900 }, LITEAU, CHEVRON]);
    expect(panier.map((l) => [l.libelle, l.quantite])).toEqual([
      ["Chevrons 63×75", 120],
      ["Ardoise 32×22 Espagne 1er choix", 2700],
      ["Liteaux 27×38", 400],
    ]);
    expect(lignesPourNegoce(panier, { generaliste: false, familles: ["couverture"] }).map((l) => l.famille)).toEqual(["couverture", "couverture"]);
    expect(lignesPourNegoce(panier, { generaliste: true, familles: ["couverture"] })).toHaveLength(3);
    expect(lignesPourNegoce(panier, { generaliste: false, familles: null })).toHaveLength(3);
  });
  it("la demande (lot final, point 3) : l'objet au nom de l'entreprise, le volume, les règles, les faits ; jamais de commission", () => {
    const d = demandeNegocePanier({ clients: ["Toitures A", "Toitures B"], metier: "couverture", secteur: "Paimpol", prenomCommercial: "Paul", signataires: [{ prenom: "Jean", entreprise: "Toitures A", portable: "06 12 34 56 78" }, { prenom: null, entreprise: "Toitures B", portable: null }], artisans: 2, seuilAnonymat: 3, lignes: cumulerPanier([A3222, LITEAU]), livraisons: [{ commune: "Paimpol", date: new Date("2026-11-30") }], reponseAvantLe: new Date("2026-11-19T10:00:00Z"), lien: "https://x/achat-groupe/j", commissionPct: 2 });
    expect(d.objet).toBe("Toitures A : achat groupé couverture, secteur Paimpol");
    expect(d.texte.startsWith("Bonjour Paul,\n\nNous participons à un achat groupé avec d'autres artisans du secteur via Mobiiz. Pouvez-vous chiffrer ce volume ?")).toBe(true);
    expect(d.texte).toMatch(/Volume total engagé :\n- Ardoise 32×22 Espagne 1er choix : 1\s800 pièces/);
    expect(d.texte).not.toContain("2 artisans");
    expect(d.texte).toContain("Les règles : une seule offre, ferme, livraison comprise.");
    expect(d.texte).toContain("D'autres négoces du secteur sont consultés sur ce même volume.\nRéponse attendue avant le 19 novembre. Passé ce délai, la commande se fera sans vous.\nLe mieux placé remporte la commande.");
    expect(d.texte).toContain("Répondre en ligne, sans inscription : https://x/achat-groupe/j");
    expect(d.texte).toContain("Un doute ? Appelez-nous au 06 12 34 56 78.");
    expect(d.texte).toContain("Jean, Toitures A\nToitures B");
    expect(d.texte.endsWith("--\nMobiiz, des artisans qui achètent ensemble.")).toBe(true);
    expect(d.texte).not.toMatch(/commission|inscri(vez|ption gratuite)|@/i);
    const seul = demandeNegocePanier({ clients: ["A"], metier: "couverture", artisans: 4, seuilAnonymat: 3, lignes: [A3222], livraisons: [], reponseAvantLe: new Date(), lien: "l", commissionPct: 0 });
    expect(seul.texte).toContain("Je participe à un achat groupé");
    expect(seul.texte).toContain("Volume total engagé par 4 artisans du secteur :");
  });
});

describe("B. l'engagement et ses deux sorties", () => {
  it("la phrase, et l'exclusion : plus d'une sortie sur 3 mois, ou une non-commande sans motif", () => {
    expect(PHRASE_ENGAGEMENT).toBe("Je commande ces quantités, chez le moins cher entre la meilleure offre du groupe et mon négoce habituel.");
    expect(exclusionJusquau({ sorties: [new Date("2026-10-01")], nonCommandesSansMotif: [] })).toBeNull();
    const fin = exclusionJusquau({ sorties: [new Date("2026-10-01"), new Date("2026-11-15")], nonCommandesSansMotif: [] });
    expect(fin!.toISOString().slice(0, 10)).toBe("2027-02-15");
    expect(exclu(fin, new Date("2027-01-01"))).toBe(true);
    expect(exclu(fin, new Date("2027-03-01"))).toBe(false);
    expect(exclusionJusquau({ sorties: [new Date("2026-01-01"), new Date("2026-06-01")], nonCommandesSansMotif: [] })).toBeNull();
    expect(exclusionJusquau({ sorties: [], nonCommandesSansMotif: [new Date("2026-12-01")] })!.toISOString().slice(0, 10)).toBe("2027-03-01");
  });
});

describe("C. la réponse du négoce", () => {
  it("chaque ligne a un prix ou « je ne fournis pas » ; ses conditions d'ouverture de compte", () => {
    expect(reponseComplete([{ cle: "a" }, { cle: "b" }], { a: 1.1, b: null })).toBe(true);
    expect(reponseComplete([{ cle: "a" }, { cle: "b" }], { a: 1.1 })).toBe(false);
    expect(CONDITIONS_OUVERTURE).toEqual(["kbis", "rib", "piece_identite", "decennale"]);
    expect(phraseOuvertureCompte({ pieces: ["kbis", "rib"], paiement: "comptant", autre: null })).toBe("Pour commander, ouvre un compte : Kbis de moins de 3 mois, RIB, Paiement comptant au départ.");
  });
});

describe("D. chaque artisan comparé sur SES lignes", () => {
  it("les offres complètes devant, puis la moins chère ; « N lignes non chiffrées »", () => {
    const mes = [{ cle: "a", quantite: 100 }, { cle: "b", quantite: 10 }];
    const r = comparerPourArtisan(mes, [
      { id: "x", nom: "X", prix: { a: 1, b: null } },
      { id: "y", nom: "Y", prix: { a: 1.2, b: 3 } },
      { id: "z", nom: "Z", prix: { a: 0.5, b: 1 }, ecartee: true },
      { id: "w", nom: "W", prix: { a: null, b: null } },
    ]);
    expect(r).toEqual([
      { id: "y", nom: "Y", totalHt: 150, manquantes: 0, complete: true },
      { id: "x", nom: "X", totalHt: 100, manquantes: 1, complete: false },
    ]);
    expect(phraseManquantes(2)).toBe("2 lignes non chiffrées chez ce négoce");
    expect(phrasePublication(1980, 2160)).toBe("Ta liste chez le meilleur négoce : 1 980,00 € HT au lieu de 2 160,00 € HT, livraison comprise.");
  });
});

describe("F et G. alertes, suggestion, accès", () => {
  it("l'alerte par métier, la suggestion au-delà du seuil de la famille", () => {
    expect(phraseAlerteMetier({ famille: "couverture", dateBesoin: new Date("2026-11-30"), clotureLe: new Date("2026-11-16T10:00:00Z") })).toBe("Achat groupé couverture ouvert dans ton secteur, livraison avant le 30 novembre. Ajoute ta liste avant le 16 novembre.");
    expect(lignesASuggerer([{ famille: "couverture", quantite: 1800 }, { famille: "couverture", quantite: 20 }, { famille: null, quantite: 5000 }])).toHaveLength(1);
    expect(phraseSuggestion({ quantite: "1 800 pièces", libelle: "Ardoise 32×22" })).toBe("Tu as 1 800 pièces de ardoise 32×22, mets-les en achat groupé pour payer moins cher.");
  });
  it("le premier achat groupé offert, ensuite l'abonnement ; 3 lectures au total", () => {
    expect(droitAchatGroupe({ abonne: false, engagementsPasses: 0 })).toEqual({ ok: true, offert: true, phrase: PHRASE_PREMIER_OFFERT });
    expect(droitAchatGroupe({ abonne: false, engagementsPasses: 1 }).ok).toBe(false);
    expect(droitAchatGroupe({ abonne: true, engagementsPasses: 4 }).ok).toBe(true);
    expect(lecturesRestantes(2)).toBe(1);
    expect(lecturesRestantes(5)).toBe(0);
  });
});
