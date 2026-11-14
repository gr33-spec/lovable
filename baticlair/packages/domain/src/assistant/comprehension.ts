import { aPlat, rechercherAvecPrecisions, requeteAPlat, type ArticleCatalogue } from "../catalogue/catalogue.js";
import { articleCompris, type ArticleCompris, type ProduitCompris } from "./article-compris.js";

/**
 * COMPRENDRE LE LANGAGE DES ARTISANS (Greg, 8 novembre 2026 : « 36 mètres de Lito » doit être compris comme des liteaux,
 * fautes, abréviations et dictée comprises, pour tous les matériaux). Le CODE rapproche les mots de l'artisan du catalogue
 * métier, sans appel IA :
 *  1. la recherche du catalogue (synonymes, mots partiels, une faute par mot) ;
 *  2. sinon, les abréviations du chantier (« ldv », « ba 13 ») et l'écriture au son (« lito » = « liteau », « parpin » =
 *     « parpaing », « pinture » = « peinture »), mot à mot, seulement vers un mot du catalogue ;
 *  3. les produits arrivés premiers, à égalité, sont rendus avec leurs variantes ; le reste (confirmation, questions,
 *     désignation) se joue dans `article-compris.ts`, sans rien inventer.
 * Rien ne correspond : `null`, et la ligne reste telle que l'artisan l'a écrite.
 */

/** Les abréviations et mots du chantier qui ne s'écrivent pas comme au catalogue. Liste courte, chaque entrée vers des mots du catalogue. */
export const ABREVIATIONS: Readonly<Record<string, string>> = {
  ldv: "laine de verre",
  ldr: "laine de roche",
  ldb: "laine de bois",
  ba: "ba13",
  ba13: "ba13",
  ba10: "ba13",
  pvc: "pvc",
  galva: "galvanise",
  alu: "aluminium",
  zing: "zinc",
  zinq: "zinc",
  gout: "gouttiere",
  goutte: "gouttiere",
  dalu: "gouttiere aluminium",
  lito: "liteau",
  litos: "liteau",
  lato: "liteau",
  agglo: "parpaing",
  agglos: "parpaing",
  parpin: "parpaing",
  placo: "placo",
  placos: "placo",
  osb: "osb",
  cp: "contreplaque",
  mdf: "mdf",
  pse: "pse",
  pu: "polyurethane",
  ha: "fer",
  fer: "fer",
};

/** L'écriture au son d'un mot (dictée, fautes d'oreille) : « liteau », « litos », « lito » s'écrivent tous « lito ». */
export function auSon(mot: string): string {
  let m = aPlat(mot);
  if (/\d/.test(m) || m.length < 3) return m;
  m = m
    .replace(/ph/g, "f")
    .replace(/qu/g, "k")
    .replace(/c(?=[aou])/g, "k")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/eaux|eau|aux|au/g, "o")
    .replace(/(?:ain|ein|aim|ein)/g, "in")
    .replace(/(?:ai|ei)/g, "e")
    .replace(/ng$/g, "n")
    .replace(/h/g, "")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/(?:er|et|ez)$/, "e")
    .replace(/[sxtd]$/, "")
    .replace(/e$/, "");
  return m;
}

/** Les mots qui annoncent une mesure sans la donner. */
const ANNONCES = new Set(["diam", "diametre", "dia", "o", "dev", "developpe", "ep", "epaisseur", "section", "longueur", "long", "larg", "largeur", "format", "taille", "ref", "reference", "type", "modele"]);

const VIDES = new Set(["de", "des", "du", "d", "la", "le", "les", "l", "un", "une", "en", "pour", "a", "au", "aux", "et", "avec", "sur", "mon", "ma", "mes"]);

/** Le vocabulaire du catalogue au son : le son d'un mot vers le mot lui-même (le mot du nom du produit d'abord). */
const VOCABULAIRES = new WeakMap<readonly ArticleCatalogue[], { mots: Set<string>; sons: Map<string, string> }>();
function vocabulaire(articles: readonly ArticleCatalogue[]) {
  const garde = VOCABULAIRES.get(articles);
  if (garde) return garde;
  const mots = new Set<string>();
  const sons = new Map<string, string>();
  const ajouter = (texte: string, prioritaire: boolean) => {
    for (const m of aPlat(texte).split(" ")) {
      if (!m || /\d/.test(m)) continue;
      mots.add(m);
      if (m.length < 3) continue;
      const s = auSon(m);
      if (prioritaire || !sons.has(s)) sons.set(s, m);
    }
  };
  for (const a of articles) ajouter(`${a.famille} ${a.synonymes.join(" ")} ${a.designation}`, false);
  for (const a of articles) ajouter(a.produit, true);
  const v = { mots, sons };
  VOCABULAIRES.set(articles, v);
  return v;
}

const singulier = (m: string) => (m.length > 3 && /[sx]$/.test(m) && !/(ss|us)$/.test(m) ? m.slice(0, -1) : m);

/**
 * Les mots de l'artisan ramenés au catalogue : chaque mot connu reste ; une abréviation devient ses mots ; un mot inconnu
 * prend le mot du catalogue qui se prononce pareil. `corrige` dit qu'un mot a été changé (l'interprétation est à confirmer).
 */
export function motsDuCatalogue(dit: string, articles: readonly ArticleCatalogue[]): { requete: string; corrige: boolean } {
  const { mots, sons } = vocabulaire(articles);
  let corrige = false;
  const sortie: string[] = [];
  // « ba 13 », « ba-13 » : un sigle et son nombre font un mot, seulement quand ce mot est connu.
  const brut = requeteAPlat(dit).replace(/\b([a-z]{1,3}) (\d{1,3})\b/g, (t, a: string, n: string) => (mots.has(`${a}${n}`) || ABREVIATIONS[`${a}${n}`] ? `${a}${n}` : t));
  for (const w of brut.split(" ").filter(Boolean)) {
    // Les mots vides et les mots qui annoncent une mesure (« diam », « dév », « ép ») ne désignent rien : le nombre qui suit suffit.
    if (VIDES.has(w) || ANNONCES.has(w)) continue;
    if (/\d/.test(w)) {
      sortie.push(ABREVIATIONS[w] ?? w);
      if (ABREVIATIONS[w] && ABREVIATIONS[w] !== w) corrige = true;
      continue;
    }
    if (mots.has(w) || mots.has(singulier(w))) {
      sortie.push(w);
      continue;
    }
    const abrege = ABREVIATIONS[w] ?? ABREVIATIONS[singulier(w)];
    if (abrege) {
      sortie.push(abrege);
      if (abrege !== w) corrige = true;
      continue;
    }
    const son = w.length >= 3 ? sons.get(auSon(w)) : undefined;
    if (son) {
      sortie.push(son);
      corrige = true;
      continue;
    }
    // Un mot que ni le catalogue, ni les abréviations, ni le son ne connaissent est laissé de côté pour chercher : il reste
    // dans les mots de l'artisan (« dit ») et l'interprétation est à confirmer.
    corrige = true;
  }
  return { requete: sortie.join(" "), corrige };
}

/** Un mot qui désigne (ni nombre, ni mot vide) est-il écrit tel quel dans l'article ? Sinon la recherche l'a rapproché. */
function toutEcritTelQuel(requete: string, a: ArticleCatalogue): boolean {
  const ici = new Set(aPlat(`${a.designation} ${a.famille} ${a.produit} ${a.synonymes.join(" ")}`).split(" ").map(singulier));
  return requete
    .split(" ")
    .filter((w) => w && !/\d/.test(w) && !VIDES.has(w))
    .every((w) => ici.has(singulier(w)) || ANNONCES.has(w));
}

/** Les produits (pas les variantes) d'un résultat, dans l'ordre, chacun avec toutes ses variantes du catalogue. */
function produitsDe(trouves: readonly ArticleCatalogue[], articles: readonly ArticleCatalogue[]): ProduitCompris[] {
  const cles: string[] = [];
  for (const a of trouves) {
    const k = a.produit;
    if (!cles.includes(k)) cles.push(k);
  }
  // Un même produit rangé dans deux métiers (le pare-vapeur du couvreur et du plaquiste) n'est proposé qu'une fois.
  return cles.map((k) => {
    const de = articles.filter((a) => a.produit === k);
    return { metier: de[0]!.metier, famille: de[0]!.famille, produit: de[0]!.produit, unite: de[0]!.unite, variantes: [...new Map(de.map((a) => [a.variante ?? "", { variante: a.variante, designation: a.designation }])).values()] };
  });
}

/**
 * Ce que l'artisan a dit (« Lito », « goutière dév 33 », « ldv 200 ») rapproché du catalogue : un ou plusieurs produits à
 * égalité (six au plus), leurs variantes, ce qui est déjà dit et si c'est sûr ou à confirmer. `null` : rien ne
 * correspond, la ligne reste comme écrite.
 */
/** L'unité dite va-t-elle avec l'unité de vente du produit ? (« 15 m de descente » : le tuyau, pas le coude.) */
function uniteCompatible(dite: string | null | undefined, vente: string): boolean | null {
  if (!dite) return null;
  const d = aPlat(dite);
  const v = aPlat(vente);
  if (/^(m|ml|metres?)$/.test(d)) return /^(m|ml)$|longueur|barre|bobine/.test(v);
  if (/^m2$|^m²$/.test(dite) || d === "m2") return /m2|m²/.test(v) || vente.includes("m²");
  if (/^(pieces?|u|unites?)$/.test(d)) return null;
  return v.startsWith(d.slice(0, 4)) || d.startsWith(v.slice(0, 4));
}

export function comprendreArticle(dit: string, articles: readonly ArticleCatalogue[], unite?: string | null): ArticleCompris | null {
  // « 4m », « 200mm » : le nombre et son unité se séparent pour se lire comme au catalogue (« 4 m », « 200 mm »).
  const texte = dit.trim().replace(/(\d)(mm|cm|m|l|kg)\b/gi, "$1 $2");
  if (!texte || !/[a-z]/i.test(aPlat(texte))) return null;
  const essayer = (q: string) => rechercherAvecPrecisions(articles, q, 60);
  let corrige = false;
  let requete = requeteAPlat(texte);
  let trouves = essayer(requete);
  if (!trouves.length || !toutEcritTelQuel(requete, trouves[0]!.article)) {
    const r = motsDuCatalogue(texte, articles);
    const autres = r.requete !== requete ? essayer(r.requete) : [];
    if (autres.length && (!trouves.length || autres[0]!.score > trouves[0]!.score)) {
      trouves = autres;
      requete = r.requete;
      corrige = r.corrige;
    }
  }
  if (!trouves.length) return null;
  const meilleur = trouves[0]!.score;
  let premiers = trouves.filter((t) => t.score >= meilleur - 0.001);
  const tousLesPremiers = premiers;
  // Une marque ne se propose que si l'artisan la nomme : sans elle, l'article générique du comptoir passe seul.
  const generiques = premiers.filter((t) => !t.article.marque);
  if (generiques.length && generiques.length < premiers.length) premiers = generiques;
  // Le mot de l'artisan est un synonyme ENTIER d'un article (« placo » = la plaque, pas « vis placo ») : cet article d'abord.
  const designants = requete.split(" ").filter((w) => w && !/\d/.test(w) && !VIDES.has(w) && !ANNONCES.has(w));
  const phrase = designants.join(" ");
  const entier = premiers.filter((t) => [t.article.produit, ...t.article.synonymes].some((x) => singulier(aPlat(x)) === singulier(phrase) || aPlat(x) === phrase));
  if (entier.length && entier.length < premiers.length) premiers = entier;
  // Puis le produit qui ajoute le moins de mots à ce qui est dit (« crochet inox » : pas le « teinté noir »).
  const ajoutes = (t: (typeof premiers)[number]) => aPlat(t.article.produit).split(" ").filter((m) => m && !VIDES.has(m) && !/\d/.test(m) && !designants.some((d) => singulier(d) === singulier(m))).length;
  const moins = Math.min(...premiers.map(ajoutes));
  if (designants.length) premiers = premiers.filter((t) => ajoutes(t) === moins);
  // L'unité dite départage : « 15 m de descente zinc » est le tuyau, vendu en longueurs, pas le coude.
  const vaAvec = premiers.filter((t) => uniteCompatible(unite, t.article.unite) === true);
  if (vaAvec.length && vaAvec.length < premiers.length) premiers = vaAvec;
  const retenus = produitsDe(
    premiers.map((t) => t.article),
    articles,
  ).slice(0, 6);
  // Les autres articles à égalité restent proposés si l'artisan répond « Non » (jamais choisis en silence).
  const autres = produitsDe(
    tousLesPremiers.map((t) => t.article),
    articles,
  ).filter((p) => !retenus.some((r) => r.produit === p.produit));
  const sur = !corrige && toutEcritTelQuel(requete, premiers[0]!.article);
  return articleCompris(texte, sur ? "sur" : "probable", retenus, premiers[0]!.precisions, autres.slice(0, Math.max(0, 6 - retenus.length)));
}
