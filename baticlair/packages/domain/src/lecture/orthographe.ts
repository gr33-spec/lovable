import type { Referential } from "../referential/model.js";
import type { LectureDevis } from "./lecture.js";

/**
 * LES FAUTES D'ORTHOGRAPHE DES ARTISANS (Greg, 22 novembre 2026) : « Les vrais devis contiennent beaucoup de fautes. Avant
 * tout calcul, on remet le texte du devis au propre : on corrige l'orthographe en s'aidant du contexte (sur un devis de
 * couverture, « ardoize » veut dire ardoise, « faitage » faîtage, « zing » zinc). On ne touche jamais aux chiffres, aux
 * mesures ni aux références (32×22, HP 10, Ø80). Le code travaille ensuite sur ce texte propre. En cas de vrai doute sur un
 * mot, on demande : « Tu as écrit "…", c'est bien … ? » »
 *
 * Le code seul, sans IA : un mot inconnu est rapproché des mots DU MÉTIER (ceux de la fiche : familles, emplacements,
 * produits, données) par le SON (z = s, eau = o, lettres doublées, lettres muettes de fin) ; jamais par une simple lettre
 * de différence, qui changerait « toile » en « tuile ». Un mot qui sonne comme deux mots différents du métier reste tel qu'écrit
 * et devient un doute (une question). Un mot avec un chiffre, un sigle en capitales (HP, PVC, HPV) ou un symbole ne bouge
 * jamais.
 */

const sansAccent = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** La clé de son d'un mot (français simplifié) : deux écritures qui se prononcent pareil ont la même clé. */
export function cleDeSon(mot: string): string {
  let m = sansAccent(mot.toLowerCase()).replace(/[^a-z]/g, "");
  m = m
    .replace(/ph/g, "f")
    // « ch » se dit à part (« bâche » n'est pas « bacs »).
    .replace(/ch/g, "$")
    .replace(/qu/g, "k")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/g(?=[eiy])/g, "j")
    .replace(/z/g, "s")
    .replace(/y/g, "i")
    .replace(/h/g, "")
    .replace(/eau/g, "o")
    .replace(/au/g, "o")
    .replace(/(.)\1+/g, "$1")
    // « zing » et « zinc » se disent pareil.
    .replace(/n[gk]$/, "nk");
  // Les lettres muettes de fin (« crochet », « liteaux », « gouttière ») ; « er », « et », « ez » se disent « é ».
  // Jamais un « t » ou un « d » muet seul (« fonte » n'est pas « fond », « peint » n'est pas « pente »).
  for (let i = 0; i < 2; i++) m = m.replace(/(?<=..)(?:er|et|ez)$/, "e").replace(/(?<=..)[sxe]$/, "");
  return m;
}

/** Un mot du métier : sa clé de son, et sa forme écrite (avec ses accents, telle que la fiche l'écrit). */
export interface VocabulaireDuMetier {
  /** Mot sans accent → forme écrite. */
  connus: Map<string, string>;
  /** Clé de son → formes écrites (plusieurs : un doute). */
  parSon: Map<string, Set<string>>;
}

const MOT = /[A-Za-zÀ-ÖØ-öø-ÿŒœ]+/g;

const DEJA = new WeakMap<Referential, VocabulaireDuMetier>();
export function vocabulaireDuMetier(ref: Referential): VocabulaireDuMetier {
  const garde = DEJA.get(ref);
  if (garde) return garde;
  const textes: string[] = [];
  for (const f of ref.families) textes.push(f.label, ...(f.keywords ?? []));
  for (const p of ref.products) textes.push(p.label, p.shortLabel ?? "", ...(p.aliases ?? []));
  for (const w of ref.workItems) {
    textes.push(w.label);
    for (const s of w.slots) textes.push(s.label, ...(s.keywords ?? []), s.suggested?.label ?? "");
    for (const p of w.params) textes.push(p.label, ...(p.textLabels ?? []), ...(p.choices ?? []).map((c) => c.label));
  }
  const connus = new Map<string, string>();
  const parSon = new Map<string, Set<string>>();
  for (const t of textes) {
    for (const brut of t.match(MOT) ?? []) {
      if (brut.length < 4) continue;
      const ecrit = brut.toLowerCase();
      const cle = sansAccent(ecrit);
      // La forme accentuée l'emporte (« faîtage » plutôt que « faitage » écrit dans un mot-clé).
      const deja = connus.get(cle);
      if (!deja || (deja === cle && ecrit !== cle)) connus.set(cle, ecrit);
    }
  }
  for (const [cle, ecrit] of connus) {
    const son = cleDeSon(cle);
    if (son.length < 3) continue;
    parSon.set(son, new Set([...(parSon.get(son) ?? []), ecrit]));
  }
  // Une même racine au singulier et au pluriel (« liteau », « liteaux ») n'est pas un doute : une seule forme par son.
  for (const [son, formes] of parSon) {
    const racines = new Set([...formes].map((f) => sansAccent(f).replace(/(?:s|x)$/, "")));
    if (racines.size === 1) parSon.set(son, new Set([[...formes].sort((a, b) => a.length - b.length)[0]!]));
  }
  const vocab = { connus, parSon };
  DEJA.set(ref, vocab);
  return vocab;
}

export interface Doute {
  /** Le mot tel qu'écrit au devis. */
  mot: string;
  /** Les mots du métier qu'il peut vouloir dire. */
  candidats: string[];
  /** « Tu as écrit "zinc", c'est bien … ? » */
  question: string;
}

/** Le nombre de lettres à changer, ajouter, retirer ou intervertir pour passer d'un mot à l'autre (Damerau-Levenshtein). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  }
  return d[a.length]![b.length]!;
}

/** Le pluriel reste un pluriel (« litos » → « liteaux », jamais « liteau »). */
function auMemeNombre(ecrit: string, forme: string, vocab: VocabulaireDuMetier): string {
  if (!/[sx]$/.test(ecrit) || /[sx]$/.test(sansAccent(forme))) return forme;
  for (const fin of ["s", "x"]) {
    const pluriel = vocab.connus.get(sansAccent(forme) + fin);
    if (pluriel) return pluriel;
  }
  return forme + (/(?:eau|au|eu)$/.test(sansAccent(forme)) ? "x" : "s");
}

/** Remet la casse du mot d'origine (« Ardoize » → « Ardoise »). */
const commeLOriginal = (original: string, propre: string) => (original[0] === original[0]!.toUpperCase() && original.slice(1) === original.slice(1).toLowerCase() ? propre[0]!.toUpperCase() + propre.slice(1) : propre);

/**
 * Corrige un texte : chaque mot inconnu qui sonne comme UN SEUL mot du métier est remplacé ; les chiffres, les sigles et
 * tout ce qui touche un chiffre ou un symbole (« 32×22 », « Ø80 », « HP10 ») restent tels quels.
 */
export function corrigerTexte(texte: string, vocab: VocabulaireDuMetier, doutes: Doute[] = [], choix: Readonly<Record<string, string>> = {}): string {
  return texte.replace(/[^\s]+/g, (jeton) => {
    // Un jeton avec un chiffre, un symbole de mesure ou de référence : jamais touché.
    if (/[\d×Ø°%/=+]/.test(jeton)) return jeton;
    return jeton.replace(MOT, (mot) => {
      if (mot.length < 4) return mot;
      // Un sigle en capitales (HP, PVC, HPV, EPDM) : une référence.
      if (mot === mot.toUpperCase() && mot.length <= 5) return mot;
      const cle = sansAccent(mot.toLowerCase());
      if (vocab.connus.has(cle)) {
        // Le mot du métier sans ses accents (« faitage ») : écrit comme la fiche (« faîtage »). Seulement un mot long : sur un
        // mot court, l'accent change le sens (« pose », « posé »).
        const ecrit = vocab.connus.get(cle)!;
        // Jamais un accent retiré (« amiantée » reste « amiantée ») : seulement ajouté à un mot écrit sans accent.
        return cle.length >= 7 && mot.toLowerCase() === cle && ecrit !== cle && sansAccent(ecrit) === cle ? commeLOriginal(mot, ecrit) : mot;
      }
      // Une autre forme du même mot (« poser » et « pose », « liteaux » et « liteau », « profilés » et « profilées ») n'est pas
      // une faute.
      const racine = (w: string) => w.replace(/(?:ees|ee|es|e|s|x)$/, "");
      const formes = new Set([...(vocab.parSon.get(cleDeSon(cle)) ?? [])].filter((f) => {
        const c = sansAccent(f);
        if (cle.startsWith(c) || c.startsWith(cle) || racine(c) === racine(cle)) return false;
        // Le son ne suffit pas : l'écrit reste proche (« serviette » n'est pas « service », « laissé » n'est pas « laize »).
        return distance(mot.toLowerCase(), f) <= (cle.length <= 5 ? 3 : 2);
      }));
      if (formes.size === 0) return mot;
      if (formes.size > 1) {
        // La réponse de l'artisan au doute (« c'est bien … ») : le mot qu'il a choisi.
        const choisi = choix[mot];
        if (choisi !== undefined) return choisi === mot ? mot : commeLOriginal(mot, choisi);
        const candidats = [...formes].sort();
        if (!doutes.some((d) => d.mot === mot)) doutes.push({ mot, candidats, question: `Tu as écrit « ${mot} », c'est bien ${candidats.map((c) => `« ${c} »`).join(" ou ")} ?` });
        return mot;
      }
      return commeLOriginal(mot, auMemeNombre(cle, [...formes][0]!, vocab));
    });
  });
}

/** La clé d'un doute : `orthographe:<mot tel qu'écrit>` ; sa réponse est le mot choisi. */
export const ORTHOGRAPHE_KEY = "orthographe:";

/** Le devis au propre : la désignation de chaque ligne corrigée ; les doutes sont rendus à part (des questions). */
export function devisAuPropre(ref: Referential, lecture: LectureDevis, answers: Readonly<Record<string, unknown>> = {}): { lecture: LectureDevis; doutes: Doute[] } {
  const vocab = vocabulaireDuMetier(ref);
  const choix: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) if (k.startsWith(ORTHOGRAPHE_KEY) && typeof v === "string") choix[k.slice(ORTHOGRAPHE_KEY.length)] = v;
  const doutes: Doute[] = [];
  const lignes = lecture.lignes.map((l) => {
    const designation = corrigerTexte(l.designation, vocab, doutes, choix);
    return designation === l.designation ? l : { ...l, designation };
  });
  return { lecture: lignes.every((l, i) => l === lecture.lignes[i]) ? lecture : { ...lecture, lignes }, doutes };
}
