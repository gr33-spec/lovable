// « AJOUTER UN MATÉRIAU » EN CONVERSATION (Greg, 8 novembre 2026, capture « Choisis précisément le produit » : « C'est nul
// ça, je veux passer par l'IA Mobiiz »).
import { describe, expect, it } from "vitest";
import { PRODUITS_V1 } from "../src/groupe/achats-groupes-v1.js";
import { BESOIN_VIDE, lienDuBesoin, lireDate, tourAchatGroupe, uniteDeLaQuestion, type ProduitConv } from "../src/groupe/conversation-ag-v1.js";

const P = PRODUITS_V1 as unknown as ProduitConv[];
const AUJ = new Date(2026, 10, 8);

describe("une phrase de comptoir donne le besoin entier", () => {
  it("« 10 palettes d'ardoise 32 22 Espagne 1er choix 5 mm, livrées sur chantier, pour le 1er juin » : complet d'un coup", () => {
    const t = tourAchatGroupe(P, BESOIN_VIDE, "10 palettes d'ardoise 32 22 Espagne 1er choix 5 mm, livrées sur chantier, pour le 1er juin", AUJ);
    expect(t.besoin).toEqual({ type: "ardoise", attributs: { format: "32x22", origine: "espagne", qualite: "1", epaisseur: "5" }, quantite: 10, unite: "palette", reception: "livraison", dateBesoin: "2027-06-01" });
    expect(t.complet).toBe(true);
    expect(t.reponse).toContain("C'est complet : Ardoise naturelle · 32 × 22 · Espagne · 1er choix · 5 mm, 10 palettes, livraison sur chantier, avant le 1er juin 2027.");
    expect(lienDuBesoin(t.besoin)).toBe("/achats-groupes/nouveau?type=ardoise&format=32x22&origine=espagne&qualite=1&epaisseur=5&quantite=10&unite=palette&reception=livraison&date=2027-06-01");
  });
});

describe("une question à la fois, avec les choix du produit", () => {
  it("« de l'ardoise » : le format d'abord, puis le reste, chaque réponse d'un tap ; jamais une quantité inventée", () => {
    let t = tourAchatGroupe(P, BESOIN_VIDE, "il me faut de l'ardoise", AUJ);
    expect(t.reponse).toBe("Ardoise naturelle : c'est noté. Format ?");
    expect(t.suggestions).toEqual(["32 × 22", "35 × 25", "40 × 25", "30 × 20", "50 × 25"]);
    t = tourAchatGroupe(P, t.besoin, "32 × 22", AUJ);
    expect(t.reponse).toBe("J'ai : Ardoise naturelle · 32 × 22. Origine ?");
    t = tourAchatGroupe(P, t.besoin, "Espagne", AUJ);
    t = tourAchatGroupe(P, t.besoin, "1er choix", AUJ);
    t = tourAchatGroupe(P, t.besoin, "5 mm", AUJ);
    expect(t.reponse).toBe("Ardoise naturelle · 32 × 22 · Espagne · 1er choix · 5 mm. Combien de palettes ?");
    expect(t.besoin.quantite).toBeNull();
    const u = uniteDeLaQuestion(P.find((p) => p.type === "ardoise"));
    t = tourAchatGroupe(P, t.besoin, "12", AUJ, u);
    expect(t.besoin).toMatchObject({ quantite: 12, unite: "palette" });
    expect(t.suggestions).toEqual(["Livraison sur chantier", "Retrait au dépôt"]);
    t = tourAchatGroupe(P, t.besoin, "Retrait au dépôt", AUJ);
    expect(t.suggestions).toEqual(["Dans 3 semaines", "Dans 1 mois", "Dans 2 mois"]);
    t = tourAchatGroupe(P, t.besoin, "Dans 2 mois", AUJ);
    expect(t.besoin.dateBesoin).toBe("2027-01-08");
    expect(t.complet).toBe(true);
  });
  it("les liteaux : section et essence demandées ; « tuile … ardoisée » reste une tuile", () => {
    const l = tourAchatGroupe(P, BESOIN_VIDE, "300 m de liteaux", AUJ);
    expect(l.besoin).toMatchObject({ type: "liteau", quantite: 300, unite: "m" });
    expect(l.reponse).toContain("Section ?");
    const t = tourAchatGroupe(P, BESOIN_VIDE, "des tuiles Terreal romane teinte ardoisé", AUJ);
    expect(t.besoin).toMatchObject({ type: "tuile", attributs: { marque: "terreal", modele: "romane", teinte: "ardoise" } });
  });
  it("un matériau non ouvert : la phrase de la V5.2, aucun produit inventé", () => {
    const t = tourAchatGroupe(P, BESOIN_VIDE, "200 parpaings", AUJ);
    expect(t.besoin.type).toBeNull();
    expect(t.reponse).toContain("pas encore ouvert aux achats groupés");
  });
});

describe("les dates dites", () => {
  it("« 1er juin », « 15/12 », « dans 3 semaines » : toujours à venir", () => {
    expect(lireDate(" pour le 1er juin ", AUJ)).toBe("2027-06-01");
    expect(lireDate(" le 15/12 ", AUJ)).toBe("2026-12-15");
    expect(lireDate(" dans 3 semaines ", AUJ)).toBe("2026-11-29");
    expect(tourAchatGroupe(P, BESOIN_VIDE, "ardoise pour le 15/03", AUJ).besoin.dateBesoin).toBe("2027-03-15");
  });
});

describe("l'autocomplétion se peaufine à chaque caractère", () => {
  it("« ard » → l'ardoise ; « ardoise 3 » → les formats en 3 ; « ardoise 32 22 Esp » → Espagne", async () => {
    const { suggestionsSaisie } = await import("../src/groupe/conversation-ag-v1.js");
    expect(suggestionsSaisie(P, "ard").map((s) => s.libelle)).toEqual(["Ardoise naturelle"]);
    expect(suggestionsSaisie(P, "ardoise 3").map((s) => s.libelle)).toEqual(["Ardoise naturelle · 32 × 22", "Ardoise naturelle · 35 × 25", "Ardoise naturelle · 30 × 20"]);
    expect(suggestionsSaisie(P, "ardoise 32 22 Esp").map((s) => s.libelle)).toEqual(["Ardoise naturelle · 32 × 22 · Espagne"]);
    expect(suggestionsSaisie(P, "Ardoise naturelle · 32 × 22 · Espagne ").map((s) => s.libelle)[0]).toBe("Ardoise naturelle · 32 × 22 · Espagne · 1er choix");
  });
  it("rien ne correspond : aucune suggestion, l'artisan continue à écrire", async () => {
    const { suggestionsSaisie } = await import("../src/groupe/conversation-ag-v1.js");
    expect(suggestionsSaisie(P, "parpaing")).toEqual([]);
    expect(suggestionsSaisie(P, "ardoise 9")).toEqual([]);
  });
});
