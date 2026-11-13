import { aPlat, type ArticleCatalogue } from "./catalogue.js";
import { cheminsDeLArticle, RAYON_AUTRES, vueDuCatalogue } from "./rayons.js";
import { METIERS_DU_SELECTEUR, LIBELLES_METIERS_CATALOGUE, type MetierCatalogue } from "./catalogue.js";

/**
 * L'ÉTAT DES LIEUX DU CATALOGUE (Greg, 13 novembre 2026, « cœur métier » : « ne modifie et ne supprime aucune donnée avant
 * d'avoir compris […] produis un rapport distinguant doublons exacts, mêmes désignations sous des identifiants différents,
 * variantes légitimes, articles proches mais différents »). Fonction PURE : elle lit des articles (ceux de l'amorce ou
 * ceux de la base) et ne change rien. Elle sert au rapport du dépôt, au relevé de la synchronisation et à l'écran de
 * l'admin « doublons possibles ».
 */
export type ArticleAudite = Pick<ArticleCatalogue, "cle" | "metier" | "famille" | "produit" | "variante" | "designation" | "unite">;

export type NatureDeDoublon =
  /** La même clé à l'écriture près (« 2-x-1 » et « 2x1 ») : un ancien identifiant d'un même article. */
  | "ancien_identifiant"
  /** La même désignation et la même unité sous deux métiers : un seul article, à rattacher aux deux. */
  | "partage_entre_metiers"
  /** La même désignation, la même unité, le même métier, deux clés sans rapport. */
  | "exact"
  /** La même désignation avec des unités différentes : à regarder, jamais fusionné d'office. */
  | "unites_differentes"
  /** Les mêmes mots dans un autre ordre : probablement le même article. */
  | "probable";

export interface GroupeDeDoublons {
  nature: NatureDeDoublon;
  designation: string;
  cles: string[];
  /** La clé à garder quand la nature le permet (celle de l'amorce, sinon la première) ; null : à décider. */
  canonique: string | null;
}

/** La clé à l'écriture près : « 2-x-1 » se lit « 2x1 » (l'ancien et le nouveau découpage des dimensions). */
export const cleNormalisee = (cle: string) => cle.replace(/(\d)-x-(\d)/g, "$1x$2");

const motsTries = (s: string) => aPlat(s).split(" ").filter(Boolean).sort().join(" ");

export function doublonsDuCatalogue(articles: readonly ArticleAudite[], canoniques: ReadonlySet<string> = new Set()): GroupeDeDoublons[] {
  const groupes: GroupeDeDoublons[] = [];
  const vus = new Set<string>();
  const garder = (cles: readonly string[]) => cles.find((c) => canoniques.has(c)) ?? cles.find((c) => c === cleNormalisee(c)) ?? cles[0]!;
  const parDesignation = new Map<string, ArticleAudite[]>();
  for (const a of articles) parDesignation.set(aPlat(a.designation), [...(parDesignation.get(aPlat(a.designation)) ?? []), a]);
  for (const liste of parDesignation.values()) {
    if (liste.length < 2) continue;
    // D'abord les anciens identifiants : mêmes clés à l'écriture près.
    const parCle = new Map<string, ArticleAudite[]>();
    for (const a of liste) parCle.set(cleNormalisee(a.cle), [...(parCle.get(cleNormalisee(a.cle)) ?? []), a]);
    const representants: ArticleAudite[] = [];
    for (const memes of parCle.values()) {
      const cles = memes.map((a) => a.cle);
      const canonique = garder(cles);
      if (memes.length > 1) groupes.push({ nature: "ancien_identifiant", designation: memes[0]!.designation, cles, canonique });
      representants.push(memes.find((a) => a.cle === canonique)!);
      cles.forEach((c) => vus.add(c));
    }
    if (representants.length < 2) continue;
    const cles = representants.map((a) => a.cle);
    const unites = new Set(representants.map((a) => aPlat(a.unite)));
    const metiers = new Set(representants.map((a) => a.metier));
    if (unites.size > 1) groupes.push({ nature: "unites_differentes", designation: representants[0]!.designation, cles, canonique: null });
    else if (metiers.size > 1) groupes.push({ nature: "partage_entre_metiers", designation: representants[0]!.designation, cles, canonique: garder(cles) });
    else groupes.push({ nature: "exact", designation: representants[0]!.designation, cles, canonique: garder(cles) });
  }
  // Les probables : mêmes mots, autre ordre (hors ceux déjà dits).
  const parMots = new Map<string, ArticleAudite[]>();
  for (const a of articles) parMots.set(`${motsTries(a.designation)}|${aPlat(a.unite)}`, [...(parMots.get(`${motsTries(a.designation)}|${aPlat(a.unite)}`) ?? []), a]);
  for (const liste of parMots.values()) {
    const designations = new Set(liste.map((a) => aPlat(a.designation)));
    if (designations.size < 2) continue;
    groupes.push({ nature: "probable", designation: liste[0]!.designation, cles: liste.map((a) => a.cle), canonique: null });
  }
  return groupes;
}

export interface EtatDesLieux {
  total: number;
  parMetier: { metier: MetierCatalogue; libelle: string; articles: number; familles: { famille: string; sousFamilles: { sousFamille: string; produits: number; articles: number }[]; produits: number; articles: number }[] }[];
  doublons: GroupeDeDoublons[];
  /** Les articles qu'aucune famille ne range (« Autres produits ») : mal classés ou à classer. */
  nonClasses: { cle: string; designation: string; metier: string; famille: string }[];
  /** Les familles (ou sous-familles) où l'artisan lit plus de `SEUIL_FAMILLE_VOLUMINEUSE` produits d'un coup. */
  famillesVolumineuses: { metier: string; famille: string; sousFamille: string; produits: number }[];
  /** Un même nom de produit dans deux familles du même métier : à l'écran, deux résultats que rien ne distingue sans contexte. */
  designationsAmbigues: { metier: string; produit: string; familles: string[] }[];
  /** Un même produit vendu sous plusieurs unités selon la variante. */
  unitesIncoherentes: { metier: string; produit: string; unites: string[] }[];
  /** Les articles pris par plus d'un catalogue (une fiche, plusieurs rattachements). */
  rattachementsMultiples: number;
}

export const SEUIL_FAMILLE_VOLUMINEUSE = 40;

export function etatDesLieuxDuCatalogue(articles: readonly ArticleAudite[], canoniques: ReadonlySet<string> = new Set()): EtatDesLieux {
  const parMetier: EtatDesLieux["parMetier"] = [];
  const famillesVolumineuses: EtatDesLieux["famillesVolumineuses"] = [];
  const nonClasses: EtatDesLieux["nonClasses"] = [];
  for (const metier of METIERS_DU_SELECTEUR) {
    const vue = vueDuCatalogue(metier, articles);
    const siens = articles.filter((a) => a.metier === metier).length;
    const familles = vue.map((r) => {
      const sousFamilles = r.familles.map((f) => ({ sousFamille: f.libelle, produits: f.produits.length, articles: f.produits.reduce((n, p) => n + p.nombre, 0) }));
      for (const s of sousFamilles) if (s.produits > SEUIL_FAMILLE_VOLUMINEUSE) famillesVolumineuses.push({ metier, famille: r.libelle, sousFamille: s.sousFamille, produits: s.produits });
      return { famille: r.libelle, sousFamilles, produits: sousFamilles.reduce((n, s) => n + s.produits, 0), articles: sousFamilles.reduce((n, s) => n + s.articles, 0) };
    });
    parMetier.push({ metier, libelle: LIBELLES_METIERS_CATALOGUE[metier], articles: siens, familles });
  }
  let rattachementsMultiples = 0;
  for (const a of articles) {
    const chemins = cheminsDeLArticle(a);
    if (chemins.length > 1) rattachementsMultiples++;
    if (chemins[0]!.rayon === RAYON_AUTRES) nonClasses.push({ cle: a.cle, designation: a.designation, metier: a.metier, famille: a.famille });
  }
  const parProduit = new Map<string, { metier: string; produit: string; familles: Set<string>; unites: Set<string> }>();
  for (const a of articles) {
    const k = `${a.metier}|${aPlat(a.produit)}`;
    const p = parProduit.get(k) ?? { metier: a.metier, produit: a.produit, familles: new Set<string>(), unites: new Set<string>() };
    p.familles.add(a.famille);
    p.unites.add(a.unite);
    parProduit.set(k, p);
  }
  return {
    total: articles.length,
    parMetier,
    doublons: doublonsDuCatalogue(articles, canoniques),
    nonClasses,
    famillesVolumineuses,
    designationsAmbigues: [...parProduit.values()].filter((p) => p.familles.size > 1).map((p) => ({ metier: p.metier, produit: p.produit, familles: [...p.familles] })),
    unitesIncoherentes: [...parProduit.values()].filter((p) => p.unites.size > 1).map((p) => ({ metier: p.metier, produit: p.produit, unites: [...p.unites] })),
    rattachementsMultiples,
  };
}

/**
 * LES ANCIENS IDENTIFIANTS à ne plus proposer : pour chaque article écrit sous deux clés (« 2-x-1 » et « 2x1 »), les clés
 * qui ne sont PAS celle gardée. Rien n'est supprimé ni réécrit : l'ancien identifiant reste en base et reste lisible par
 * sa clé (une ligne d'achat groupé déjà saisie le retrouve) ; il n'est simplement plus montré deux fois à l'artisan.
 * Une seule passe sur les articles (appelée à chaque lecture du catalogue).
 */
export function anciensIdentifiants(articles: readonly Pick<ArticleAudite, "cle" | "designation" | "unite">[], canoniques: ReadonlySet<string> = new Set()): Map<string, string> {
  const groupes = new Map<string, Pick<ArticleAudite, "cle" | "designation" | "unite">[]>();
  for (const a of articles) {
    const k = cleNormalisee(a.cle);
    const g = groupes.get(k);
    if (g) g.push(a);
    else groupes.set(k, [a]);
  }
  const anciens = new Map<string, string>();
  for (const g of groupes.values()) {
    if (g.length < 2) continue;
    const garde = g.find((a) => canoniques.has(a.cle)) ?? g.find((a) => a.cle === cleNormalisee(a.cle)) ?? g[0]!;
    // Deux clés proches ne sont le même article que si la désignation et l'unité sont les mêmes.
    for (const a of g) if (a !== garde && aPlat(a.designation) === aPlat(garde.designation) && aPlat(a.unite) === aPlat(garde.unite)) anciens.set(a.cle, garde.cle);
  }
  return anciens;
}
