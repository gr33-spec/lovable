/**
 * CORRECTION APRÈS TEST DE GREG (30 octobre 2026, point 3) : « un charpentier qui tape panne ne trouve rien ». Le
 * catalogue complet, métier par métier : désignations génériques sans marque, trois niveaux au plus, clés stables,
 * recherche par les mots du chantier et tolérante aux fautes. Ce test écrit aussi les fichiers de relecture
 * (`docs/catalogue/<métier>.csv`), jamais à la main.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AMORCE_CATALOGUE, arbreArticles, LIBELLES_METIERS_CATALOGUE, METIERS_CATALOGUE, metiersCatalogueDuCompte, rechercherArticles, TOUT_LE_CATALOGUE, type MetierCatalogue } from "../src/index.js";

const MARQUES = /\b(velux|placo(platre)?|isover|rockwool|ursa|knauf|siniat|eternit|cupa|samaca|vmzinc|rheinzink|elzinc|onduline|xylophene|siporex|monier|terreal|edilians|imerys|wakaflex|kvh|grohe|hansgrohe|legrand|schneider|hager|atlantic|thermor)\b/i;

describe("le catalogue complet", () => {
  it("onze métiers, chacun ses articles ; clés uniques ; jamais une marque dans une désignation ; trois niveaux au plus", () => {
    expect(METIERS_CATALOGUE).toHaveLength(11);
    for (const m of METIERS_CATALOGUE) expect(AMORCE_CATALOGUE[m].length, m).toBeGreaterThan(10);
    const cles = TOUT_LE_CATALOGUE.map((a) => a.cle);
    expect(new Set(cles).size).toBe(cles.length);
    for (const a of TOUT_LE_CATALOGUE) {
      // Catalogue métier (Greg, 31 octobre 2026) : une marque seulement sur une référence vérifiée à sa source.
      if (a.statut === "verifie") expect(a.marque && a.reference && a.source?.url, a.cle).toBeTruthy();
      else expect(a.designation, a.cle).not.toMatch(MARQUES);
      expect(a.famille && a.produit, a.cle).toBeTruthy();
      expect(a.unite.length, a.cle).toBeGreaterThan(0);
    }
    expect(AMORCE_CATALOGUE.couverture.length + AMORCE_CATALOGUE.charpente.length).toBeGreaterThan(400);
  });

  it("la recherche : les mots du chantier, les pluriels et une faute de frappe", () => {
    const tout = TOUT_LE_CATALOGUE;
    const premier = (q: string) => rechercherArticles(tout, q)[0]?.produit;
    expect(premier("panne")).toBe("Panne");
    expect(premier("pannes 75x225")).toBe("Panne");
    expect(premier("pane")).toBe("Panne");
    expect(premier("chevron")).toBe("Chevron");
    expect(premier("chevons")).toBe("Chevron");
    expect(premier("volige")).toBe("Volige");
    expect(premier("liteau")).toBe("Liteau");
    expect(premier("contre-latte")).toBe("Contre-latte");
    expect(premier("contre liteau")).toBe("Contre-latte");
    expect(premier("aretier")).toBe("Arêtier");
    expect(premier("noue")).toBe("Noue zinc");
    expect(premier("faitage")).toMatch(/Faîti?ère|Faîtage/);
    expect(rechercherArticles(tout, "crochet ardoise")[0]?.produit).toMatch(/Crochet d'ardoise/);
    expect(premier("ardoize")).toBe("Ardoise naturelle");
    expect(rechercherArticles(tout, "panne 75x225 6 m classe 2")[0]?.designation).toBe("Panne 75×225 · 6 m · classe 2");
    expect(rechercherArticles(tout, "zzzz")).toHaveLength(0);
  });

  it("l'arbre : famille › produit › variante, un toucher par niveau", () => {
    const arbre = arbreArticles(AMORCE_CATALOGUE.charpente);
    const bois = arbre.find((f) => f.libelle === "Bois de charpente")!;
    const panne = bois.enfants.find((p) => p.libelle === "Panne")!;
    expect(panne.enfants.some((v) => v.libelle === "75×225 · 6 m · classe 2" && v.article?.unite === "pièces")).toBe(true);
    expect(metiersCatalogueDuCompte(["roofing"])).toEqual(["couverture", "zinguerie"]);
    expect(metiersCatalogueDuCompte(["carpentry", "roofing"])).toEqual(["charpente", "couverture", "zinguerie"]);
  });

  it("écrit les fichiers de relecture (un par métier) dans docs/catalogue", () => {
    const dossier = path.resolve(__dirname, "../../../docs/catalogue");
    mkdirSync(dossier, { recursive: true });
    const csv = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    for (const m of METIERS_CATALOGUE as readonly MetierCatalogue[]) {
      const lignes = [["Métier", "Famille", "Produit", "Format / dimension / qualité", "Désignation envoyée au négoce", "Unité", "Mots du chantier (recherche)", "Clé"].join(";")];
      for (const a of AMORCE_CATALOGUE[m]) lignes.push([LIBELLES_METIERS_CATALOGUE[m], a.famille, a.produit, a.variante ?? "", a.designation, a.unite, a.synonymes.join(", "), a.cle].map(csv).join(";"));
      // Un BOM : Excel ouvre le fichier en UTF-8 (accents et ×).
      writeFileSync(path.join(dossier, `${m}.csv`), `﻿${lignes.join("\r\n")}\r\n`);
    }
  });
});

describe("la clé de regroupement d'un article du catalogue", () => {
  it("l'ardoise du catalogue s'additionne avec la même ardoise lue dans un devis ; deux pannes de longueurs différentes jamais", async () => {
    const { referenceStricte, clesDeRegroupement } = await import("../src/index.js");
    const stricte = (d: string) => {
      const r = referenceStricte(d);
      return r.ok ? r.reference.cle : null;
    };
    const cles = clesDeRegroupement(TOUT_LE_CATALOGUE, stricte);
    expect(cles.get("couverture/ardoises/ardoise-naturelle/32x22-espagne-1er-choix")).toBe(stricte("Ardoise naturelle 32×22 Espagne 1er choix"));
    const p6 = cles.get("charpente/bois-de-charpente/panne/75x225-6-m-classe-2")!;
    const p4 = cles.get("charpente/bois-de-charpente/panne/75x225-4-m-classe-2")!;
    expect(p6).not.toBe(p4);
    expect(p6.startsWith("cat:")).toBe(true);
  });
});
