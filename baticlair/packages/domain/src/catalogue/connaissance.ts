import { aPlat, LIBELLES_METIERS_CATALOGUE, METIERS_CATALOGUE, type ArticleCatalogue, type MetierCatalogue } from "./catalogue.js";
import { cheminsDeLArticle, nomDeCaracteristique, SANS_PRECISION, vueDuCatalogue, type ChoixDeVue, type PrecisionLibre, type ProduitDeVue } from "./rayons.js";

/**
 * LA CONNAISSANCE MÉTIER D'UN ARTICLE (Greg, 13 novembre 2026, « cœur métier » : « le cœur de Mobiiz ne doit pas être
 * seulement une liste de noms […] Ne jamais inventer une quantité, une dimension, une compatibilité, une norme, une règle
 * de calcul, un rendement, une obligation technique »). Tout ce qui est dit ici est LU dans le catalogue : le métier, la
 * famille, les mots, l'unité, les caractéristiques que les articles portent réellement, la source quand elle existe. Ce
 * qui n'y est pas n'est pas dit : pas de compatibilité, pas de norme, pas de rendement tant qu'aucune donnée vérifiée ne
 * les porte. L'artisan, l'admin et l'assistant lisent la même fiche.
 */
type ArticleConnu = Pick<ArticleCatalogue, "cle" | "metier" | "famille" | "produit" | "variante" | "designation" | "unite" | "synonymes"> &
  Partial<Pick<ArticleCatalogue, "statut" | "source" | "marque">> & { metiersSecondaires?: readonly string[] | null; masque?: boolean; aVerifier?: boolean };

export interface QuestionMetier {
  /** La caractéristique demandée (« Matériau », « Développé »). */
  caracteristique: string;
  /** La question telle que l'artisan la lit, au tutoiement. */
  question: string;
  /** Les valeurs du catalogue (jamais une valeur inventée). */
  choix: string[];
  /** Vrai : la valeur désigne l'article. Faux : une précision libre, utile au négoce. */
  indispensable: boolean;
  /** Toujours vrai : l'artisan peut répondre « Laisser à préciser ». */
  peutAttendre: true;
}

export interface FicheArticle {
  cle: string;
  designation: string;
  produit: string;
  metierPrincipal: { code: string; libelle: string };
  metiersSecondaires: { code: string; libelle: string }[];
  famille: string;
  sousFamille: string | null;
  synonymes: string[];
  /** L'unité de commande du catalogue (une seule par article). */
  unite: string;
  /** Ce que l'article précise déjà (« Finition : naturel », « Épaisseur : 0,65 mm »). */
  caracteristiques: { nom: string; valeur: string }[];
  /** Les caractéristiques qui désignent l'article dans son produit (à choisir pour l'atteindre). */
  indispensables: string[];
  /** Les précisions libres que le négoce apprécie (teinte, gamme) : écrites par l'artisan, jamais imposées. */
  facultatives: string[];
  statut: "actif" | "masque" | "a_verifier";
  /** La source quand elle existe (fabricant, référentiel) ; null : désignation générique du comptoir. */
  source: { libelle: string; url?: string; verifieLe: string } | null;
}

const QUESTIONS: Readonly<Record<string, string>> = {
  Matériau: "Quelle matière ?",
  Développé: "Quel développé ?",
  Diamètre: "Quel diamètre ?",
  Épaisseur: "Quelle épaisseur ?",
  Longueur: "Quelle longueur ?",
  Largeur: "Quelle largeur ?",
  Format: "Quel format ?",
  Finition: "Quelle finition ?",
  Conditionnement: "Quel conditionnement ?",
  Traitement: "Quel traitement ?",
  Angle: "Quel angle ?",
  Calibre: "Quel calibre ?",
  Section: "Quelle section ?",
  Sélection: "Quelle sélection ?",
  Gamme: "Quelle gamme ?",
  Modèle: "Quel modèle ?",
};
export const questionDe = (caracteristique: string) => QUESTIONS[caracteristique] ?? `${caracteristique} ?`;

const estMetier = (m: string): m is MetierCatalogue => (METIERS_CATALOGUE as readonly string[]).includes(m);
const feuilles = <T>(n: ChoixDeVue<T> | null): T[] => (n ? n.options.flatMap((o) => (o.suite ? feuilles(o.suite) : [o.article!])) : []);

/** Le produit de la vue qui porte un article (dans le catalogue de son métier), avec sa famille et sa sous-famille. */
function produitDe<T extends ArticleConnu>(a: T, tous: readonly T[]): { famille: string; sousFamille: string | null; produit: ProduitDeVue<T> } | null {
  if (!estMetier(a.metier)) return null;
  for (const r of vueDuCatalogue(a.metier, tous))
    for (const f of r.familles)
      for (const p of f.produits) if ((p.article ? [p.article] : feuilles(p.choix)).some((x) => x.cle === a.cle)) return { famille: r.libelle, sousFamille: r.familles.length > 1 ? f.libelle : null, produit: p };
  return null;
}

/** Le chemin de choix qui mène à un article : les caractéristiques nommées et leurs valeurs (« Matériau : zinc »). */
function cheminVers<T extends { cle: string }>(n: ChoixDeVue<T> | null, cle: string): { nom: string; valeur: string }[] | null {
  if (!n) return null;
  for (const o of n.options) {
    if (o.article?.cle === cle) return [{ nom: n.nom, valeur: o.valeur }];
    const suite = cheminVers(o.suite, cle);
    if (suite) return [{ nom: n.nom, valeur: o.valeur }, ...suite];
  }
  return null;
}

export function ficheArticle<T extends ArticleConnu>(a: T, tous: readonly T[]): FicheArticle {
  const place = produitDe(a, tous);
  const chemins = estMetier(a.metier) ? cheminsDeLArticle({ ...a, metier: a.metier }) : [];
  const connues = (place ? cheminVers(place.produit.choix, a.cle) : null) ?? (a.variante ? a.variante.split(" · ").map((v) => ({ nom: nomDeCaracteristique([v]), valeur: v })) : []);
  return {
    cle: a.cle,
    designation: a.designation,
    produit: place?.produit.libelle ?? a.produit,
    metierPrincipal: { code: a.metier, libelle: estMetier(a.metier) ? LIBELLES_METIERS_CATALOGUE[a.metier] : a.metier },
    metiersSecondaires: chemins.slice(1).map((c) => ({ code: c.catalogue, libelle: c.libelleCatalogue })),
    famille: place?.famille ?? chemins[0]?.rayon ?? a.famille,
    sousFamille: place?.sousFamille ?? null,
    synonymes: [...a.synonymes],
    unite: a.unite,
    caracteristiques: connues.filter((c) => c.valeur !== SANS_PRECISION),
    indispensables: place?.produit.caracteristiques ?? [],
    facultatives: (place?.produit.precisions ?? []).map((p: PrecisionLibre) => p.nom),
    statut: a.masque ? "masque" : a.aVerifier ? "a_verifier" : "actif",
    source: a.source ?? null,
  };
}

export interface SuiteDeQuestions<T> {
  /** Ce que les mots de l'artisan disaient déjà : jamais redemandé. */
  deduites: { nom: string; valeur: string }[];
  /** La prochaine question utile, ou null quand il n'en reste pas. */
  question: QuestionMetier | null;
  /** L'article atteint quand tout est dit ; null tant qu'une caractéristique indispensable manque. */
  article: T | null;
}

/** Une valeur du catalogue est-elle écrite dans les mots de l'artisan ? (« 0,65 mm » dans « bobine zinc 0.65 ») */
function ditDans(valeur: string, dit: string): boolean {
  const v = aPlat(valeur).replace(/^(dev|largeur|barre|rouleau) /, "");
  if (!v) return false;
  const texte = ` ${aPlat(dit)} `;
  if (texte.includes(` ${v} `)) return true;
  // « 0.65 mm » dit « 0.65 », « dév. 33 » dit « 33 » : le nombre seul suffit quand la valeur n'en porte qu'un.
  const nombres = v.match(/\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)*/g) ?? [];
  return nombres.length === 1 && /[a-z]/.test(v) && texte.includes(` ${nombres[0]} `) && !/[a-z]{4,}/.test(v.replace(/\b(mm|cm|m|kg|l|ml)\b/g, ""));
}

/**
 * LES QUESTIONS UTILES D'UN PRODUIT (Greg, 13 novembre 2026 : « une question ne doit apparaître que si la réponse améliore
 * réellement la demande de prix […] les caractéristiques déjà indiquées par l'artisan ne doivent pas être redemandées […]
 * l'artisan doit toujours pouvoir choisir Laisser à préciser »). On descend dans les choix du produit : une valeur écrite
 * dans les mots de l'artisan est prise sans être demandée ; la première qui manque devient LA question (une à la fois : la
 * suivante dépend de la réponse). Quand tout est dit, l'article est atteint et il ne reste que les précisions libres
 * « utiles » qui ne sont pas déjà écrites. Jamais une valeur inventée : les choix sont ceux du catalogue.
 */
export function questionsUtiles<T>(produit: Pick<ProduitDeVue<T>, "article" | "choix" | "precisions">, dit: string, reponses: Readonly<Record<string, string>> = {}): SuiteDeQuestions<T> {
  const deduites: { nom: string; valeur: string }[] = [];
  let n = produit.choix;
  let article = produit.article;
  while (n) {
    const options = n.options;
    const repondue = reponses[n.nom];
    const trouvees = repondue !== undefined ? options.filter((o) => o.valeur === repondue) : options.filter((o) => o.valeur !== SANS_PRECISION && ditDans(o.valeur, dit));
    if (trouvees.length !== 1) {
      return { deduites, question: { caracteristique: n.nom, question: questionDe(n.nom), choix: options.map((o) => o.valeur), indispensable: true, peutAttendre: true }, article: null };
    }
    const o = trouvees[0]!;
    deduites.push({ nom: n.nom, valeur: o.valeur });
    article = o.article;
    n = o.suite;
  }
  const libre = produit.precisions.find((p) => p.niveau === "utile" && reponses[p.nom] === undefined && !new RegExp(`\\b${aPlat(p.nom)}\\b`).test(aPlat(dit)));
  return { deduites, question: libre ? { caracteristique: libre.nom, question: questionDe(libre.nom), choix: [], indispensable: false, peutAttendre: true } : null, article };
}
