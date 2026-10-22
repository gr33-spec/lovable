import { normalizeText } from "../trades/trade-profile.js";

/**
 * LA LIGNE PRÉCISE OU VAGUE (nouveau cap du 22 octobre 2026, décidé avec Greg) : « Liste ultra simple : une carte par
 * ligne […]. Ligne vague → question en boutons (format, origine, choix, marque). Pastille verte si précise, orange sinon :
 * « Précise pour trouver d'autres couvreurs ». » Deux lignes ne se groupent que sur une clé identique (`cleDeReference`) :
 * plus la désignation dit ce que le comptoir demande, plus il y a de couvreurs sur la même ligne.
 *
 * Code pur, zéro IA : une famille d'article est reconnue par ses mots, puis chaque donnée attendue par ce qui l'écrit dans
 * la désignation (un format « 32x22 », une origine « Espagne », « 1er choix »…). Une donnée qui manque est une question à
 * boutons ; la réponse s'ajoute à la désignation. Un article qu'aucune famille ne connaît n'a pas de question (précis par
 * défaut) : on ne demande jamais ce qu'on ne sait pas proposer.
 *
 * Être vague ne bloque rien : la liste part quand même chez le négoce de l'artisan (envoi seul). La précision sert
 * seulement au regroupement.
 */

export interface QuestionDePrecision {
  /** La donnée demandée : format, origine, choix, marque, teinte, matière, développé, diamètre, épaisseur, section, type. */
  cle: string;
  /** La question telle qu'elle s'affiche (« Format ? »). */
  question: string;
  /** Les boutons ; « Autre » s'ajoute à l'écran (une case à écrire). */
  options: readonly string[];
}

export interface PrecisionDeLigne {
  /** La famille reconnue (« ardoise naturelle »), ou null : article inconnu, sans question. */
  famille: string | null;
  precise: boolean;
  /** Les données qui manquent, dans l'ordre où le comptoir les demande. */
  questions: readonly QuestionDePrecision[];
}

/** La phrase de la pastille orange. Le métier dit qui on trouve (« couvreurs » au lancement). */
export function phrasePrecision(metier?: string | null): string {
  return `Précise pour trouver d'autres ${metier === "roofing" || !metier ? "couvreurs" : "artisans"}`;
}

interface Donnee {
  cle: string;
  question: string;
  options: readonly string[];
  /** Ce qui, dans la désignation normalisée, dit que la donnée est écrite. */
  ecrite: RegExp;
}

interface Famille {
  nom: string;
  /** Reconnue sur la désignation normalisée (minuscules, sans accents, « × » en « x »). */
  mots: RegExp;
  /** Écartée quand ces mots y sont (l'ardoise fibres-ciment n'est pas une ardoise naturelle). */
  sauf?: RegExp;
  donnees: readonly Donnee[];
}

const FORMAT = /\b\d{2,3}\s*x\s*\d{2,3}\b/;
const ORIGINES = ["Espagne", "Pays de Galles", "Brésil", "France"] as const;
const MARQUES_TUILE = ["Edilians", "Terreal", "Monier", "Koramic"] as const;

/**
 * Les familles de la couverture (lancement couvreurs). Les options sont celles que le comptoir propose couramment ; une
 * autre valeur s'écrit sous « Autre ». L'ordre compte : la première famille qui reconnaît la ligne l'emporte.
 */
const FAMILLES: readonly Famille[] = [
  {
    nom: "ardoise fibres-ciment",
    mots: /\bardoises?\b.*\b(fibres?|fibro\w*|synthet\w*)/,
    donnees: [
      { cle: "format", question: "Format ?", options: ["40×24", "60×30", "60×40"], ecrite: FORMAT },
      { cle: "teinte", question: "Teinte ?", options: ["Bleu-noir", "Noir", "Gris"], ecrite: /\b(bleu\w*|noir\w*|gris\w*|anthracite|ardoise)\b.*\b(bleu|noir|gris)|\b(bleu noir|noir|gris|anthracite)\b/ },
    ],
  },
  {
    nom: "ardoise naturelle",
    mots: /\bardoises?\b/,
    sauf: /\bfibr|\bfibro|\bsynthet|\bcrochets?\b|\bclous?\b/,
    donnees: [
      { cle: "format", question: "Format ?", options: ["32×22", "40×22", "40×25", "45×30"], ecrite: FORMAT },
      { cle: "origine", question: "Origine ?", options: ORIGINES, ecrite: /\b(espagn\w*|galles|gallois\w*|bresil\w*|france|francais\w*|angers|portug\w*|chin\w*|canad\w*|cupa|samaca)\b/ },
      { cle: "choix", question: "Choix ?", options: ["1er choix", "2e choix"], ecrite: /\bchoix\b|\bextra\b/ },
    ],
  },
  {
    nom: "tuile",
    mots: /\btuiles?\b/,
    sauf: /\bcrochets?\b|\bclous?\b|\bchatieres?\b/,
    donnees: [
      { cle: "marque", question: "Marque ?", options: MARQUES_TUILE, ecrite: /\b(edilians|imerys|terreal|monier|koramic|wienerberger|lafarge|huguenot|bouyer|gilardoni|sans marque|identique)\b/ },
      { cle: "teinte", question: "Teinte ?", options: ["Rouge", "Vieilli", "Brun", "Ardoisé"], ecrite: /\b(rouge|vieilli\w*|brun\w*|ardois\w*|noir\w*|nuance\w*|flamm\w*|terre cuite naturelle|sable\w*|chaume|ocre|gris\w*|anthracite)\b/ },
    ],
  },
  {
    nom: "faîtière",
    mots: /\bfaitieres?\b/,
    donnees: [{ cle: "teinte", question: "Teinte ?", options: ["Rouge", "Vieilli", "Brun", "Ardoisé"], ecrite: /\b(rouge|vieilli\w*|brun\w*|ardois\w*|noir\w*|nuance\w*|zinc|gris\w*|anthracite)\b/ }],
  },
  {
    nom: "crochet d'ardoise",
    mots: /\bcrochets?\b/,
    sauf: /\bgouttiere|\bsecurite|\bechelle/,
    donnees: [
      { cle: "matiere", question: "Matière ?", options: ["Inox", "Galva", "Cuivre"], ecrite: /\b(inox|galva\w*|cuivre|teinte|noir\w*)\b/ },
      { cle: "longueur", question: "Longueur ?", options: ["90 mm", "100 mm", "110 mm", "120 mm"], ecrite: /\b\d{2,3}\s*(mm|cm)\b/ },
    ],
  },
  {
    nom: "gouttière",
    mots: /\bgouttieres?\b/,
    sauf: /\bcrochets?\b|\bnaissances?\b|\btalons?\b|\bjonctions?\b|\bangles?\b/,
    donnees: [
      { cle: "matiere", question: "Matière ?", options: ["Zinc", "PVC", "Alu"], ecrite: /\b(zinc|pvc|alu\w*|cuivre|acier)\b/ },
      { cle: "developpe", question: "Développé ?", options: ["25", "33", "40"], ecrite: /\bdev\b|\bdeveloppe|\b(16|25|33|40)\b/ },
    ],
  },
  {
    nom: "descente",
    mots: /\b(descentes?|tuyaux? de descente)\b/,
    sauf: /\bcolliers?\b|\bcoudes?\b|\bdauphins?\b/,
    donnees: [
      { cle: "matiere", question: "Matière ?", options: ["Zinc", "PVC", "Alu"], ecrite: /\b(zinc|pvc|alu\w*|cuivre|fonte)\b/ },
      { cle: "diametre", question: "Diamètre ?", options: ["Ø 80", "Ø 100"], ecrite: /ø|\bdiam|\b(60|70|80|100)\b/ },
    ],
  },
  {
    nom: "zinc en feuille ou en bande",
    mots: /\bzinc\b/,
    sauf: /\bgouttieres?\b|\bdescentes?\b|\bcrochets?\b|\bclous?\b/,
    donnees: [{ cle: "epaisseur", question: "Épaisseur ?", options: ["0,65 mm", "0,70 mm", "0,80 mm"], ecrite: /\b0[.,]\d{2}\b/ }],
  },
  {
    nom: "liteau",
    mots: /\b(liteaux?|litteaux?|contre liteaux?)\b/,
    donnees: [{ cle: "section", question: "Section ?", options: ["27×38", "38×38", "18×38"], ecrite: FORMAT }],
  },
  {
    nom: "écran sous-toiture",
    mots: /\b(ecrans?|pare pluie)\b/,
    donnees: [{ cle: "type", question: "Type ?", options: ["HPV", "Bitumé", "Réflecteur"], ecrite: /\b(hpv|bitum\w*|reflect\w*|respirant\w*|pare vapeur|delta|tyvek|ubbink)\b/ }],
  },
  {
    nom: "pointes",
    mots: /\b(pointes?|clous?)\b/,
    donnees: [
      { cle: "matiere", question: "Matière ?", options: ["Inox", "Cuivre", "Galva"], ecrite: /\b(inox|cuivre|galva\w*|acier)\b/ },
      { cle: "format", question: "Format ?", options: ["2,5×30", "2,8×40", "3,1×50"], ecrite: /\b\d[.,]?\d?\s*x\s*\d{2,3}\b/ },
    ],
  },
];

/** La famille et les données qui manquent pour que la ligne soit précise. */
export function precisionDeLigne(designation: string): PrecisionDeLigne {
  const texte = normalizeText(designation);
  const famille = FAMILLES.find((f) => f.mots.test(texte) && !(f.sauf?.test(texte) ?? false));
  if (!famille) return { famille: null, precise: true, questions: [] };
  const questions = famille.donnees.filter((d) => !d.ecrite.test(texte)).map(({ cle, question, options }) => ({ cle, question, options }));
  return { famille: famille.nom, precise: questions.length === 0, questions };
}

/** La réponse s'écrit dans la désignation (« Ardoise naturelle » + « 32×22 » → « Ardoise naturelle 32×22 »). */
export function designationPrecisee(designation: string, question: QuestionDePrecision, valeur: string): string {
  const v = valeur.trim();
  if (!v) return designation;
  const base = designation.trim();
  // Un développé ou un diamètre seul se dit comme au comptoir (« dév. 33 », « Ø 80 »).
  const dit = question.cle === "developpe" && /^\d+$/.test(v) ? `dév. ${v}` : v;
  return `${base} ${dit}`;
}
