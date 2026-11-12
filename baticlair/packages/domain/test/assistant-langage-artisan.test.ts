import { describe, expect, it } from "vitest";
import { TOUT_LE_CATALOGUE } from "../src/catalogue/amorce.js";
import { lireDescription } from "../src/assistant/assistant.js";
import { comprendreArticle, auSon } from "../src/assistant/comprehension.js";
import { choisirProduit, choisirValeur, confirmer, designationFinale, etapeSuivante, refuser, type ArticleCompris } from "../src/assistant/article-compris.js";

/**
 * L'ASSISTANT COMPREND LE LANGAGE DES ARTISANS (Greg, 8 novembre 2026) : « 36 mètres de Lito » doit conduire à « Tu veux
 * dire 36 mètres linéaires de liteaux ? », puis à une question sur la section, avec des choix pertinents ; de même pour
 * la peinture, les gouttières, les ardoises, le bois, l'isolation. Fautes, abréviations, dictée. Jamais un nom d'article
 * fabriqué, jamais une quantité ni une caractéristique inventée ; l'artisan garde la validation finale.
 */
function dire(phrase: string) {
  const r = lireDescription(phrase);
  const l = [...r.lignes, ...r.aConfirmer][0]!;
  return { l, c: comprendreArticle(l.libelle, TOUT_LE_CATALOGUE, l.unite) };
}
const etape = (c: ArticleCompris, l: { quantite: string | null; unite: string | null }) => etapeSuivante(c, l.quantite, l.unite);
/** Une désignation finale vient du catalogue : sa désignation exacte, ou le nom d'un de ses produits suivi de valeurs du catalogue. */
function vientDuCatalogue(d: string, c: ArticleCompris, motsDeLArtisan: string[] = []): boolean {
  if (TOUT_LE_CATALOGUE.some((a) => a.designation === d)) return true;
  const p = c.produits[c.choixProduit!]!;
  if (!d.startsWith(p.produit)) return false;
  const reste = d.slice(p.produit.length).split(" · ").map((x) => x.trim()).filter(Boolean);
  const valeurs = new Set(p.variantes.flatMap((v) => (v.variante ?? "").split(" · ")));
  return reste.every((x) => valeurs.has(x) || motsDeLArtisan.includes(x));
}

describe("« 36 mètres de Lito » (l'exemple de Greg)", () => {
  it("propose les liteaux, demande confirmation, puis la section avec les sections du catalogue", () => {
    const { l, c } = dire("36 mètres de Lito");
    expect(l).toMatchObject({ quantite: "36", unite: "m" });
    expect(c!.certitude).toBe("probable");
    expect(etape(c!, l)).toEqual({ type: "confirmer", phrase: "Tu veux dire 36 mètres linéaires de liteaux ?" });
    const oui = confirmer(c!);
    const q = etape(oui, l);
    expect(q).toMatchObject({ type: "caracteristique", question: "Quelle section ?" });
    expect(q && q.type === "caracteristique" && q.choix).toEqual(expect.arrayContaining(["18×40", "27×40", "27×27"]));
    const section = choisirValeur(oui, 0, "27×40");
    expect(etape(section, l)).toMatchObject({ type: "caracteristique", question: "Quel traitement ?" });
    const fin = choisirValeur(section, 1, "sapin traité classe 2");
    expect(etape(fin, l)).toBeNull();
    expect(designationFinale(fin)).toBe("Liteau 27×40 · sapin traité classe 2");
    // La quantité et l'unité restent celles dites : 36 m, jamais converties ni arrondies.
    expect(l.quantite).toBe("36");
  });

  it("une caractéristique dite n'est jamais redemandée : « 36 m de lito 27 40 » (dictée sans ×)", () => {
    const { l, c } = dire("36 m de lito 27 40");
    const oui = confirmer(c!);
    expect(oui.valeurs[0]).toBe("27×40");
    expect(etape(oui, l)).toMatchObject({ question: "Quel traitement ?" });
  });
});

describe("fautes, sons et abréviations, tous métiers", () => {
  const cas: [string, string, string][] = [
    ["12 goutière dév 33", "Gouttière demi-ronde zinc", "Tu veux dire 12 gouttières demi-rondes zinc ?"],
    ["800 ardoize 32x22", "Ardoise naturelle", "Tu veux dire 800 ardoises naturelles ?"],
    ["10 sacs de cimen", "Ciment CEM II 32,5", "Tu veux dire 10 sacs de ciment CEM II 32,5 ?"],
    ["50 parpin de 20", "Parpaing creux", "Tu veux dire 50 parpaings creux ?"],
    ["3 pots de pinture blanche mat", "Peinture acrylique blanc mat", "Tu veux dire 3 pots de peinture acrylique blanc mat ?"],
    ["20 plakos BA 13", "Plaque de plâtre BA13 standard", "Tu veux dire 20 plaques de plâtre BA13 standard ?"],
    ["40 m2 de ldv 200", "Laine de verre en rouleau", "Tu veux dire 40 m² de laine de verre en rouleau ?"],
  ];
  for (const [phrase, produit, question] of cas)
    it(`« ${phrase} » → ${produit}, à confirmer`, () => {
      const { l, c } = dire(phrase);
      expect(c!.certitude).toBe("probable");
      expect(c!.produits[c!.choixProduit!]!.produit).toBe(produit);
      expect(etape(c!, l)).toEqual({ type: "confirmer", phrase: question });
    });

  it("les caractéristiques dites sont reprises : « dév 33 », « 200 » (mm), « de 20 » (parpaing de 20), « diam 80 »", () => {
    expect(dire("12 goutière dév 33").c!.valeurs[0]).toBe("dév. 33");
    expect(dire("40 m2 de ldv 200").c!.valeurs[0]).toBe("200 mm");
    expect(dire("50 parpin de 20").c!.valeurs[0]).toBe("20×20×50 (60 pièces)");
    const desc = dire("15 m de descente zinc diam 80");
    expect(desc.c!.produits[desc.c!.choixProduit!]!.produit).toBe("Tuyau de descente zinc");
    expect(desc.c!.valeurs[0]).toBe("Ø 80");
    expect(etape(desc.c!, desc.l)).toMatchObject({ question: "Quel aspect ?", choix: ["naturel", "prépatiné quartz", "prépatiné anthracite"] });
  });

  it("un mot écrit comme au catalogue n'a pas de confirmation : « 10 plaques osb 18 » → la question du format", () => {
    const { l, c } = dire("10 plaques osb 18");
    expect(c!.certitude).toBe("sur");
    expect(c!.valeurs[0]).toBe("18 mm");
    expect(etape(c!, l)).toMatchObject({ type: "caracteristique", question: "Quel format ?" });
  });

  it("« 12 chevron 75x75 4m » : section et longueur lues (« 4m » collé), reste le traitement", () => {
    const { l, c } = dire("12 chevron 75x75 4m");
    expect(c!.valeurs.slice(0, 2)).toEqual(["75×75", "4 m"]);
    expect(etape(c!, l)).toMatchObject({ question: "Quel traitement ?" });
  });

  it("l'écriture au son : liteau, liteaux, litos et lito se prononcent pareil", () => {
    expect(new Set(["liteau", "liteaux", "litos", "lito"].map(auSon)).size).toBe(1);
    expect(auSon("parpin")).toBe(auSon("parpaing"));
    expect(auSon("pinture")).toBe(auSon("peinture"));
    expect(auSon("goutière")).toBe(auSon("gouttière"));
  });

  it("une marque ne se propose pas sans être dite : « ardoises 32x22 » → l'ardoise naturelle générique", () => {
    const { c } = dire("800 ardoises 32x22");
    expect(c!.produits.map((p) => p.produit)).toEqual(["Ardoise naturelle"]);
  });

  it("plusieurs articles possibles : le plus courant proposé (« laine de verre » : le rouleau), « Non » ouvre les autres", () => {
    const { l, c } = dire("30 m2 de laine de verre");
    expect(c!.produits[c!.choixProduit!]!.produit).toBe("Laine de verre en rouleau");
    expect(etape(c!, l)).toMatchObject({ type: "caracteristique", question: "Quelle épaisseur ?" });
    const non = refuser(c!)!;
    const q = etape(non, l);
    expect(q && q.type === "produit" && q.choix).toContain("Laine de verre en panneau semi-rigide");
    const choisi = choisirProduit(non, non.produits.findIndex((p) => p.produit === "Laine de verre en panneau semi-rigide"));
    expect(etape(choisi, l)).toMatchObject({ question: "Quelle épaisseur ?" });
  });
});

describe("rien d'inventé, l'artisan garde la main", () => {
  it("un mot inconnu : aucune interprétation, la ligne reste telle qu'écrite", () => {
    expect(dire("5 trucs bizarres").c).toBeNull();
  });

  it("« Non » sans autre article possible : la ligne garde les mots de l'artisan", () => {
    const { c } = dire("36 mètres de Lito");
    expect(refuser(c!)).toBeNull();
  });

  it("« Non » quand d'autres articles étaient à égalité : ils sont proposés, jamais choisis en silence", () => {
    const { l, c } = dire("12 goutière dév 33");
    const non = refuser(c!)!;
    expect(non).not.toBeNull();
    const q = etape(non, l);
    expect(q && q.type === "produit" && q.choix).toEqual(expect.arrayContaining(["Gouttière havraise zinc", "Gouttière nantaise zinc"]));
    expect(q && q.type === "produit" && q.choix).not.toContain("Gouttière demi-ronde zinc");
  });

  it("« Passer » : la caractéristique reste au négoce, la désignation ne l'invente pas", () => {
    const { c } = dire("36 mètres de Lito");
    const fin = choisirValeur(choisirValeur(confirmer(c!), 0, "27×40"), 1, "");
    expect(designationFinale(fin)).toBe("Liteau 27×40");
  });

  it("« Autre » : les mots de l'artisan, tels quels, à la place d'une valeur du catalogue", () => {
    const { c } = dire("36 mètres de Lito");
    const fin = choisirValeur(choisirValeur(confirmer(c!), 0, "32×50"), 1, "");
    expect(designationFinale(fin)).toBe("Liteau 32×50");
    expect(vientDuCatalogue(designationFinale(fin), fin, ["32×50"])).toBe(true);
  });

  it("chaque désignation finale vient du catalogue, sur vingt phrases d'artisans répondues au premier choix", () => {
    const phrases = [
      "36 mètres de Lito", "12 goutière dév 33", "800 ardoize 32x22", "10 sacs de cimen", "50 parpin de 20", "3 pots de pinture blanche mat",
      "20 plakos BA 13", "40 m2 de ldv 200", "15 m de descente zinc diam 80", "10 plaques osb 18", "12 chevron 75x75 4m", "un rouleau de polyane",
      "10 bidons de lazure chene clair", "30 m2 de laine de verre", "6 coudes zinc 80", "20 crochets de gouttière dév 33", "2 rouleaux de pare vapeur",
      "1 000 ardoises 32×22 Espagne 1er choix", "40 m² de placo", "8 sacs d'enduit",
    ];
    for (const p of phrases) {
      const { l, c } = dire(p);
      expect(c, p).not.toBeNull();
      let x = confirmer(c!);
      for (let k = 0; k < 10; k++) {
        const e = etape(x, l);
        if (!e) break;
        if (e.type === "produit") x = choisirProduit(x, 0);
        else if (e.type === "caracteristique") x = choisirValeur(x, e.index, e.choix[0]!);
        else x = confirmer(x);
      }
      expect(etape(x, l), p).toBeNull();
      expect(vientDuCatalogue(designationFinale(x), x), `${p} → ${designationFinale(x)}`).toBe(true);
    }
  });
});
