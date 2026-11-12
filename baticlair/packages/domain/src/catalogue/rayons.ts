import { LIBELLES_METIERS_CATALOGUE, METIERS_DU_SELECTEUR, rayonDuMetierCatalogue, type ArticleCatalogue, type MetierCatalogue } from "./catalogue.js";

/**
 * LES CATALOGUES PROFESSIONNELS PAR MÉTIER (Greg, 12 novembre 2026 : « Mobiiz doit fonctionner comme une bibliothèque de
 * catalogues professionnels […] Métier › Rayon ou ouvrage › Famille de produits › Produit › Caractéristiques et variantes ›
 * Quantité et unité […] Une catégorie « Zinc » ne doit jamais afficher du cuivre, de l'aluminium ou de l'inox »).
 *
 * UN CATALOGUE EST UNE VUE, PAS UNE COPIE. Les articles ne bougent pas : même clé, même métier, même famille, même
 * désignation, même unité (les anciens quantitatifs, les achats groupés et la base restent identiques). Ce fichier RANGE
 * les articles existants : chaque catalogue (une entrée du sélecteur) a ses rayons, chaque rayon ses familles, chaque
 * famille « prend » des articles par leur métier, leur ancienne famille et, au besoin, le nom du produit. Un article peut
 * être pris par plusieurs catalogues (un isolant sous Couverture et sous Plaques de plâtre) : une seule fiche, plusieurs
 * rattachements. Les articles d'un même produit qui ne diffèrent que par la matière (« Bobine de zinc », « Bobine de
 * cuivre ») se lisent comme UN produit (« Bobine ») dont la matière est la première caractéristique ; les formats de
 * l'article (« naturel · 0,65 mm · largeur 500 mm ») deviennent ses caractéristiques à choisir, une à une.
 *
 * Rien n'est inventé : une caractéristique à choisir n'existe que parce que des articles du catalogue la portent. Les
 * précisions libres (teinte, couleur) s'ajoutent à la désignation, sans créer d'article.
 */

/** Ce qu'une famille prend : le métier de l'article, son ancienne famille (ou toutes), et au besoin le nom du produit. */
type Prise = readonly [metier: MetierCatalogue, famille: string | null, produit?: RegExp];

/** Des produits qui ne diffèrent que par un mot de leur nom (la matière, la gamme) se lisent comme un seul produit. */
interface Fusion {
  nom: string;
  /** Le premier groupe trouvé donne la valeur de la caractéristique (« zinc », « cuivre »). */
  motif: RegExp;
  caracteristique: string;
}

export type NiveauDePrecision = "obligatoire" | "utile" | "facultative";
/** Une précision libre, écrite par l'artisan (jamais un article de plus) : « utile » se propose, « facultative » se replie. */
export interface PrecisionLibre {
  nom: string;
  niveau: Exclude<NiveauDePrecision, "obligatoire">;
  exemple?: string;
}

interface FamilleDef {
  libelle: string;
  prend: readonly Prise[];
  fusions?: readonly Fusion[];
  precisions?: readonly PrecisionLibre[];
}
interface RayonDef {
  libelle: string;
  familles: readonly FamilleDef[];
}

const f = (libelle: string, prend: readonly Prise[], o: Pick<FamilleDef, "fusions" | "precisions"> = {}): FamilleDef => ({ libelle, prend, ...o });
/** Un rayon d'une seule famille (les petits catalogues) : l'écran passe droit aux produits. */
const seul = (libelle: string, prend: readonly Prise[], o: Pick<FamilleDef, "fusions" | "precisions"> = {}): RayonDef => ({ libelle, familles: [f(libelle, prend, o)] });

const TEINTE: PrecisionLibre = { nom: "Teinte", niveau: "utile", exemple: "RAL 7016, blanc cassé…" };
const SUPPORT: PrecisionLibre = { nom: "Support", niveau: "facultative", exemple: "plâtre, bois, métal…" };
const COULEUR: PrecisionLibre = { nom: "Couleur", niveau: "facultative", exemple: "blanc, anthracite…" };
const GAMME: PrecisionLibre = { nom: "Gamme", niveau: "facultative", exemple: "la gamme que tu poses d'habitude" };

/** Le nom d'un métal ou d'une matière, tel qu'il s'écrit dans les produits de zinguerie. */
const MATIERE = "(zinc|cuivre|PVC|aluminium(?: laqué)?|acier laqué|acier galvanisé|inox(?: étamé)?|plomb)";

export const CATALOGUES: Readonly<Partial<Record<MetierCatalogue, readonly RayonDef[]>>> = {
  couverture: [
    {
      libelle: "Couverture",
      familles: [
        f("Ardoises", [["couverture", "Ardoises"]], {
          fusions: [
            { nom: "Ardoise naturelle CUPA (Cupa Pizarras)", motif: /^Ardoise naturelle (CUPA \d+) \(Cupa Pizarras\)$/, caracteristique: "Sélection" },
            { nom: "Ardoise fibres-ciment Cedral", motif: /^Ardoise fibres-ciment (.+) \(Cedral\)$/, caracteristique: "Gamme" },
          ],
        }),
        f("Tuiles terre cuite canal", [["couverture", "Tuiles terre cuite", /canal/i]]),
        f("Tuiles terre cuite plates", [["couverture", "Tuiles terre cuite", /plate/i]]),
        f("Tuiles terre cuite à emboîtement", [["couverture", "Tuiles terre cuite"]]),
        f("Tuiles béton", [["couverture", "Tuiles béton"]]),
        f("Accessoires de tuiles", [["couverture", "Accessoires de tuiles"]]),
        f("Bacs et plaques", [["couverture", "Bacs et plaques"]]),
        f("Bardeaux, pierre et bois", [["couverture", "Bardeaux bitumés"], ["couverture", "Couvertures de pierre et de bois"]]),
        f("Écrans et pare-vapeur", [["couverture", "Écrans et pare-vapeur"], ["charpente", "Écrans et membranes"]]),
        f("Isolation", [["couverture", "Isolation de toiture"], ["platrerie_isolation", "Isolants"]]),
        f("Bois de couverture", [["couverture", "Bois de couverture"]]),
        f("Faîtage et ventilation", [["couverture", "Faîtage et ventilation"]]),
        f("Fenêtres et sorties de toit", [["couverture", "Fenêtres de toit"], ["couverture", "Sorties de toit"]]),
        f("Fixations et accessoires", [["couverture", "Fixations"]]),
        f("Sécurité, accès et entretien", [["couverture", "Sécurité et accès"], ["couverture", "Entretien de toiture"]]),
      ],
    },
    {
      libelle: "Zinguerie",
      familles: [
        f("Gouttières et chéneaux", [["zinguerie", "Gouttières", /^(Gouttière|Chéneau)/]], {
          fusions: [
            { nom: "Gouttière demi-ronde", motif: new RegExp(`^Gouttière (?:demi-ronde ${MATIERE}|${MATIERE} demi-ronde)$`), caracteristique: "Matériau" },
            { nom: "Gouttière carrée", motif: new RegExp(`^Gouttière (?:carrée ${MATIERE}|${MATIERE} carrée)$`), caracteristique: "Matériau" },
          ],
        }),
        f("Accessoires de gouttière", [["zinguerie", "Gouttières"]], {
          fusions: [{ nom: "Naissance de gouttière", motif: new RegExp(`^Naissance de gouttière ${MATIERE}$`), caracteristique: "Matériau" }],
        }),
        f("Descentes et eaux pluviales", [["zinguerie", "Descentes"]], {
          fusions: [
            { nom: "Tuyau de descente", motif: new RegExp(`^Tuyau de descente ${MATIERE}$`), caracteristique: "Matériau" },
            { nom: "Coude de descente", motif: new RegExp(`^Coude de descente ${MATIERE}$`), caracteristique: "Matériau" },
          ],
        }),
        f("Couverture métallique et joint debout", [["zinguerie", "Zinc", /joint debout|tasseau|couvre-joint|sous zinc/i]]),
        f("Feuilles, bobines, bobineaux et bandes", [["zinguerie", "Zinc"], ["couverture", "Étanchéité", /plomb/i]], {
          fusions: [
            { nom: "Feuille ou tôle 2 × 1 m", motif: /^(?:Feuille de|Tôle) (.+) 2 × 1 m$/, caracteristique: "Matériau" },
            { nom: "Bobine", motif: /^Bobine de (.+)$/, caracteristique: "Matériau" },
            { nom: "Bobineau", motif: /^Bobineau de (.+)$/, caracteristique: "Matériau" },
          ],
        }),
        f("Solins, bavettes et rives", [["zinguerie", "Bandes et pièces façonnées", /rive|égout|solin|noue|faîtage|ourlet|agrafe|noquet/i], ["couverture", "Étanchéité", /solin/i]]),
        f("Habillages", [["zinguerie", "Bandes et pièces façonnées"]]),
        f("Soudure et consommables", [["zinguerie", "Soudure"], ["couverture", "Étanchéité"]]),
      ],
    },
    {
      libelle: "Étanchéité et toitures-terrasses",
      familles: [
        f("Accessoires et fixations", [["etancheite", null, /^(Fixation mécanique|Colle |Mastic |Primaire |Profil |Bouteille de gaz|Enduit d'imprégnation)/]]),
        f("Membranes bitumineuses", [["etancheite", "Membranes bitume"]]),
        f("Membranes synthétiques", [["etancheite", "Étanchéité EPDM"], ["etancheite", "Membranes PVC et TPO"]]),
        f("Étanchéité liquide", [["etancheite", "Étanchéité liquide"]]),
        f("Pare-vapeur", [["etancheite", "Pare-vapeur et écrans"]]),
        f("Isolation de toiture-terrasse", [["etancheite", "Isolants de toiture-terrasse"]]),
        f("Relevés et protections", [["etancheite", "Évacuations et relevés", /solin|rive|costière|lanterneau/i], ["etancheite", "Protection et finition"]]),
        f("Évacuation des eaux", [["etancheite", "Évacuations et relevés"]]),
      ],
    },
  ],
  charpente: [
    seul("Bois de charpente", [["charpente", "Bois de charpente"]]),
    seul("Lamellé-collé et bois reconstitué", [["charpente", "Lamellé-collé"]]),
    seul("Bois de couverture", [["couverture", "Bois de couverture"]]),
    seul("Panneaux", [["charpente", "Panneaux"]]),
    seul("Connecteurs et ferrures", [["charpente", "Connecteurs et ferrures"]]),
    seul("Fixations", [["charpente", "Fixations"]]),
    seul("Écrans et membranes", [["charpente", "Écrans et membranes"]]),
    seul("Traitement du bois", [["charpente", "Traitement du bois"]]),
  ],
  menuiserie: [
    seul("Bois et lames", [["menuiserie", "Bois de menuiserie"]]),
    seul("Panneaux", [["menuiserie", "Panneaux"], ["charpente", "Panneaux"]]),
    seul("Portes", [["menuiserie", "Portes"]]),
    seul("Fenêtres", [["menuiserie", "Fenêtres"]]),
    seul("Quincaillerie", [["menuiserie", "Quincaillerie"]]),
    seul("Fixations, mousses et mastics", [["menuiserie", "Fixations"]]),
  ],
  maconnerie: [
    seul("Liants et mortiers", [["maconnerie", "Liants"]]),
    seul("Granulats", [["maconnerie", "Granulats"]]),
    seul("Blocs et briques", [["maconnerie", "Blocs"]]),
    seul("Aciers et armatures", [["maconnerie", "Acier"]]),
    seul("Coffrage et linteaux", [["maconnerie", "Coffrage et linteaux"]]),
    seul("Enduits de façade", [["maconnerie", "Enduits"]], { precisions: [TEINTE] }),
    seul("Assainissement", [["maconnerie", "Assainissement"]]),
    seul("Étanchéité et protection", [["maconnerie", "Étanchéité"]]),
  ],
  platrerie_isolation: [
    seul("Plaques de plâtre", [["platrerie_isolation", "Plaques de plâtre"]]),
    seul("Ossatures", [["platrerie_isolation", "Ossature"]]),
    seul("Isolation", [["platrerie_isolation", "Isolants"]]),
    seul("Bandes, enduits et fixations", [["platrerie_isolation", "Fixations et finitions"]]),
  ],
  peinture: [
    seul("Préparation des supports", [["peinture", "Préparation", /toile/i]]),
    seul("Enduits et rebouchage", [["peinture", "Préparation", /enduit/i]]),
    seul("Impressions et sous-couches", [["peinture", "Sous-couches"], ["peinture", "Impressions"]]),
    seul("Peintures murs et plafonds", [["peinture", "Murs et plafonds"], ["peinture", "Peintures intérieures"]], { precisions: [TEINTE, SUPPORT] }),
    seul("Façades", [["peinture", "Façades"], ["peinture", "Peintures extérieures", /façade/i]], { precisions: [TEINTE] }),
    seul("Bois", [["peinture", "Boiseries et métaux", /boiseries/i], ["peinture", "Bois extérieur"], ["peinture", "Peintures extérieures"]], { precisions: [TEINTE] }),
    seul("Métaux", [["peinture", "Boiseries et métaux"]], { precisions: [TEINTE] }),
    seul("Sols", [["peinture", "Sols"]], { precisions: [TEINTE] }),
    seul("Protection du chantier", [["peinture", "Préparation"]]),
    seul("Consommables et outillage", [["peinture", "Outillage"]]),
  ],
  carrelage: [
    seul("Carrelage et faïence", [["carrelage", "Carrelage"]], { precisions: [{ nom: "Référence ou coloris", niveau: "utile", exemple: "la référence choisie par le client" }] }),
    seul("Colles et joints", [["carrelage", "Colles et joints"]]),
    seul("Préparation des supports", [["carrelage", "Préparation"]]),
    seul("Profilés et accessoires", [["carrelage", "Profilés"]]),
  ],
  plomberie: [
    seul("Alimentation en eau", [["plomberie", "Tubes"]]),
    seul("Évacuation", [["plomberie", "Évacuation"]]),
    seul("Raccords", [["plomberie", "Raccords", /raccord/i]]),
    seul("Sanitaire", [["plomberie", "Sanitaires"]]),
    seul("Robinetterie", [["plomberie", "Robinetterie"], ["plomberie", "Raccords"]]),
    seul("Chauffage", [["chauffage", "Émetteurs"], ["chauffage", "Plancher chauffant"], ["chauffage", "Raccordement"]]),
    seul("Production d'eau chaude", [["plomberie", "Eau chaude"]]),
    seul("Fixations, étanchéité et consommables", [["plomberie", "Fixations et étanchéité"]]),
  ],
  electricite: [
    seul("Tableau et protections", [["electricite", "Tableau"]]),
    seul("Communication et réseau", [["electricite", "Câbles", /RJ45/]]),
    seul("Câbles et fils", [["electricite", "Câbles"]]),
    seul("Gaines et conduits", [["electricite", "Gaines"]]),
    seul("Appareillage", [["electricite", "Appareillage"]], { precisions: [GAMME, COULEUR] }),
    seul("Éclairage", [["electricite", "Éclairage"]]),
    seul("Chauffage électrique", [["chauffage", "Émetteurs", /électrique/i]]),
  ],
  chauffage: [
    seul("Émetteurs", [["chauffage", "Émetteurs"]]),
    seul("Plancher chauffant", [["chauffage", "Plancher chauffant"]]),
    seul("Raccordement et régulation", [["chauffage", "Raccordement"]]),
    seul("Fumisterie", [["chauffage", "Fumisterie"]]),
    seul("Ventilation", [["chauffage", "Ventilation"]]),
  ],
};

/** Le nom du catalogue au sélecteur (« Plâtrerie et isolation » se lit « Plaques de plâtre et isolation »). */
export const LIBELLES_CATALOGUES: Readonly<Record<string, string>> = { ...LIBELLES_METIERS_CATALOGUE, platrerie_isolation: "Plaques de plâtre et isolation" };
export const RAYON_AUTRES = "Autres produits";

type ArticleRange = Pick<ArticleCatalogue, "cle" | "metier" | "famille" | "produit" | "variante">;

const prise = (p: Prise, a: ArticleRange) => p[0] === a.metier && (p[1] === null || p[1] === a.famille) && (!p[2] || p[2].test(a.produit));

/**
 * Où un catalogue range un article : la première famille qui le prend par le NOM du produit, sinon la première qui prend
 * son ancienne famille ; null quand ce catalogue ne le prend pas.
 */
function placeDans(rayons: readonly RayonDef[], a: ArticleRange): { rayon: RayonDef; famille: FamilleDef; rang: number } | null {
  for (const precis of [true, false])
    for (const rayon of rayons)
      for (const famille of rayon.familles) {
        const rang = famille.prend.findIndex((p) => !!p[2] === precis && prise(p, a));
        if (rang >= 0) return { rayon, famille, rang };
      }
  return null;
}

export interface CheminCatalogue {
  catalogue: MetierCatalogue;
  libelleCatalogue: string;
  rayon: string;
  famille: string;
  produit: string;
}

/** Le produit tel qu'il se lit dans une famille (« Bobine de zinc » → « Bobine », matière « zinc »). */
function produitDeVue(famille: FamilleDef | null, a: ArticleRange): { nom: string; fusion: Fusion | null; valeur: string | null } {
  for (const fu of famille?.fusions ?? []) {
    const m = fu.motif.exec(a.produit);
    const valeur = m?.slice(1).find((g) => g !== undefined);
    if (m && valeur) return { nom: fu.nom, fusion: fu, valeur };
  }
  return { nom: a.produit, fusion: null, valeur: null };
}

/**
 * TOUS LES RATTACHEMENTS d'un article : son catalogue d'abord (celui de son métier), puis ceux qui le partagent. Jamais
 * vide : un article que personne ne range (un ajout de l'admin dans une famille nouvelle) se lit sous « Autres produits »
 * de son catalogue, dans son ancienne famille. Rien ne disparaît.
 */
export function cheminsDeLArticle(a: ArticleRange): CheminCatalogue[] {
  const sien = rayonDuMetierCatalogue(a.metier);
  const chemins: CheminCatalogue[] = [];
  for (const catalogue of [sien, ...METIERS_DU_SELECTEUR.filter((m) => m !== sien)]) {
    const place = placeDans(CATALOGUES[catalogue] ?? [], a);
    if (place) chemins.push({ catalogue, libelleCatalogue: LIBELLES_CATALOGUES[catalogue]!, rayon: place.rayon.libelle, famille: place.famille.libelle, produit: produitDeVue(place.famille, a).nom });
    else if (catalogue === sien) chemins.push({ catalogue, libelleCatalogue: LIBELLES_CATALOGUES[catalogue] ?? catalogue, rayon: RAYON_AUTRES, famille: a.famille, produit: a.produit });
  }
  return chemins;
}

/* ------------------------------------------------------------------------------------- les caractéristiques */

const COULEURS = /^(naturel|prépatiné|galvanisé|laqué|rouge|brun|noir|gris|blanc|beige|vert|bleu|anthracite|ardoisé|vieilli|sablé|flammé|marron|incolore|mat|satin|velours|brillant|zinc|cuivre|quartz)/i;
/** Le nom d'une caractéristique d'après la façon dont ses valeurs sont écrites (« dév. 25 » : le développé). */
export function nomDeCaracteristique(valeurs: readonly string[]): string {
  const compte = new Map<string, number>();
  for (const v of valeurs) {
    const nom = /^dév\./.test(v)
      ? "Développé"
      : /^Ø/.test(v)
        ? "Diamètre"
        : /largeur/i.test(v)
          ? "Largeur"
          : /^rouleau|^\d+(?:[.,]\d+)? ?(?:L|kg|ml|g|t)\b|^big bag|^boîte|^sac|^pot|^seau|^bidon|^cartouche/i.test(v)
            ? "Conditionnement"
            : /^\d+(?:[.,]\d+)? ?mm$/.test(v)
              ? "Épaisseur"
              : /^(?:barre )?\d+(?:[.,]\d+)? ?m$/.test(v)
                ? "Longueur"
                : /^\d+(?:[.,]\d+)? ?[×x] ?\d+/.test(v)
                  ? "Format"
                  : /classe \d|traité/i.test(v)
                    ? "Traitement"
                    : /^\d+(?:[.,]\d+)? ?°/.test(v)
                      ? "Angle"
                      : /^\d+(?:[.,]\d+)? ?(?:A|W|mm²)\b/.test(v)
                        ? "Calibre"
                        : /^\d+G\d/.test(v)
                          ? "Section"
                          : COULEURS.test(v)
                            ? "Finition"
                            : "Modèle";
    compte.set(nom, (compte.get(nom) ?? 0) + 1);
  }
  return [...compte].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "Modèle";
}

export const SANS_PRECISION = "Standard";

/** Un choix à faire pour arriver à UN article : le nom de la caractéristique et ses valeurs, chacune avec la suite. */
export interface ChoixDeVue<T> {
  nom: string;
  options: { valeur: string; suite: ChoixDeVue<T> | null; article: T | null }[];
}
export interface ProduitDeVue<T> {
  libelle: string;
  /** L'article quand le produit n'a rien à choisir ; sinon null, et `choix` y mène. */
  article: T | null;
  /** Les caractéristiques à choisir, une à une (obligatoires : elles désignent l'article). */
  choix: ChoixDeVue<T> | null;
  /** Leurs noms, dans l'ordre du premier article (« Matériau », « Finition », « Épaisseur ») : l'indication de la carte. */
  caracteristiques: string[];
  /** Les précisions libres de la famille (utiles ou facultatives) : écrites, jamais un article de plus. */
  precisions: readonly PrecisionLibre[];
  nombre: number;
}
export interface FamilleDeVue<T> {
  libelle: string;
  produits: ProduitDeVue<T>[];
}
export interface RayonDeVue<T> {
  libelle: string;
  familles: FamilleDeVue<T>[];
}

/**
 * Les choix d'un produit, d'après ses articles : la matière d'abord (fusion), puis les morceaux du format, un à un. Un
 * morceau que tous les articles restants partagent n'est pas un choix : il est sauté. Les articles d'une matière n'ont pas
 * à s'écrire comme ceux d'une autre (le cuivre n'a pas de finition) : chaque choix ne regarde que les articles restants.
 */
function choisir<T extends ArticleRange>(lignes: readonly { article: T; morceaux: string[] }[], rang: number, fusion: Fusion | null): ChoixDeVue<T> | null {
  if (lignes.length <= 1) return null;
  const longueur = Math.max(...lignes.map((l) => l.morceaux.length));
  for (let c = rang; c < longueur; c++) {
    const valeurs = lignes.map((l) => l.morceaux[c] ?? SANS_PRECISION);
    const distinctes = [...new Set(valeurs)];
    if (distinctes.length < 2) continue;
    return {
      nom: fusion && c === 0 ? fusion.caracteristique : nomDeCaracteristique(distinctes.filter((v) => v !== SANS_PRECISION)),
      options: distinctes.map((valeur) => {
        const restants = lignes.filter((_, i) => valeurs[i] === valeur);
        const suite = choisir(restants, c + 1, fusion);
        return { valeur, suite, article: suite ? null : restants[0]!.article };
      }),
    };
  }
  // Des articles que rien ne distingue dans leur format (deux ajouts de l'admin du même nom) : choisis par leur rang.
  return { nom: "Modèle", options: lignes.map((l, i) => ({ valeur: l.article.variante ?? `${SANS_PRECISION} ${i + 1}`, suite: null, article: l.article })) };
}

function caracteriser<T extends ArticleRange>(lignes: readonly { article: T; fusion: Fusion | null; valeur: string | null }[]): Pick<ProduitDeVue<T>, "article" | "choix" | "caracteristiques" | "nombre"> {
  const fusion = lignes.find((l) => l.fusion)?.fusion ?? null;
  const choix = choisir(
    lignes.map((l) => ({ article: l.article, morceaux: [...(fusion ? [l.valeur ?? SANS_PRECISION] : []), ...(l.article.variante ? l.article.variante.split(" · ") : [])] })),
    0,
    fusion,
  );
  const caracteristiques: string[] = [];
  for (let n = choix; n; n = n.options[0]!.suite) caracteristiques.push(n.nom);
  return { article: choix ? null : lignes[0]!.article, choix, caracteristiques, nombre: lignes.length };
}

/**
 * LA VUE D'UN CATALOGUE : ses rayons, leurs familles, leurs produits et leurs caractéristiques, à partir des articles
 * (ceux de la base, modifications de l'admin comprises). Les rayons et les familles vides ne sortent pas. L'ordre est
 * celui du catalogue (rayons, familles), puis celui des articles.
 */
export function vueDuCatalogue<T extends ArticleRange>(catalogue: MetierCatalogue, articles: readonly T[]): RayonDeVue<T>[] {
  const defs = CATALOGUES[catalogue] ?? [];
  // `rang` : la prise qui a rangé l'article ; dans une famille, les produits de la première prise viennent d'abord (le
  // zinc avant le plomb venu d'une autre ancienne famille).
  type Ligne = { article: T; fusion: Fusion | null; valeur: string | null; rang: number };
  const parFamille = new Map<FamilleDef, Map<string, Ligne[]>>();
  const autres = new Map<string, Map<string, Ligne[]>>();
  for (const a of articles) {
    const place = placeDans(defs, a);
    if (!place && rayonDuMetierCatalogue(a.metier) !== catalogue) continue;
    const { nom, fusion, valeur } = produitDeVue(place?.famille ?? null, a);
    let produits = place ? parFamille.get(place.famille) : autres.get(a.famille);
    if (!produits) {
      produits = new Map();
      if (place) parFamille.set(place.famille, produits);
      else autres.set(a.famille, produits);
    }
    produits.set(nom, [...(produits.get(nom) ?? []), { article: a, fusion, valeur, rang: place?.rang ?? 0 }]);
  }
  const produitsDe = (m: Map<string, Ligne[]>, precisions: readonly PrecisionLibre[]): ProduitDeVue<T>[] =>
    [...m]
      .map(([libelle, lignes], i) => ({ libelle, lignes, i, rang: Math.min(...lignes.map((l) => l.rang)) }))
      .sort((x, y) => x.rang - y.rang || x.i - y.i)
      .map(({ libelle, lignes }) => ({ libelle, precisions, ...caracteriser(lignes) }));
  const rayons: RayonDeVue<T>[] = defs
    .map((r) => ({ libelle: r.libelle, familles: r.familles.filter((fa) => parFamille.has(fa)).map((fa) => ({ libelle: fa.libelle, produits: produitsDe(parFamille.get(fa)!, fa.precisions ?? []) })) }))
    .filter((r) => r.familles.length > 0);
  if (autres.size) rayons.push({ libelle: RAYON_AUTRES, familles: [...autres].map(([libelle, m]) => ({ libelle, produits: produitsDe(m, []) })) });
  return rayons;
}

/** Ce qu'il reste à choisir sur la carte d'un produit, en une ligne (« Matériau, finition, épaisseur »). */
export const indicationDuProduit = (p: Pick<ProduitDeVue<unknown>, "caracteristiques" | "precisions">): string =>
  [...p.caracteristiques, ...p.precisions.filter((x) => x.niveau === "utile").map((x) => x.nom)].map((n, i) => (i === 0 ? n : n.toLowerCase())).join(", ");
