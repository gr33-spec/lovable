import { normalizeText } from "../trades/trade-profile.js";
import type { FamilleGroupe } from "./groupe.js";

/**
 * LES REGROUPEMENTS NE PRENNENT QUE LES GROS ARTICLES IDENTIQUES (Greg, 25 octobre 2026, recentrage) : « correspondance
 * stricte sur la référence normalisée (format, épaisseur, origine, qualité ou marque si précisée). Une 30×20 ne rejoint
 * jamais une 32×22. En cas de doute, pas de regroupement. » Jamais les petits accessoires.
 *
 * Du code pur, sans IA : un article groupable est d'un TYPE connu (ardoise naturelle, zinc, liteau…) et porte TOUS les
 * attributs que ce type exige (le format d'une ardoise, l'épaisseur d'un zinc, la section d'un bois). La clé reprend
 * chaque attribut lu, précisé ou non : une ardoise « Espagne » et une ardoise sans origine n'ont pas la même clé, elles
 * ne se regroupent pas. Un type inconnu, un attribut exigé absent, deux formats dans la même ligne : `null`, pas de
 * regroupement.
 */

export type AttributReference = "format" | "epaisseur" | "largeur" | "origine" | "qualite" | "marque" | "aspect" | "conditionnement" | "teinte" | "finition";

interface TypeGroupable {
  type: string;
  /** Le nom court affiché sur la pastille (« Ardoise 32×22 »). */
  libelle: string;
  famille: FamilleGroupe;
  mots: RegExp;
  /** Les attributs sans lesquels la ligne est un doute (pas de regroupement). */
  requis: readonly AttributReference[];
}

/**
 * Les types groupables. L'ordre compte : le premier qui reconnaît la ligne l'emporte (« ardoise fibres-ciment » avant
 * « ardoise »). Un type absent d'ici ne se regroupe jamais : le doute protège l'artisan.
 */
const TYPES: readonly TypeGroupable[] = [
  { type: "ardoise-fibres-ciment", libelle: "Ardoise fibres-ciment", famille: "couverture", mots: /\bardoises? (en )?fibres? ?ciment\b|\bardoises? synthetiques?\b/, requis: ["format"] },
  { type: "ardoise", libelle: "Ardoise", famille: "couverture", mots: /\bardoises?\b/, requis: ["format"] },
  { type: "zinc", libelle: "Zinc", famille: "couverture", mots: /\b(zinc|quartz zinc|vmzinc)\b/, requis: ["epaisseur"] },
  { type: "ecran-sous-toiture", libelle: "Écran sous-toiture", famille: "couverture", mots: /\becrans? (de )?sous ?toiture\b/, requis: ["conditionnement"] },
  { type: "liteau", libelle: "Liteaux", famille: "couverture", mots: /\bliteaux?\b/, requis: ["format"] },
  { type: "volige", libelle: "Voliges", famille: "couverture", mots: /\bvoliges?\b|\bvoligeage\b/, requis: ["format"] },
  { type: "bois-charpente", libelle: "Bois de charpente", famille: "charpente", mots: /\b(chevrons?|bastaings?|madriers?|solives?|pannes?|bois de charpente)\b/, requis: ["format"] },
  { type: "osb", libelle: "OSB", famille: "charpente", mots: /\bosb\b/, requis: ["epaisseur", "format"] },
  { type: "isolant", libelle: "Isolant", famille: "second_oeuvre", mots: /\b(laine de (roche|verre|bois)|isolants?|polyurethane|pir)\b/, requis: ["epaisseur"] },
  // Peintres (Greg, 26 octobre 2026, plan peintres point 3 : « marque + gamme + teinte + conditionnement ; une palette de blanc
  // mat 15 L se regroupe, pas un blanc avec un gris ») : la sous-couche avant la peinture (« peinture sous-couche »).
  { type: "sous-couche", libelle: "Sous-couche", famille: "second_oeuvre", mots: /\b(sous ?couches?|impressions?)\b/, requis: ["conditionnement"] },
  { type: "peinture", libelle: "Peinture", famille: "second_oeuvre", mots: /\bpeintures?\b|\b(blanc|blanche|blancs) (mat|mats|satin|satine|velours|brillant)\b/, requis: ["teinte", "conditionnement"] },
  { type: "plaque-platre", libelle: "Plaque de plâtre", famille: "second_oeuvre", mots: /\b(plaques? de platre|placo|placoplatre|ba ?13|ba ?18)\b/, requis: ["format"] },
];

/** Les petits accessoires : jamais groupés, quelle que soit la quantité. */
const ACCESSOIRES = /\b(crochets?|clous?|pointes?|vis|pattes?|colliers?|mastics?|silicones?|joints?|agrafes?|chevilles?|rivets?|soudures?|etain|decapant|bandes? adhesives?|adhesifs?|closoirs?|talons?|naissances?|coudes?|manchons?|equerres?|sabots?|boulons?)\b/;

const ORIGINES: readonly [RegExp, string][] = [
  [/\bespagn(e|ol|ole|oles)\b/, "espagne"],
  [/\b(france|francais|francaise|angers|trelaze)\b/, "france"],
  [/\b(pays de galles|galles|gallois)\b/, "galles"],
  [/\bportug(al|ais|aise)\b/, "portugal"],
  [/\bbresil(ien|ienne)?\b/, "bresil"],
  [/\bchin(e|ois|oise)\b/, "chine"],
];
const QUALITES: readonly [RegExp, string][] = [
  [/\b(1er|1ere|premier|premiere) choix\b/, "1"],
  [/\b(2e|2eme|second|seconde|deuxieme) choix\b/, "2"],
  [/\b(3e|3eme|troisieme) choix\b/, "3"],
  [/\bextra\b/, "extra"],
];
/** Les marques connues des gros articles (une marque précisée fait partie de la clé). */
const MARQUES = /\b(cupa|samaca|vmzinc|vm zinc|elzinc|rheinzink|nedzink|eternit|edilians|imerys|monier|terreal|isover|rockwool|ursa|knauf|placo|siniat|delta|ubbink|onduline)\b/;
const ASPECTS: readonly [RegExp, string][] = [
  [/\bnaturel\b/, "naturel"],
  [/\b(pre ?patine|quartz|anthra|anthracite|pigmento)\b/, "prepatine"],
];

/** Les teintes et finitions d'une peinture (une teinte de nuancier écrite, « RAL 7016 », compte aussi). */
const TEINTES: readonly [RegExp, string][] = [
  [/\bral ?(\d{4})\b/, "ral"],
  [/\b(blanc|blanche|blancs|blanches)\b/, "blanc"],
  [/\b(gris|grise)\b/, "gris"],
  [/\b(noir|noire)\b/, "noir"],
  [/\b(beige|ivoire|creme|ecru)\b/, "beige"],
  [/\b(taupe|lin|sable)\b/, "taupe"],
];
const FINITIONS: readonly [RegExp, string][] = [
  [/\b(mat|mats|mate)\b/, "mat"],
  [/\b(satin|satine|satinee)\b/, "satin"],
  [/\bvelours\b/, "velours"],
  [/\b(brillant|brillante|laque)\b/, "brillant"],
];

const nombre = (s: string) => Number(s.replace(",", "."));
const propre = (n: number) => String(Math.round(n * 1000) / 1000);

/** Tous les formats « A × B » de la ligne, dans l'unité écrite ramenée en cm (mm ÷ 10, m × 100). */
function formats(texte: string): string[] {
  const vus = new Set<string>();
  for (const m of texte.matchAll(/(\d{1,4}(?:[.,]\d+)?) ?[x×*] ?(\d{1,4}(?:[.,]\d+)?)(?: ?[x×*] ?(\d{1,5}(?:[.,]\d+)?))? ?(mm|cm|m)?\b/g)) {
    const facteur = m[4] === "mm" ? 0.1 : m[4] === "m" ? 100 : 1;
    const dims = [m[1], m[2], m[3]].filter(Boolean).map((d) => propre(nombre(d!) * facteur));
    vus.add(dims.join("x"));
  }
  return [...vus];
}

/** Les mesures en mm de la ligne (hors formats) : une épaisseur fine (< 3 mm, le zinc) ou forte (isolant, OSB), une largeur (bobine). */
function mesuresMm(texteSansFormats: string): number[] {
  return [...texteSansFormats.matchAll(/(\d{1,4}(?:[.,]\d+)?) ?mm\b/g)].map((m) => nombre(m[1]!));
}

export interface ReferenceStricte {
  type: string;
  famille: FamilleGroupe;
  /** La clé du regroupement : deux lignes ne se regroupent que sur une clé IDENTIQUE. */
  cle: string;
  /** Le nom court pour l'écran (« Ardoise 32×22 Espagne 1er choix »). */
  libelle: string;
  attributs: Partial<Record<AttributReference, string>>;
}

export type RefusReference = "accessoire" | "type_inconnu" | "attribut_manquant" | "ambigu";

/**
 * La référence stricte d'une ligne, ou la raison du refus. Jamais un rapprochement approché.
 */
export function referenceStricte(designation: string): { ok: true; reference: ReferenceStricte } | { ok: false; raison: RefusReference } {
  const texte = ` ${normalizeText(designation.replace(/m²/g, "m2")).replace(/[^a-z0-9.,×*]+/g, " ").replace(/\s+/g, " ")} `;
  const types = TYPES.filter((t) => t.mots.test(texte));
  // « ardoise fibres-ciment » reconnaît aussi « ardoise » : le premier type (le plus précis) l'emporte.
  const type = types[0];
  if (!type) return { ok: false, raison: ACCESSOIRES.test(texte) ? "accessoire" : "type_inconnu" };
  // « Clous pour ardoise » est un accessoire ; « Ardoise posée au crochet » est une ardoise : le premier mot nomme l'article.
  const accessoire = ACCESSOIRES.exec(texte);
  if (accessoire && accessoire.index < (type.mots.exec(texte)?.index ?? 0)) return { ok: false, raison: "accessoire" };
  const lesFormats = formats(texte);
  if (lesFormats.length > 1) return { ok: false, raison: "ambigu" };
  const sansFormats = texte.replace(/(\d{1,4}(?:[.,]\d+)?) ?[x×*] ?(\d{1,4}(?:[.,]\d+)?)(?: ?[x×*] ?(\d{1,5}(?:[.,]\d+)?))? ?(mm|cm|m)?\b/g, " ");
  const mm = mesuresMm(sansFormats);
  const attributs: Partial<Record<AttributReference, string>> = {};
  if (lesFormats[0]) attributs.format = lesFormats[0];
  if (type.type === "zinc") {
    const fines = mm.filter((n) => n < 3);
    const larges = mm.filter((n) => n >= 100);
    if (fines.length > 1 || larges.length > 1) return { ok: false, raison: "ambigu" };
    if (fines[0] !== undefined) attributs.epaisseur = propre(fines[0]);
    if (larges[0] !== undefined) attributs.largeur = propre(larges[0]);
    const aspects = ASPECTS.filter(([re]) => re.test(texte)).map(([, v]) => v);
    if (aspects.length > 1) return { ok: false, raison: "ambigu" };
    if (aspects[0]) attributs.aspect = aspects[0];
  } else {
    const epaisseurs = [...new Set(mm)];
    if (epaisseurs.length > 1) return { ok: false, raison: "ambigu" };
    if (epaisseurs[0] !== undefined) attributs.epaisseur = propre(epaisseurs[0]);
  }
  const rouleau = /(\d{1,4}(?:[.,]\d+)?) ?m2\b/.exec(texte);
  if (rouleau && /\brouleaux?\b/.test(texte)) attributs.conditionnement = `${propre(nombre(rouleau[1]!))}m2`;
  // Un pot se dit en litres (« 15 L », « 15l ») : c'est son conditionnement.
  const litres = [...new Set([...texte.matchAll(/(\d{1,3}(?:[.,]\d+)?) ?(?:l|litres?)\b/g)].map((m) => propre(nombre(m[1]!))))];
  if (type.type === "peinture" || type.type === "sous-couche") {
    if (litres.length > 1) return { ok: false, raison: "ambigu" };
    if (litres[0]) attributs.conditionnement = `${litres[0]}l`;
    const teintes = TEINTES.map(([re, v]) => { const m = re.exec(texte); return m ? (v === "ral" ? `ral${m[1]}` : v) : null; }).filter((v): v is string => v !== null);
    if (teintes.length > 1) return { ok: false, raison: "ambigu" };
    if (teintes[0]) attributs.teinte = teintes[0];
    const finitions = FINITIONS.filter(([re]) => re.test(texte)).map(([, v]) => v);
    if (finitions.length > 1) return { ok: false, raison: "ambigu" };
    if (finitions[0]) attributs.finition = finitions[0];
  }
  const origines = ORIGINES.filter(([re]) => re.test(texte)).map(([, v]) => v);
  if (origines.length > 1) return { ok: false, raison: "ambigu" };
  if (origines[0]) attributs.origine = origines[0];
  const qualites = QUALITES.filter(([re]) => re.test(texte)).map(([, v]) => v);
  if (qualites.length > 1) return { ok: false, raison: "ambigu" };
  if (qualites[0]) attributs.qualite = qualites[0];
  const marque = MARQUES.exec(texte)?.[1];
  // « Placo » nomme aussi le produit : il n'est une marque que pour un autre type que la plaque de plâtre.
  if (marque && !(type.type === "plaque-platre" && marque === "placo")) attributs.marque = marque.replace(/\s+/g, "");
  if (type.requis.some((a) => !attributs[a])) return { ok: false, raison: "attribut_manquant" };
  // La teinte et la finition n'entrent dans la clé que pour la peinture : la clé des autres articles ne change pas (les
  // regroupements déjà ouverts gardent la leur).
  const peinture = type.type === "peinture" || type.type === "sous-couche";
  const ordre: readonly AttributReference[] = peinture ? ["format", "epaisseur", "largeur", "aspect", "teinte", "finition", "conditionnement", "origine", "qualite", "marque"] : ["format", "epaisseur", "largeur", "aspect", "conditionnement", "origine", "qualite", "marque"];
  const cle = `${type.type}|${ordre.map((a) => `${a}=${attributs[a] ?? ""}`).join("|")}`;
  const lisible = [
    type.libelle,
    attributs.format?.replace(/x/g, "×"),
    attributs.epaisseur ? `${attributs.epaisseur.replace(".", ",")} mm` : null,
    attributs.largeur ? `${attributs.largeur} mm` : null,
    attributs.aspect,
    attributs.teinte?.replace(/^ral/, "RAL "),
    attributs.finition,
    attributs.conditionnement?.replace("m2", " m²").replace(/^([\d.]+)l$/, (_, n: string) => `${n.replace(".", ",")} L`),
    attributs.origine ? attributs.origine.charAt(0).toUpperCase() + attributs.origine.slice(1) : null,
    attributs.qualite ? (attributs.qualite === "extra" ? "extra" : `${attributs.qualite === "1" ? "1er" : `${attributs.qualite}e`} choix`) : null,
    attributs.marque ? attributs.marque.charAt(0).toUpperCase() + attributs.marque.slice(1) : null,
  ]
    .filter(Boolean)
    .join(" ");
  return { ok: true, reference: { type: type.type, famille: type.famille, cle, libelle: lisible, attributs } };
}

/** Les types groupables d'une famille (pour l'admin et la doc). */
export const typesGroupables = (famille?: string) => TYPES.filter((t) => !famille || t.famille === famille).map((t) => ({ type: t.type, libelle: t.libelle, famille: t.famille, requis: t.requis }));
