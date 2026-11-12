/**
 * LES CATALOGUES PROFESSIONNELS PAR MÉTIER (Greg, 12 novembre 2026 : « Je veux que tu réorganises le catalogue de matériaux
 * Mobiiz comme un ensemble de catalogues professionnels par métier […] Métier › Rayon ou ouvrage › Famille de produits ›
 * Produit › Caractéristiques et variantes › Quantité et unité […] Une catégorie « Zinc » ne doit jamais afficher du cuivre,
 * de l'aluminium ou de l'inox […] ne supprimer aucun article, ne changer aucun identifiant »).
 *
 * Un catalogue est une VUE : les articles ne bougent pas. Ce test tient l'arborescence de chaque métier, les
 * rattachements, les produits partagés sans duplication, l'absence de mélange de matières, l'étanchéité sous Couverture,
 * la recherche directe, les catégories vides, les caractéristiques (obligatoires, utiles, facultatives), les performances,
 * et écrit le relevé d'audit `docs/catalogue/catalogues-par-metier.md`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CATALOGUES,
  cheminsDeLArticle,
  indicationDuProduit,
  LIBELLES_CATALOGUES,
  METIERS_CATALOGUE,
  METIERS_DU_SELECTEUR,
  RAYON_AUTRES,
  rechercherAvecPrecisions,
  TOUT_LE_CATALOGUE,
  vueDuCatalogue,
  type ArticleCatalogue,
  type ChoixDeVue,
  type ProduitDeVue,
} from "../src/index.js";

const T = TOUT_LE_CATALOGUE;
const vue = (c: (typeof METIERS_DU_SELECTEUR)[number]) => vueDuCatalogue(c, T);
const feuilles = <A>(n: ChoixDeVue<A> | null): A[] => (n ? n.options.flatMap((o) => (o.suite ? feuilles(o.suite) : [o.article!])) : []);
const articlesDe = <A>(p: ProduitDeVue<A>): A[] => (p.choix ? feuilles(p.choix) : [p.article!]);
const famille = (c: (typeof METIERS_DU_SELECTEUR)[number], rayon: string, f: string) => vue(c).find((r) => r.libelle === rayon)!.familles.find((x) => x.libelle === f)!;
const METAUX = ["zinc", "cuivre", "aluminium", "acier", "inox", "plomb", "PVC"];

describe("un catalogue par métier : rayons, familles, produits", () => {
  it("le sélecteur : dix catalogues ; Zinguerie et Étanchéité sont des rayons de Couverture, dans l'ordre", () => {
    expect(METIERS_DU_SELECTEUR).toEqual(["couverture", "charpente", "menuiserie", "maconnerie", "platrerie_isolation", "peinture", "carrelage", "plomberie", "electricite", "chauffage"]);
    expect(vue("couverture").map((r) => r.libelle)).toEqual(["Couverture", "Zinguerie", "Étanchéité et toitures-terrasses"]);
    expect(LIBELLES_CATALOGUES.platrerie_isolation).toBe("Plaques de plâtre et isolation");
    for (const c of METIERS_DU_SELECTEUR) expect(vue(c).length, c).toBeGreaterThan(0);
  });

  it("AUCUN ARTICLE NE DISPARAÎT ni ne change : chacun a son rayon dans son catalogue, aucun sous « Autres produits », chaque article une seule fois par catalogue", () => {
    for (const a of T) {
      const chemins = cheminsDeLArticle(a);
      expect(chemins.length, a.cle).toBeGreaterThan(0);
      expect(chemins[0]!.rayon, a.cle).not.toBe(RAYON_AUTRES);
    }
    for (const c of METIERS_DU_SELECTEUR) {
      const vus = vue(c).flatMap((r) => r.familles.flatMap((f) => f.produits.flatMap(articlesDe)));
      expect(new Set(vus).size, c).toBe(vus.length);
      // L'article de la vue EST l'article du catalogue : même clé, même désignation, même unité (anciens quantitatifs intacts).
      for (const a of vus) expect(T).toContain(a);
      for (const m of METIERS_CATALOGUE) if ((m === c || (c === "couverture" && (m === "zinguerie" || m === "etancheite"))) && T.some((a) => a.metier === m)) expect(T.filter((a) => a.metier === m).every((a) => vus.includes(a)), `${c}/${m}`).toBe(true);
    }
    expect(new Set(T.map((a) => a.cle)).size).toBe(T.length);
  });

  it("les rayons de Couverture, Zinguerie et Étanchéité portent les familles attendues", () => {
    const v = vue("couverture");
    const noms = (r: string) => v.find((x) => x.libelle === r)!.familles.map((f) => f.libelle);
    expect(noms("Couverture")).toEqual(expect.arrayContaining(["Ardoises", "Tuiles béton", "Bacs et plaques", "Écrans et pare-vapeur", "Isolation", "Bois de couverture", "Fixations et accessoires"]));
    expect(noms("Zinguerie")).toEqual(["Gouttières et chéneaux", "Accessoires de gouttière", "Descentes et eaux pluviales", "Couverture métallique et joint debout", "Feuilles, bobines, bobineaux et bandes", "Solins, bavettes et rives", "Habillages", "Soudure et consommables"]);
    expect(noms("Étanchéité et toitures-terrasses")).toEqual(expect.arrayContaining(["Membranes bitumineuses", "Membranes synthétiques", "Étanchéité liquide", "Pare-vapeur", "Isolation de toiture-terrasse", "Relevés et protections", "Évacuation des eaux", "Accessoires et fixations"]));
    // Une famille ne montre jamais des centaines de lignes : 50 produits au plus par famille, tous métiers.
    for (const c of METIERS_DU_SELECTEUR) for (const r of vue(c)) for (const f of r.familles) expect(f.produits.length, `${c} › ${r.libelle} › ${f.libelle}`).toBeLessThanOrEqual(50);
  });

  it("les autres métiers suivent la même organisation", () => {
    const rayons = (c: (typeof METIERS_DU_SELECTEUR)[number]) => vue(c).map((r) => r.libelle);
    expect(rayons("peinture")).toEqual(["Préparation des supports", "Enduits et rebouchage", "Impressions et sous-couches", "Peintures murs et plafonds", "Façades", "Bois", "Métaux", "Sols", "Protection du chantier", "Consommables et outillage"]);
    expect(rayons("electricite")).toEqual(["Tableau et protections", "Communication et réseau", "Câbles et fils", "Gaines et conduits", "Appareillage", "Éclairage", "Chauffage électrique"]);
    expect(rayons("plomberie")).toEqual(["Alimentation en eau", "Évacuation", "Raccords", "Sanitaire", "Robinetterie", "Chauffage", "Production d'eau chaude", "Fixations, étanchéité et consommables"]);
    expect(rayons("platrerie_isolation")).toEqual(["Plaques de plâtre", "Ossatures", "Isolation", "Bandes, enduits et fixations"]);
    expect(rayons("maconnerie")).toContain("Blocs et briques");
    expect(rayons("menuiserie")).toContain("Quincaillerie");
    expect(rayons("charpente")).toContain("Bois de charpente");
    expect(rayons("carrelage")).toContain("Colles et joints");
    expect(rayons("chauffage")).toContain("Fumisterie");
  });
});

describe("jamais de matières mélangées : la matière est une caractéristique", () => {
  it("« Feuilles, bobines, bobineaux et bandes » : Bobine et Bobineau restent deux produits ; le zinc, le cuivre, l'aluminium et l'inox se choisissent", () => {
    const f = famille("couverture", "Zinguerie", "Feuilles, bobines, bobineaux et bandes");
    expect(f.produits.map((p) => p.libelle)).toEqual(expect.arrayContaining(["Feuille ou tôle 2 × 1 m", "Bobine", "Bobineau"]));
    const bobine = f.produits.find((p) => p.libelle === "Bobine")!;
    expect(bobine.choix!.nom).toBe("Matériau");
    expect(bobine.choix!.options.map((o) => o.valeur)).toEqual(["zinc", "cuivre"]);
    expect(bobine.caracteristiques).toEqual(["Matériau", "Finition", "Épaisseur", "Largeur"]);
    expect(indicationDuProduit(bobine)).toBe("Matériau, finition, épaisseur, largeur");
    const feuille = f.produits.find((p) => p.libelle === "Feuille ou tôle 2 × 1 m")!;
    expect(feuille.choix!.options.map((o) => o.valeur)).toEqual(["zinc", "cuivre", "acier galvanisé", "aluminium laqué", "inox étamé"]);
    // Sous « zinc », rien que du zinc : chaque branche d'une matière ne mène qu'à des articles de cette matière.
    for (const p of [bobine, feuille]) for (const o of p.choix!.options) for (const a of o.suite ? feuilles(o.suite) : [o.article!]) expect(a.produit, `${p.libelle} › ${o.valeur}`).toContain(o.valeur);
    // Ce qui n'est pas une feuille ni une bobine n'y est pas (le joint debout a sa famille).
    expect(f.produits.some((p) => /joint debout|tasseau/i.test(p.libelle))).toBe(false);
    expect(famille("couverture", "Zinguerie", "Couverture métallique et joint debout").produits.map((p) => p.libelle)).toContain("Patte de joint debout");
  });

  it("aucun produit de zinguerie ne mêle deux matières sans les faire choisir ; une matière jamais sous le nom d'une autre", () => {
    for (const f of vue("couverture").find((r) => r.libelle === "Zinguerie")!.familles)
      for (const p of f.produits) {
        const matieres = new Set(articlesDe(p).flatMap((a) => METAUX.filter((m) => new RegExp(`\\b${m}\\b`, "i").test(a.produit))));
        if (matieres.size > 1) expect(p.choix?.nom, `${f.libelle} › ${p.libelle}`).toBe("Matériau");
      }
    const gouttiere = famille("couverture", "Zinguerie", "Gouttières et chéneaux").produits.find((p) => p.libelle === "Gouttière demi-ronde")!;
    expect(gouttiere.choix!.options.map((o) => o.valeur)).toEqual(["zinc", "PVC", "cuivre", "acier laqué", "acier galvanisé"]);
    expect(gouttiere.caracteristiques).toEqual(["Matériau", "Développé", "Finition"]);
  });

  it("CARACTÉRISTIQUES OBLIGATOIRES : chaque suite de choix mène à UN article, tous les articles s'atteignent, aucun choix à une seule valeur", () => {
    const parcourir = (n: ChoixDeVue<ArticleCatalogue>, ou: string) => {
      expect(n.options.length, ou).toBeGreaterThan(1);
      expect(new Set(n.options.map((o) => o.valeur)).size, ou).toBe(n.options.length);
      for (const o of n.options) {
        expect(!!o.suite !== !!o.article, ou).toBe(true);
        if (o.suite) parcourir(o.suite, `${ou} › ${o.valeur}`);
      }
    };
    for (const c of METIERS_DU_SELECTEUR)
      for (const r of vue(c))
        for (const f of r.familles)
          for (const p of f.produits) {
            expect(articlesDe(p).length, p.libelle).toBe(p.nombre);
            if (p.choix) parcourir(p.choix, `${c} › ${p.libelle}`);
            else expect(p.article).not.toBeNull();
          }
  });

  it("PRÉCISIONS UTILES ET FACULTATIVES : écrites par l'artisan, jamais un article de plus (teinte d'une peinture, gamme d'un appareillage)", () => {
    const peinture = vue("peinture").find((r) => r.libelle === "Peintures murs et plafonds")!.familles[0]!.produits[0]!;
    expect(peinture.precisions).toEqual([expect.objectContaining({ nom: "Teinte", niveau: "utile" }), expect.objectContaining({ nom: "Support", niveau: "facultative" })]);
    expect(indicationDuProduit(peinture)).toMatch(/teinte$/);
    const prise = vue("electricite").find((r) => r.libelle === "Appareillage")!.familles[0]!.produits.find((p) => /Prise/.test(p.libelle))!;
    expect(prise.precisions.map((x) => [x.nom, x.niveau])).toEqual([["Gamme", "facultative"], ["Couleur", "facultative"]]);
    expect(famille("couverture", "Couverture", "Ardoises").produits[0]!.precisions).toEqual([]);
  });
});

describe("des produits partagés, une seule fiche", () => {
  it("un isolant se lit sous Plaques de plâtre ET sous Couverture ; un panneau sous Charpente ET Menuiserie ; même article, même clé", () => {
    const isolant = T.find((a) => a.metier === "platrerie_isolation" && a.produit === "Laine de verre en rouleau")!;
    const chemins = cheminsDeLArticle(isolant);
    expect(chemins.map((c) => `${c.libelleCatalogue} › ${c.rayon}`)).toEqual(["Plaques de plâtre et isolation › Isolation", "Couverture › Couverture"]);
    expect(chemins[1]!.famille).toBe("Isolation");
    expect(articlesDe(famille("couverture", "Couverture", "Isolation").produits.find((p) => p.libelle === isolant.produit)!)).toContain(isolant);
    expect(T.filter((a) => a.cle === isolant.cle)).toHaveLength(1);
    const osb = T.find((a) => a.metier === "charpente" && a.produit === "Panneau OSB 3")!;
    expect(cheminsDeLArticle(osb).map((c) => c.catalogue)).toEqual(["charpente", "menuiserie"]);
    const liteau = T.find((a) => a.produit === "Liteau")!;
    expect(cheminsDeLArticle(liteau).map((c) => c.catalogue)).toEqual(["couverture", "charpente"]);
    const radiateur = T.find((a) => a.produit === "Radiateur électrique à inertie")!;
    expect(cheminsDeLArticle(radiateur).map((c) => c.catalogue).sort()).toEqual(["chauffage", "electricite", "plomberie"]);
  });
});

describe("catégories vides, articles de l'admin, anciennes familles", () => {
  it("un rayon ou une famille sans article ne sort pas ; un article d'une famille inconnue se lit sous « Autres produits », jamais perdu", () => {
    const seulementArdoises = T.filter((a) => a.metier === "couverture" && a.famille === "Ardoises");
    const v = vueDuCatalogue("couverture", seulementArdoises);
    expect(v.map((r) => r.libelle)).toEqual(["Couverture"]);
    expect(v[0]!.familles.map((f) => f.libelle)).toEqual(["Ardoises"]);
    expect(vueDuCatalogue("electricite", [])).toEqual([]);
    const ajout = { cle: "couverture/ajout/1", metier: "couverture" as const, famille: "Paratonnerres", produit: "Paratonnerre à tige", variante: null };
    const avec = vueDuCatalogue("couverture", [...seulementArdoises, ajout]);
    expect(avec.at(-1)!.libelle).toBe(RAYON_AUTRES);
    expect(avec.at(-1)!.familles[0]).toMatchObject({ libelle: "Paratonnerres", produits: [{ libelle: "Paratonnerre à tige", article: ajout }] });
    expect(cheminsDeLArticle(ajout)).toEqual([{ catalogue: "couverture", libelleCatalogue: "Couverture", rayon: RAYON_AUTRES, famille: "Paratonnerres", produit: "Paratonnerre à tige" }]);
    // Deux ajouts du même nom, que rien ne distingue : tous deux restent choisissables.
    const jumeaux = [ajout, { ...ajout, cle: "couverture/ajout/2" }];
    expect(feuilles(vueDuCatalogue("couverture", jumeaux)[0]!.familles[0]!.produits[0]!.choix)).toHaveLength(2);
  });

  it("chaque famille définie prend au moins un article du catalogue (aucune règle morte)", () => {
    for (const c of METIERS_DU_SELECTEUR) {
      const sorties = new Set(vue(c).flatMap((r) => r.familles.map((f) => `${r.libelle} › ${f.libelle}`)));
      for (const r of CATALOGUES[c]!) for (const f of r.familles) expect(sorties.has(`${r.libelle} › ${f.libelle}`), `${c} › ${r.libelle} › ${f.libelle}`).toBe(true);
    }
  });
});

describe("la recherche directe contourne l'arborescence", () => {
  const premier = (q: string) => rechercherAvecPrecisions(T, q, 5)[0];
  it.each([
    ["bobine zinc", "Bobine de zinc", "Zinguerie", "Feuilles, bobines, bobineaux et bandes"],
    ["bobinot zinc", "Bobineau de zinc", "Zinguerie", "Feuilles, bobines, bobineaux et bandes"],
    ["ardoise 32 22", /^Ardoise naturelle/, "Couverture", "Ardoises"],
    ["câble 3G2,5", "Câble R2V", "Câbles et fils", "Câbles et fils"],
    ["multicouche 20", "Tube multicouche", "Alimentation en eau", "Alimentation en eau"],
    ["peinture plafond mate", /^Peinture plafond/, "Peintures murs et plafonds", "Peintures murs et plafonds"],
    ["plaque hydro 13", "Plaque de plâtre hydrofuge BA13", "Plaques de plâtre", "Plaques de plâtre"],
    ["parpaing 20", "Parpaing creux", "Blocs et briques", "Blocs et briques"],
    ["goutiere demi ronde 33", "Gouttière demi-ronde zinc", "Zinguerie", "Gouttières et chéneaux"],
    ["membrane epdm", "Membrane EPDM", "Étanchéité et toitures-terrasses", "Membranes synthétiques"],
  ] as const)("« %s » trouve %s, rangé sous %s › %s", (q, produit, rayon, fam) => {
    const t = premier(q)!;
    expect(t, q).toBeTruthy();
    if (typeof produit === "string") expect(t.article.produit).toBe(produit);
    else expect(t.article.produit).toMatch(produit);
    const chemin = cheminsDeLArticle(t.article)[0]!;
    expect([chemin.rayon, chemin.famille]).toEqual([rayon, fam]);
  });

  it("« prise 16 A étanche » : la prise est trouvée, « étanche » reste à préciser (le catalogue ne l'écrit pas, rien n'est inventé)", () => {
    const t = premier("prise 16 A étanche")!;
    expect(t.article.produit).toBe("Prise de courant 2P+T");
    expect(t.precisions).toEqual(["étanche"]);
    expect(cheminsDeLArticle(t.article)[0]).toMatchObject({ libelleCatalogue: "Électricité", rayon: "Appareillage" });
  });
});

describe("performances avec le catalogue complet", () => {
  it("les dix catalogues se rangent en moins d'une demi-seconde ; une recherche en moins de 150 ms", () => {
    const t0 = performance.now();
    for (const c of METIERS_DU_SELECTEUR) vue(c);
    const rangement = performance.now() - t0;
    rechercherAvecPrecisions(T, "ardoise 32 22", 30);
    const t1 = performance.now();
    for (let i = 0; i < 5; i++) rechercherAvecPrecisions(T, "gouttière demi-ronde zinc 33", 30);
    const recherche = (performance.now() - t1) / 5;
    expect(rangement).toBeLessThan(500);
    expect(recherche).toBeLessThan(150);
  });
});

it("le relevé d'audit est écrit : docs/catalogue/catalogues-par-metier.md", () => {
  const l: string[] = [
    "# Catalogues professionnels par métier : relevé",
    "",
    "Écrit par `packages/domain/test/catalogues-par-metier.test.ts` (ne pas modifier à la main). Les articles ne changent pas :",
    "un catalogue est une vue sur les mêmes fiches (même clé, même désignation, même unité).",
    "",
    `Articles de l'amorce : ${T.length}. Catalogues au sélecteur : ${METIERS_DU_SELECTEUR.length}.`,
    "",
  ];
  const partages = T.filter((a) => cheminsDeLArticle(a).length > 1);
  const parDesignation = new Map<string, string[]>();
  for (const a of T) parDesignation.set(`${a.metier}|${a.designation.toLowerCase()}`, [...(parDesignation.get(`${a.metier}|${a.designation.toLowerCase()}`) ?? []), a.cle]);
  const doublons = [...parDesignation.values()].filter((c) => c.length > 1);
  for (const c of METIERS_DU_SELECTEUR) {
    const v = vue(c);
    const n = v.reduce((s, r) => s + r.familles.reduce((x, f) => x + f.produits.reduce((y, p) => y + p.nombre, 0), 0), 0);
    l.push(`## ${LIBELLES_CATALOGUES[c]} (${n} articles)`, "", "| Rayon | Famille | Produits | Articles | Plus long produit | Caractéristiques à choisir |", "|---|---|---:|---:|---|---|");
    for (const r of v)
      for (const f of r.familles) {
        const long = [...f.produits].sort((x, y) => y.nombre - x.nombre)[0]!;
        const cars = [...new Set(f.produits.flatMap((p) => p.caracteristiques))].join(", ") || "aucune";
        l.push(`| ${r.libelle} | ${f.libelle} | ${f.produits.length} | ${f.produits.reduce((s, p) => s + p.nombre, 0)} | ${long.libelle} (${long.nombre}) | ${cars} |`);
      }
    const fusions = v.flatMap((r) => r.familles.flatMap((f) => f.produits.filter((p) => new Set(articlesDe(p).map((a) => a.produit)).size > 1).map((p) => `${p.libelle} (${new Set(articlesDe(p).map((a) => a.produit)).size} anciens produits, ${p.nombre} articles)`)));
    if (fusions.length) l.push("", `Variantes qui étaient des produits à part, lues comme un produit : ${fusions.join(" ; ")}.`);
    l.push("");
  }
  l.push("## Produits partagés entre catalogues", "", `${partages.length} articles se lisent dans plusieurs catalogues (une seule fiche chacun) :`, "");
  const groupes = new Map<string, number>();
  for (const a of partages) {
    const k = `${a.metier} / ${a.famille} → ${cheminsDeLArticle(a).map((c) => `${c.libelleCatalogue} › ${c.rayon}`).join(" ; ")}`;
    groupes.set(k, (groupes.get(k) ?? 0) + 1);
  }
  for (const [k, n] of groupes) l.push(`- ${k} : ${n} articles`);
  l.push("", "## Doublons", "", `Doublons certains dans l'amorce (même métier, même désignation, deux clés) : ${doublons.length}.`, ...doublons.map((d) => `- ${d.join(" = ")}`), "", "Aucun doublon n'est fusionné automatiquement.", "");
  const fichier = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/catalogue/catalogues-par-metier.md");
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, l.join("\n"));
  expect(doublons.length).toBe(0);
});
