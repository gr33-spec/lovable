/**
 * RETOUR DE GREG (12 novembre 2026) : « La partie couverture doit comprendre la partie zinguerie. Dans la partie
 * étanchéité, il manque énormément de choix (membrane, pax alu, EPDM, isolant, pare-vapeur…). »
 *  - la zinguerie n'a plus d'entrée au sélecteur : ses articles se lisent sous « Couverture », clés inchangées ;
 *  - l'étanchéité a son métier au catalogue, avec les mots du comptoir.
 */
import { describe, expect, it } from "vitest";
import { AMORCE_CATALOGUE, METIERS_DU_SELECTEUR, metiersCatalogueDuCompte, metiersDuRayon, rayonDuMetierCatalogue, rechercherArticles, TOUT_LE_CATALOGUE } from "../src/index.js";

describe("la couverture comprend la zinguerie", () => {
  it("la zinguerie n'est plus au sélecteur ; ses articles se lisent sous Couverture ; les clés ne changent pas", () => {
    expect(METIERS_DU_SELECTEUR).not.toContain("zinguerie");
    expect(METIERS_DU_SELECTEUR).toContain("couverture");
    expect(metiersDuRayon("couverture")).toEqual(["couverture", "zinguerie"]);
    expect(rayonDuMetierCatalogue("zinguerie")).toBe("couverture");
    expect(rayonDuMetierCatalogue("etancheite")).toBe("etancheite");
    expect(metiersCatalogueDuCompte(["roofing"])).not.toContain("zinguerie");
    // Une clé additionne les lignes de plusieurs artisans dans un achat groupé : elle ne se réécrit jamais.
    expect(AMORCE_CATALOGUE.zinguerie.every((a) => a.cle.startsWith("zinguerie/"))).toBe(true);
    expect(AMORCE_CATALOGUE.zinguerie.some((a) => a.cle === "zinguerie/gouttieres/gouttiere-demi-ronde-zinc/dev--33-naturel")).toBe(true);
  });
});

describe("couverture et zinguerie : les compléments du 12 novembre 2026", () => {
  const C = [...AMORCE_CATALOGUE.couverture, ...AMORCE_CATALOGUE.zinguerie];
  const ici = (q: string) => rechercherArticles(C, q)[0];
  it("les pièces que le comptoir vend et que le catalogue n'avait pas", () => {
    expect(AMORCE_CATALOGUE.zinguerie.length).toBeGreaterThan(280);
    expect(AMORCE_CATALOGUE.couverture.length).toBeGreaterThan(850);
    expect(ici("chéneau")?.produit).toBe("Chéneau zinc");
    expect(ici("gouttière cuivre")?.produit).toBe("Gouttière demi-ronde cuivre");
    expect(ici("jambonneau")?.produit).toBe("Jambonneau");
    expect(ici("besace")?.produit).toMatch(/^Besace/);
    expect(ici("abergement cheminée")?.produit).toBe("Abergement de cheminée zinc");
    expect(ici("shingle")?.produit).toBe("Bardeau bitumé");
    expect(ici("faîtière bac acier")?.produit).toBe("Faîtière bac acier");
    expect(ici("tuile de rive gauche")?.designation).toBe("Tuile de rive gauche");
    expect(ici("anti-mousse")?.produit).toBe("Anti-mousse pour toiture");
    expect(ici("sortie de toit vmc")?.produit).toBe("Sortie de toit pour ventilation");
  });
});

describe("le catalogue étanchéité", () => {
  const E = AMORCE_CATALOGUE.etancheite;
  /** Dans tout le catalogue (un mot propre à l'étanchéité) ; dans le métier choisi (l'écran le met d'abord) pour un mot partagé. */
  const premier = (q: string) => rechercherArticles(TOUT_LE_CATALOGUE, q)[0];
  const ici = (q: string) => rechercherArticles(E, q)[0];

  it("membranes bitume, chape alu, EPDM, synthétiques, résines, isolants, pare-vapeur, évacuations, protection", () => {
    expect(E.length).toBeGreaterThan(150);
    expect([...new Set(E.map((a) => a.famille))]).toEqual([
      "Membranes bitume", "Étanchéité EPDM", "Membranes PVC et TPO", "Étanchéité liquide", "Isolants de toiture-terrasse", "Pare-vapeur et écrans", "Évacuations et relevés", "Protection et finition",
    ]);
    // Sans marque : les noms du comptoir ne sont que des mots de recherche.
    for (const a of E) expect(a.designation, a.cle).not.toMatch(/paxalu|mammouth|soprema|siplast|firestone|sika|alsan|foamglas|rockacier|efigreen/i);
  });

  it("les mots de l'artisan trouvent le bon produit", () => {
    expect(premier("pax alu")?.produit).toBe("Chape bitume armée autoprotégée aluminium");
    expect(premier("paxalu")?.produit).toBe("Chape bitume armée autoprotégée aluminium");
    expect(premier("epdm")?.produit).toBe("Membrane EPDM");
    expect(premier("epdm 1,52 6,10")?.designation).toBe("Membrane EPDM 1,52 mm · largeur 6,10 m");
    expect(ici("pare vapeur")?.famille).toBe("Pare-vapeur et écrans");
    expect(ici("pare-vapeur alu autoadhésif")?.produit).toBe("Pare-vapeur aluminium autoadhésif");
    expect(ici("isolant toiture terrasse")?.famille).toBe("Isolants de toiture-terrasse");
    expect(ici("pir 120")?.produit).toMatch(/^Panneau isolant PIR/);
    expect(ici("membrane bitume")?.famille).toBe("Membranes bitume");
    expect(ici("sous-couche soudable")?.produit).toBe("Membrane bitume SBS sous-couche soudable");
    expect(premier("eif")?.produit).toBe("Enduit d'imprégnation à froid (EIF)");
    expect(ici("trop plein")?.produit).toBe("Trop-plein à platine");
    expect(ici("crapaudine")?.produit).toBe("Crapaudine");
    expect(ici("eep 100")?.produit).toBe("Entrée d'eau pluviale à platine");
    expect(premier("membrane pvc 1,5")?.designation).toBe("Membrane PVC armée 1,5 mm");
  });
});
