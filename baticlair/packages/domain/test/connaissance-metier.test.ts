/**
 * LA CONNAISSANCE MÉTIER ET LES QUESTIONS UTILES (Greg, 13 novembre 2026, « cœur métier » : « une question doit être
 * rattachée à l'article concerné […] ne doit apparaître que si la réponse améliore réellement la demande de prix […] les
 * caractéristiques déjà indiquées par l'artisan ne doivent pas être redemandées […] l'artisan doit toujours pouvoir choisir
 * Laisser à préciser […] ne jamais inventer une quantité, une dimension, une compatibilité, une norme »).
 */
import { describe, expect, it } from "vitest";
import { ficheArticle, questionDe, questionsUtiles, TOUT_LE_CATALOGUE, vueDuCatalogue } from "../src/index.js";

const T = TOUT_LE_CATALOGUE;
const produit = (metier: Parameters<typeof vueDuCatalogue>[0], nom: string) => vueDuCatalogue(metier, T).flatMap((r) => r.familles.flatMap((f) => f.produits)).find((p) => p.libelle === nom)!;

describe("la fiche métier d'un article : rien que ce que le catalogue porte", () => {
  it("la bobine de zinc : métier, famille, mots, unité, caractéristiques nommées, ce qui la désigne", () => {
    const a = T.find((x) => x.cle === "zinguerie/zinc/bobine-de-zinc/naturel-0-65-mm-largeur-500-mm")!;
    const f = ficheArticle(a, T);
    expect(f).toMatchObject({
      designation: "Bobine de zinc naturel · 0,65 mm · largeur 500 mm",
      produit: "Bobine",
      metierPrincipal: { code: "zinguerie", libelle: "Zinguerie" },
      famille: "Feuilles, bobines et bandes",
      sousFamille: null,
      unite: "m",
      statut: "actif",
    });
    expect(f.caracteristiques).toEqual([{ nom: "Matériau", valeur: "zinc" }, { nom: "Finition", valeur: "naturel" }, { nom: "Épaisseur", valeur: "0,65 mm" }, { nom: "Largeur", valeur: "largeur 500 mm" }]);
    expect(f.indispensables).toEqual(["Matériau", "Finition", "Épaisseur", "Largeur"]);
    // Rien d'inventé : la fiche n'a ni norme, ni compatibilité, ni rendement, ni règle de calcul.
    expect(Object.keys(f).sort()).toEqual(["caracteristiques", "cle", "designation", "facultatives", "famille", "indispensables", "metierPrincipal", "metiersSecondaires", "produit", "source", "sousFamille", "statut", "synonymes", "unite"]);
  });

  it("une sous-famille quand la famille en a plusieurs ; les métiers secondaires sans copie ; les précisions facultatives ; les statuts", () => {
    const gouttiere = T.find((x) => x.produit === "Gouttière demi-ronde zinc")!;
    expect(ficheArticle(gouttiere, T)).toMatchObject({ metierPrincipal: { code: "zinguerie" }, famille: "Gouttières et descentes", sousFamille: "Gouttières et chéneaux", produit: "Gouttière demi-ronde" });
    const laine = T.find((x) => x.metier === "platrerie_isolation" && x.produit === "Laine de verre en rouleau")!;
    expect(ficheArticle(laine, T).metiersSecondaires).toEqual([{ code: "couverture", libelle: "Couverture" }]);
    expect(T.filter((x) => x.cle === laine.cle)).toHaveLength(1);
    const peinture = T.find((x) => x.produit === "Peinture murs et plafonds acrylique")!;
    expect(ficheArticle(peinture, T).facultatives).toEqual(["Teinte", "Support"]);
    expect(ficheArticle<(typeof T)[number] & { aVerifier?: boolean; masque?: boolean }>({ ...laine, aVerifier: true }, T).statut).toBe("a_verifier");
    expect(ficheArticle<(typeof T)[number] & { aVerifier?: boolean; masque?: boolean }>({ ...laine, masque: true, aVerifier: true }, T).statut).toBe("masque");
    // Une source n'est dite que si elle existe.
    const source = T.find((x) => x.source)!;
    expect(ficheArticle(source, T).source).toEqual(source.source);
    expect(ficheArticle(laine, T).source).toBeNull();
  });

  it("chaque article du catalogue a sa fiche : un métier connu, une famille, une unité ; ses caractéristiques mènent à lui", () => {
    for (const a of T.filter((_, i) => i % 7 === 0)) {
      const f = ficheArticle(a, T);
      expect(f.famille.length, a.cle).toBeGreaterThan(0);
      expect(f.unite, a.cle).toBe(a.unite);
      expect(f.caracteristiques.length, a.cle).toBeLessThanOrEqual(Math.max(f.indispensables.length, (a.variante ?? "").split(" · ").length + 1));
      // Chaque caractéristique dite porte un nom et une valeur réelle de l'article.
      for (const c of f.caracteristiques) expect(c.nom.length > 0 && c.valeur.length > 0, a.cle).toBe(true);
    }
  });
});

describe("les questions utiles : une à la fois, jamais sur ce qui est déjà dit, toujours « Laisser à préciser »", () => {
  const bobine = produit("zinguerie", "Bobine");
  it("rien n'est dit : la première caractéristique qui désigne l'article, avec les valeurs du catalogue", () => {
    const s = questionsUtiles(bobine, "bobine");
    expect(s).toMatchObject({ deduites: [], article: null, question: { caracteristique: "Matériau", question: "Quelle matière ?", choix: ["zinc", "cuivre"], indispensable: true, peutAttendre: true } });
  });

  it("« bobine zinc naturel 0,65 » : matière, finition et épaisseur ne sont pas redemandées ; il ne reste que la largeur", () => {
    const s = questionsUtiles(bobine, "bobine zinc naturel 0,65");
    expect(s.deduites).toEqual([{ nom: "Matériau", valeur: "zinc" }, { nom: "Finition", valeur: "naturel" }, { nom: "Épaisseur", valeur: "0,65 mm" }]);
    expect(s.question).toMatchObject({ caracteristique: "Largeur", question: "Quelle largeur ?" });
    expect(s.question!.choix.length).toBeGreaterThan(1);
    expect(s.article).toBeNull();
  });

  it("tout est dit ou répondu : l'article exact, plus aucune question", () => {
    const s = questionsUtiles(bobine, "bobine zinc naturel 0,65", { Largeur: "largeur 500 mm" });
    expect(s.question).toBeNull();
    expect(s.article!.cle).toBe("zinguerie/zinc/bobine-de-zinc/naturel-0-65-mm-largeur-500-mm");
  });

  it("deux valeurs possibles pour les mêmes mots : Mobiiz demande, il ne choisit pas", () => {
    const gouttiere = produit("zinguerie", "Gouttière demi-ronde");
    const s = questionsUtiles(gouttiere, "gouttière demi-ronde 33");
    // La matière n'est pas dite : c'est elle qui est demandée, pas devinée d'après le développé.
    expect(s.deduites).toEqual([]);
    expect(s.question).toMatchObject({ caracteristique: "Matériau" });
    expect(questionsUtiles(gouttiere, "gouttière demi-ronde zinc 33").deduites).toEqual([{ nom: "Matériau", valeur: "zinc" }, { nom: "Développé", valeur: "dév. 33" }]);
  });

  it("un produit sans rien à choisir ne pose aucune question ; une précision utile (la teinte) se demande une fois, jamais si elle est déjà écrite", () => {
    const sans = vueDuCatalogue("zinguerie", T).flatMap((r) => r.familles.flatMap((f) => f.produits)).find((p) => p.article && p.precisions.length === 0)!;
    expect(questionsUtiles(sans, sans.libelle)).toEqual({ deduites: [], question: null, article: sans.article });
    const peinture = produit("peinture", "Peinture murs et plafonds acrylique");
    let reponses: Record<string, string> = {};
    let s = questionsUtiles(peinture, "peinture murs et plafonds acrylique", reponses);
    for (let i = 0; i < 6 && s.question?.indispensable; i++) {
      reponses = { ...reponses, [s.question.caracteristique]: s.question.choix[0]! };
      s = questionsUtiles(peinture, "peinture murs et plafonds acrylique", reponses);
    }
    expect(s.article).not.toBeNull();
    expect(s.question).toEqual({ caracteristique: "Teinte", question: "Teinte ?", choix: [], indispensable: false, peutAttendre: true });
    expect(questionsUtiles(peinture, "peinture murs et plafonds acrylique teinte RAL 9010", reponses).question).toBeNull();
    expect(questionsUtiles(peinture, "peinture murs et plafonds acrylique", { ...reponses, Teinte: "" }).question).toBeNull();
  });

  it("jamais plus de questions que de caractéristiques ; chaque question propose plusieurs valeurs réelles ; toutes peuvent attendre", () => {
    for (const metier of ["couverture", "zinguerie", "etancheite", "charpente", "peinture", "plomberie"] as const)
      for (const p of vueDuCatalogue(metier, T).flatMap((r) => r.familles.flatMap((f) => f.produits))) {
        let reponses: Record<string, string> = {};
        let n = 0;
        for (let s = questionsUtiles(p, p.libelle, reponses); s.question; s = questionsUtiles(p, p.libelle, reponses)) {
          expect(s.question.peutAttendre).toBe(true);
          if (s.question.indispensable) expect(s.question.choix.length, `${metier} › ${p.libelle}`).toBeGreaterThan(1);
          reponses = { ...reponses, [s.question.caracteristique]: s.question.choix[0] ?? "" };
          expect(++n, `${metier} › ${p.libelle}`).toBeLessThanOrEqual(p.caracteristiques.length + p.precisions.length);
        }
      }
    expect(questionDe("Développé")).toBe("Quel développé ?");
  });
});
