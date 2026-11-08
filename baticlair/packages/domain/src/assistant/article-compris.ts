/**
 * L'ARTICLE COMPRIS PAR L'ASSISTANT (Greg, 8 novembre 2026 : « 36 mètres de Lito » doit donner « Tu veux dire 36 mètres
 * linéaires de liteaux ? », puis une question sur la section avec des choix pertinents, pour tous les matériaux).
 *
 * Ce fichier n'a AUCUN import : le site s'en sert tel quel. Le serveur rapproche les mots de l'artisan du catalogue métier
 * (`comprendreArticle`, `comprehension.ts`) et rend un `ArticleCompris` : les produits possibles et leurs variantes, telles
 * qu'écrites au catalogue. Ici, le code pose les questions UNE PAR UNE et écrit la désignation finale :
 *  - jamais un nom d'article fabriqué : la désignation est celle du catalogue, ou le nom du produit du catalogue suivi des
 *    choix de l'artisan (ses mots à lui pour « Autre ») ;
 *  - jamais une quantité ni une unité inventée : celles dites, telles quelles ;
 *  - une caractéristique déjà dite n'est jamais redemandée ; une question ne propose que des valeurs du catalogue qui
 *    existent avec les choix déjà faits ;
 *  - l'artisan garde la main : « Non, garder mes mots », « Passer » et, à la fin, « Ajouter à ma liste ».
 */

export interface VarianteComprise {
  /** Format, dimension ou qualité, morceaux séparés par « · » (« 18×40 · sapin traité classe 2 ») ; null : le produit seul. */
  variante: string | null;
  designation: string;
}

export interface ProduitCompris {
  metier: string;
  famille: string;
  produit: string;
  /** L'unité de vente du catalogue (« m », « pièces », « sacs »…) : sert à dire la phrase, jamais à convertir. */
  unite: string;
  variantes: VarianteComprise[];
}

export interface ArticleCompris {
  /** Les mots de l'artisan, tels qu'écrits ou dictés. */
  dit: string;
  /** « sur » : chaque mot de l'artisan est au catalogue ; « probable » : un mot a été rapproché (faute, dictée, abréviation). */
  certitude: "sur" | "probable";
  /** Un seul produit, ou plusieurs à égalité (« gouttière » : demi-ronde zinc, havraise, PVC…). */
  produits: ProduitCompris[];
  /** Les autres articles à égalité, proposés seulement si l'artisan répond « Non » à l'interprétation. */
  autres?: ProduitCompris[];
  /** Le produit choisi (d'office quand il est seul). */
  choixProduit: number | null;
  /** Une valeur par question de variante : déduite des mots de l'artisan, choisie, écrite (« Autre ») ou passée (""). */
  valeurs: (string | null)[];
  /** Les mots de l'artisan qui précisent sans être au catalogue (« rouge » pour « H14 rouge »). */
  precisions: string[];
  /** L'artisan a confirmé l'interprétation (« Oui ») ; d'office quand elle est sûre. */
  confirme: boolean;
}

export interface Axe {
  question: string;
  valeurs: string[];
  /** Le produit existe aussi sans cette précision : « Passer » la laisse au négoce. */
  facultatif: boolean;
}

const plat = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/(\d)\s*[x/]\s*(\d)/g, "$1x$2")
    .replace(/\b(\d{1,3}) (\d{2,3})\b/g, "$1x$2")
    .replace(/(\d)(mm|cm|m|l|kg)\b/g, "$1 $2")
    .replace(/[^a-z0-9,.x°ø ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const morceaux = (v: VarianteComprise, n: number): (string | null)[] => (v.variante === null ? Array.from({ length: n }, () => null) : n === 1 ? [v.variante] : v.variante.split(" · "));

/** Le nombre de questions d'un produit : les morceaux de ses variantes quand elles en ont toutes autant, sinon une seule. */
function nombreDAxes(p: ProduitCompris): number {
  const comptes = new Set(p.variantes.filter((v) => v.variante !== null).map((v) => v.variante!.split(" · ").length));
  if (comptes.size === 0) return 0;
  return comptes.size === 1 ? [...comptes][0]! : 1;
}

/** La question d'une caractéristique, avec les mots du comptoir, tirée de ses valeurs. */
function questionDe(valeurs: readonly string[], p: ProduitCompris): string {
  const tous = (re: RegExp) => valeurs.every((v) => re.test(v));
  const un = (re: RegExp) => valeurs.some((v) => re.test(v));
  if (tous(/^\d+(?:[,.]\d+)?\s*[×x]\s*\d+/)) return /bois|charpente|liteau|chevron|tasseau|latte|madrier|bastaing|planche/i.test(`${p.famille} ${p.produit}`) ? "Quelle section ?" : "Quel format ?";
  if (tous(/^dév\.?/i)) return "Quel développé ?";
  if (tous(/^Ø/)) return "Quel diamètre ?";
  if (tous(/^largeur/i)) return "Quelle largeur ?";
  if (tous(/^\d+(?:[,.]\d+)?\s*mm$/)) return "Quelle épaisseur ?";
  if (tous(/^\d+(?:[,.]\d+)?\s*m$/)) return "Quelle longueur ?";
  if (tous(/^\d+(?:[,.]\d+)?\s*(?:L|ml|kg)\b/)) return "Quel conditionnement ?";
  if (un(/trait|classe \d/i)) return "Quel traitement ?";
  if (un(/naturel|prépatiné|laqué|galvanisé/i)) return "Quel aspect ?";
  if (un(/\b(?:mat|satin|velours|brillant)\b/i)) return "Quelle finition ?";
  if (un(/choix/i)) return "Quelle origine et quel choix ?";
  if (tous(/^\d+(?:[,.]\d+)?\s*cm$/)) return "Quelle épaisseur ?";
  if (un(/gauche|droit/i)) return "Quel sens ?";
  return "Lequel ?";
}

/** Les questions de variante d'un produit, avec les seules valeurs qui existent avec ce qui est déjà choisi. */
export function axesDe(p: ProduitCompris, valeurs: readonly (string | null)[] = []): Axe[] {
  const n = nombreDAxes(p);
  const facultatif = p.variantes.some((v) => v.variante === null);
  return Array.from({ length: n }, (_, i) => {
    const possibles = p.variantes.filter((v) => v.variante !== null && morceaux(v, n).every((m, j) => j === i || !valeurs[j] || m === valeurs[j]));
    const vals = [...new Set(possibles.map((v) => morceaux(v, n)[i]!))];
    const toutes = [...new Set(p.variantes.filter((v) => v.variante !== null).map((v) => morceaux(v, n)[i]!))];
    return { question: questionDe(toutes, p), valeurs: vals.length ? vals : toutes, facultatif };
  });
}

/**
 * Les caractéristiques déjà dites par l'artisan (« liteaux 27x40 », « gouttière dév 33 », « liteau non traité ») : une
 * valeur est retenue quand elle est la seule à reprendre le plus de mots de l'artisan. Jamais une valeur devinée.
 */
export function valeursDites(dit: string, p: ProduitCompris): (string | null)[] {
  const n = nombreDAxes(p);
  const motsDits = new Set(plat(dit).replace(/\bdev\b\.?\s*/g, "dev ").split(" ").filter(Boolean));
  const motsDuProduit = new Set(plat(`${p.produit} ${p.famille}`).split(" "));
  const valeurs: (string | null)[] = Array.from({ length: n }, () => null);
  for (let i = 0; i < n; i++) {
    const vals = axesDe(p, valeurs)[i]!.valeurs;
    const notes = vals.map((v) => {
      const ms = plat(v).replace(/\bdev\b\.?\s*/g, "dev ").split(" ").filter((m) => m && !motsDuProduit.has(m));
      // « parpaing de 20 » : un nombre dit seul vaut la dimension qui COMMENCE par lui (20×20×50), jamais une autre.
      return { v, note: ms.filter((m, k) => motsDits.has(m) || motsDits.has(m.replace(/\.$/, "")) || (k === 0 && /^\d+x/.test(m) && motsDits.has(m.split("x")[0]!))).length };
    });
    const max = Math.max(0, ...notes.map((x) => x.note));
    const meilleures = notes.filter((x) => x.note === max);
    if (max > 0 && meilleures.length === 1) valeurs[i] = meilleures[0]!.v;
  }
  return valeurs;
}

export type Etape =
  | { type: "confirmer"; phrase: string }
  | { type: "produit"; question: string; choix: string[] }
  | { type: "caracteristique"; index: number; question: string; choix: string[]; facultatif: boolean }
  | null;

/** Ce qu'il reste à demander, une chose à la fois : confirmer, choisir le produit, puis chaque caractéristique. */
export function etapeSuivante(c: ArticleCompris, quantite: string | null, unite: string | null): Etape {
  // Plusieurs articles possibles : le choix de l'un d'eux vaut confirmation (« Non, garder mes mots » reste possible).
  if (c.choixProduit === null) return { type: "produit", question: c.confirme ? "Lequel exactement ?" : `« ${c.dit} » : tu veux dire lequel ?`, choix: c.produits.map((p) => p.produit) };
  if (!c.confirme) return { type: "confirmer", phrase: phraseDeConfirmation(c, quantite, unite) };
  const p = c.produits[c.choixProduit]!;
  const axes = axesDe(p, c.valeurs);
  for (let i = 0; i < axes.length; i++) if (c.valeurs[i] === null || c.valeurs[i] === undefined) return { type: "caracteristique", index: i, question: axes[i]!.question, choix: axes[i]!.valeurs.slice(0, 8), facultatif: true };
  return null;
}

/** « Oui » : l'interprétation est la bonne. */
export const confirmer = (c: ArticleCompris): ArticleCompris => ({ ...c, confirme: true });

/**
 * « Non » : l'interprétation proposée n'est pas la bonne. S'il reste d'autres articles possibles, ils sont proposés au
 * choix ; sinon `null` : la ligne garde les mots de l'artisan.
 */
export function refuser(c: ArticleCompris): ArticleCompris | null {
  const refuses = c.choixProduit !== null ? [c.produits[c.choixProduit]!.produit] : c.produits.map((p) => p.produit);
  const restants = [...c.produits, ...(c.autres ?? [])].filter((p) => !refuses.includes(p.produit));
  if (!restants.length) return null;
  return { ...c, produits: restants, autres: [], choixProduit: null, valeurs: [], confirme: false };
}

/** Le produit choisi parmi ceux à égalité ; ses caractéristiques déjà dites sont reprises. */
export function choisirProduit(c: ArticleCompris, i: number): ArticleCompris {
  return choisirProduitSans(c, i, true);
}

function choisirProduitSans(c: ArticleCompris, i: number, confirme: boolean): ArticleCompris {
  const p = c.produits[i];
  if (!p) return c;
  // Une caractéristique qui n'a qu'une valeur au catalogue (le polyane « 4 × 25 m ») est celle de l'article : rien à demander.
  const axes = axesDe(p);
  const valeurs = valeursDites(c.dit, p).map((v, j) => v ?? (axes[j] && !axes[j]!.facultatif && axes[j]!.valeurs.length === 1 ? axes[j]!.valeurs[0]! : null));
  return { ...c, choixProduit: i, confirme: confirme || c.confirme, valeurs };
}

/** Une caractéristique : une valeur du catalogue, les mots de l'artisan (« Autre »), ou "" (« Passer »). */
export function choisirValeur(c: ArticleCompris, index: number, valeur: string): ArticleCompris {
  const valeurs = [...c.valeurs];
  valeurs[index] = valeur.trim();
  return { ...c, valeurs };
}

/**
 * La désignation qui part dans la liste : celle du catalogue quand toutes les caractéristiques sont choisies parmi ses
 * valeurs ; sinon le nom du produit du catalogue suivi des choix (et des mots de l'artisan pour « Autre ») ; jamais rien
 * d'autre. Sans produit retenu : les mots de l'artisan tels quels.
 */
export function designationFinale(c: ArticleCompris): string {
  if (c.choixProduit === null) return c.dit;
  const p = c.produits[c.choixProduit]!;
  const n = nombreDAxes(p);
  const choisies = c.valeurs.slice(0, n);
  const exacte = p.variantes.find((v) => (v.variante === null ? choisies.every((x) => !x) : morceaux(v, n).every((m, j) => m === choisies[j])));
  const precisions = c.precisions.length ? ` ${c.precisions.join(" ")}` : "";
  if (exacte) return `${exacte.designation}${precisions}`;
  const dits = choisies.filter((x): x is string => !!x);
  return `${p.produit}${dits.length ? ` ${dits.join(" · ")}` : ""}${precisions}`;
}

const VOYELLE = /^[aeiouyhâàéèêîïôûœ]/i;
const nombreLisible = (q: string) => (/^\d+$/.test(q) ? Number(q).toLocaleString("fr-FR").replace(/ | /g, " ") : q.replace(".", ","));

/** Le nom du produit dans une phrase : en minuscules (sauf un sigle), au pluriel quand il se compte. */
export function nomDansLaPhrase(produit: string, pluriel: boolean): string {
  const [tete, ...reste] = produit.split(" ");
  const sigle = /^[A-Z0-9]{2,}$/.test(tete!);
  const auPluriel = (m: string) => (/[sxz]$/i.test(m) ? m : /(?:eau|au|eu)$/i.test(m) ? `${m}x` : `${m}s`);
  const t = sigle ? tete! : tete!.charAt(0).toLowerCase() + tete!.slice(1);
  if (!pluriel || sigle) return [t, ...reste].join(" ");
  // Le nom et les adjectifs qui le suivent (« ardoises naturelles », « pointes torsadées »), jusqu'au premier complément.
  const suite: string[] = [];
  let accorde = true;
  for (const m of reste) {
    if (/^(?:de|d'|du|des|en|pour|à|a|sur|avec|sans)$/i.test(m) || /^d'/i.test(m) || /\d|[A-Z(]/.test(m)) accorde = false;
    suite.push(accorde && /(?:e|é)$/i.test(m) ? auPluriel(m) : m);
  }
  return [auPluriel(t), ...suite].join(" ");
}

/** « Tu veux dire 36 mètres linéaires de liteaux ? » : la quantité et l'unité DITES, le nom du catalogue. */
export function phraseDeConfirmation(c: ArticleCompris, quantite: string | null, unite: string | null): string {
  const p = c.choixProduit !== null ? c.produits[c.choixProduit]! : null;
  if (!p) {
    const noms = c.produits.slice(0, 3).map((x) => nomDansLaPhrase(x.produit, false));
    return `« ${c.dit} » : tu parles de ${noms.join(", ")}${c.produits.length > 3 ? "…" : ""} ?`;
  }
  const lineaire = (unite === "m" || unite === "ml") && /^(?:m|ml|m linéaires?|longueurs?)/i.test(p.unite);
  const compte = !unite || unite === "pièces" || lineaire;
  const n = quantite ? Number(quantite.replace(",", ".")) : NaN;
  const nom = nomDansLaPhrase(p.produit, compte && (!quantite || n > 1));
  if (!quantite) return `Tu veux dire des ${nom} ?`;
  const u = lineaire ? (n > 1 ? "mètres linéaires" : "mètre linéaire") : unite === "pièces" || !unite ? "" : unite;
  const de = u ? (VOYELLE.test(nom) ? " d'" : " de ") : " ";
  return `Tu veux dire ${nombreLisible(quantite)}${u ? ` ${u}` : ""}${de}${nom} ?`.replace(/ {2,}/g, " ").replace(" d' ", " d'");
}

/** Un article neuf, à partir de ce que le serveur a rapproché : sûr = confirmé d'office, un seul produit = choisi d'office. */
export function articleCompris(dit: string, certitude: "sur" | "probable", produits: ProduitCompris[], precisions: string[] = [], autres: ProduitCompris[] = []): ArticleCompris {
  const seul = produits.length === 1;
  const base: ArticleCompris = { dit, certitude, produits, choixProduit: null, valeurs: [], precisions, confirme: certitude === "sur", ...(autres.length ? { autres } : {}) };
  return seul ? choisirProduitSans(base, 0, false) : base;
}
