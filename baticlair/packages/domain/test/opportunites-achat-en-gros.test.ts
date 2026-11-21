/**
 * Greg, 7 novembre 2026 (« deux parcours distincts mais reliés », points 4 à 7) : un achat groupé produit par produit ; deux
 * lignes ne se rapprochent que sur une fiche produit identique, jamais sur un nom qui ressemble ; une ligne est recommandée
 * si une collecte ou des besoins existent, ou si son volume le justifie.
 */
import { describe, expect, it } from "vitest";
import { comparerBesoins, phraseOpportunites, recommander, referenceStricte } from "../src/index.js";

const ref = (d: string) => {
  const r = referenceStricte(d);
  return r.ok ? r.reference : null;
};

describe("la fiche produit élargie (Velux, gouttières, tuiles)", () => {
  it("une fenêtre de toit se reconnaît à sa référence de taille ; sans taille, pas de rapprochement", () => {
    expect(ref("Velux GGL MK04")).toMatchObject({ type: "fenetre-de-toit", attributs: { reference: "mk04", gamme: "ggl" } });
    expect(ref("Fenêtre de toit Velux SK06")?.attributs.reference).toBe("sk06");
    expect(ref("Velux GGL MK04")!.cle).not.toBe(ref("Velux GGL SK06")!.cle);
    expect(ref("Velux GGL MK04")!.cle).not.toBe(ref("Velux GGU MK04")!.cle);
    expect(referenceStricte("Velux")).toMatchObject({ ok: false, raison: "attribut_manquant" });
    // Un raccord n'est jamais la fenêtre.
    expect(referenceStricte("Raccord Velux EDW MK04")).toMatchObject({ ok: false, raison: "accessoire" });
  });

  it("une gouttière se reconnaît à sa matière et son développé ; zinc 33 ≠ zinc 25 ≠ PVC 33", () => {
    expect(ref("Gouttière zinc dév. 33")).toMatchObject({ type: "gouttiere", attributs: { matiere: "zinc", developpe: "33" } });
    expect(ref("Gouttière zinc dév 33")!.cle).not.toBe(ref("Gouttière zinc dév 25")!.cle);
    expect(ref("Gouttière zinc dév 33")!.cle).not.toBe(ref("Gouttière PVC dév 33")?.cle);
    expect(referenceStricte("Gouttière zinc")).toMatchObject({ ok: false, raison: "attribut_manquant" });
    expect(referenceStricte("Crochets de gouttière dév 33")).toMatchObject({ ok: false, raison: "accessoire" });
  });

  it("une tuile se reconnaît à sa marque et son modèle ; « tuiles rouges » seules ne se rapprochent jamais", () => {
    expect(ref("Tuile Edilians Romane rouge")).toMatchObject({ type: "tuile", attributs: { marque: "edilians", modele: "romane", teinte: "rouge" } });
    expect(ref("Tuile Edilians Romane rouge")!.cle).not.toBe(ref("Tuile Edilians Romane vieilli")!.cle);
    expect(referenceStricte("Tuiles rouges")).toMatchObject({ ok: false });
  });

  it("les clés des produits déjà reconnus ne changent pas (les collectes ouvertes gardent la leur)", () => {
    expect(ref("Ardoise naturelle 32×22 Espagne 1er choix")!.cle).toBe("ardoise|format=32x22|epaisseur=|largeur=|aspect=|conditionnement=|origine=espagne|qualite=1|marque=");
    expect(ref("Zinc naturel 0,65 mm")!.type).toBe("zinc");
  });

  it("jamais sur la ressemblance des noms : 32×22 1er choix et 2e choix sont deux produits", () => {
    const b = (designation: string) => ({ designation, unite: "pièces", departement: "22", dateMax: null, modeLivraison: "livraison" as const });
    expect(comparerBesoins(b("Ardoise naturelle 32×22 Espagne 1er choix"), b("Ardoises naturelles 32x22 Espagne 1er choix")).niveau).toBe("exacte");
    expect(comparerBesoins(b("Ardoise naturelle 32×22 Espagne 1er choix"), b("Ardoise naturelle 32×22 Espagne 2e choix")).niveau).toBe("alternative");
    expect(comparerBesoins(b("Velux GGL MK04"), b("Velux GGL SK06")).niveau).toBe("alternative");
  });
});

describe("la recommandation ligne par ligne", () => {
  const f = { rapprochable: true, type: "ardoise", quantite: 200, unite: "pièces", collecte: false, besoinsCompatibles: 0 };
  it("une collecte ouverte, des besoins d'autres artisans, ou un gros volume", () => {
    expect(recommander({ ...f, collecte: true })).toEqual({ recommandee: true, raison: "Collecte ouverte près de toi" });
    expect(recommander({ ...f, besoinsCompatibles: 2 })).toEqual({ recommandee: true, raison: "2 artisans cherchent ce produit" });
    expect(recommander({ ...f, quantite: 1000 })).toEqual({ recommandee: true, raison: "Gros volume" });
    expect(recommander(f).recommandee).toBe(false);
    // Un Velux vaut le coup dès une pièce.
    expect(recommander({ ...f, type: "fenetre-de-toit", quantite: 1 }).recommandee).toBe(true);
    // Le palier ne vaut que dans l'unité du type.
    expect(recommander({ ...f, quantite: 5000, unite: "m2" }).recommandee).toBe(false);
  });
  it("jamais une ligne non rapprochable (accessoire, produit imprécis, déjà commandée)", () => {
    expect(recommander({ ...f, rapprochable: false, collecte: true }).recommandee).toBe(false);
  });
  it("la phrase d'ensemble : une opportunité globale seulement avec plusieurs correspondances réelles", () => {
    expect(phraseOpportunites([{ recommandee: true, collecte: true, besoinsCompatibles: 0 }, { recommandee: true, collecte: false, besoinsCompatibles: 2 }])).toMatch(/^2 articles de ton quantitatif correspondent/);
    expect(phraseOpportunites([{ recommandee: true, collecte: false, besoinsCompatibles: 0 }])).toBe("Certaines lignes de ton quantitatif pourraient bénéficier d'un achat groupé.");
    expect(phraseOpportunites([{ recommandee: false, collecte: false, besoinsCompatibles: 0 }])).toBeNull();
  });
});

describe("la saisie en conversation (point 2)", () => {
  it("plusieurs articles dans une phrase, l'espace des milliers compris", async () => {
    const { lireDescription } = await import("../src/index.js");
    expect(lireDescription("1 000 ardoises naturelles 32×22 Espagne 1er choix et 950 crochets inox 100 mm").lignes).toEqual([
      { libelle: "Ardoises naturelles 32×22 Espagne 1er choix", quantite: "1000", unite: null },
      { libelle: "Crochets inox 100 mm", quantite: "950", unite: null },
    ]);
    expect(lireDescription("2 velux GGL MK04, 30 m de gouttière zinc dév 33").lignes.map((l) => l.quantite)).toEqual(["2", "30"]);
    // Recette en ligne (7 novembre 2026) : « dév. 33 » devenait « Gouttière zinc dév », le développé perdu.
    expect(lireDescription("1 000 ardoises naturelles 32×22 et 40 m de gouttière zinc dév. 33").lignes).toEqual([
      { libelle: "Ardoises naturelles 32×22", quantite: "1000", unite: null },
      { libelle: "Gouttière zinc dév. 33", quantite: "40", unite: "m" },
    ]);
    expect(lireDescription("20 tuiles. 30 crochets").lignes.map((l) => l.quantite)).toEqual(["20", "30"]);
  });
});
