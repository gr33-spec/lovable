import type { FicheDonnee } from "../referential/fiche.js";
import type { LectureDevis, LectureLigne, LectureQuestion } from "./lecture.js";

/**
 * LA LECTURE LOT PAR LOT DES GROS DEVIS MULTIMÉTIERS (décision du fondateur, 24 octobre 2026, « option 1 ») : la vraie
 * lecture de 7954 (électricité, plomberie, chauffage, 8 pages) a été coupée à 16 000 jetons au bout de 158 s ; un appel
 * qui lit tout avec trois référentiels ne tient pas dans la limite de la fonction (300 s). Un gros devis de plusieurs
 * métiers est donc lu en UN APPEL PAR MÉTIER, en parallèle, chacun avec son seul référentiel et la consigne de ne rendre
 * que ses lignes ; les lectures sont ensuite FUSIONNÉES par le code (`fusionnerLectures`). Un devis d'un seul métier, ou
 * un petit devis de plusieurs, garde l'appel unique. Un lot dont la lecture échoue n'empêche pas les autres : sa partie
 * est dite à l'artisan (`phraseLotNonLu`), jamais passée sous silence.
 */

/** Au-delà de ce nombre de lignes de texte, un devis de plusieurs métiers est lu lot par lot (7954 : bien plus). */
export const LIGNES_LECTURE_PAR_LOTS = 120;

/** Le nombre de lignes du texte numéroté (« [1:003] … » par ligne). */
export const lignesDuTexte = (numberedText: string): number => numberedText.split("\n").filter((l) => l.trim()).length;

/** Un devis de plusieurs métiers et assez long pour qu'un appel unique risque d'être coupé. */
export const lectureParLots = (metiers: readonly string[], numberedText: string): boolean => metiers.length > 1 && lignesDuTexte(numberedText) > LIGNES_LECTURE_PAR_LOTS;

/** La phrase de l'écran pour un lot non lu (le fondateur, mot pour mot). */
export const phraseLotNonLu = (libelle: string): string => `Je n'ai pas pu lire la partie ${libelle.toLocaleLowerCase("fr")}, ajoute-la à la main ou renvoie-la.`;

/**
 * La consigne d'un appel de lot, ajoutée au devis (le prompt de lecture ne change pas). Le lot principal rend aussi les
 * lignes qui ne relèvent d'aucun lot (accès, installation de chantier) : un article écrit ne disparaît jamais (§49.1).
 */
export function consigneDuLot(lot: { metier: string; libelle: string }, tous: readonly { metier: string; libelle: string }[], principal: boolean): string {
  const autres = tous.filter((l) => l.metier !== lot.metier);
  return [
    `LECTURE PAR LOT : ce devis a plusieurs lots (${tous.map((l) => l.libelle).join(", ")}), lus chacun par un appel à part. Cet appel lit SEULEMENT le lot « ${lot.libelle} » (${lot.metier}), avec le référentiel ci-dessus.`,
    `- « lignes » : uniquement les lignes du devis qui relèvent de ce lot${principal ? ", PLUS celles qui ne relèvent d'aucun lot (installation de chantier, accès, frais généraux)" : ""}, avec leur repère d'origine. Les lignes des lots ${autres.map((l) => `« ${l.libelle} »`).join(", ")} ne sont pas rendues ici : elles sont lues par leur propre appel.`,
    `- « metier » : ${lot.metier} ; « lots » : un seul lot, celui-ci (${lot.metier}), avec les repères de ses lignes.`,
    "- « fiche », « bref » et « questions » : seulement ce qui concerne ce lot ; aucune question sur une ligne d'un autre lot.",
  ].join("\n");
}

/** « 1:003 » < « 1:010 » < « 2:001 » ; « 3 » < « 12 » : l'ordre du devis, nombre par nombre. */
export function ordreDesReperes(a: string, b: string): number {
  const na = a.match(/\d+/g)?.map(Number) ?? [];
  const nb = b.match(/\d+/g)?.map(Number) ?? [];
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] ?? -1) - (nb[i] ?? -1);
    if (d !== 0) return d;
  }
  return a.localeCompare(b);
}

export interface PartLue {
  metier: string;
  libelle: string;
  lecture: LectureDevis;
}

/**
 * Les lectures des lots, fusionnées en une lecture du devis : chaque ligne une fois (la première lecture qui la rend),
 * dans l'ordre du devis ; un lot par appel réussi, avec les lignes qu'il a rendues ; la fiche, le bref et les questions
 * de chaque lot, sans doublon ; les lots en échec dans `lotsNonLus`. `null` : aucun lot n'a été lu.
 */
export function fusionnerLectures(parts: readonly PartLue[], echecs: readonly { metier: string; libelle: string }[]): LectureDevis | null {
  if (parts.length === 0) return null;
  const lignes = new Map<string, LectureLigne>();
  const lots: LectureDevis["lots"] = [];
  for (const p of parts) {
    const siennes: string[] = [];
    for (const l of p.lecture.lignes) {
      if (lignes.has(l.ref)) continue;
      lignes.set(l.ref, l);
      siennes.push(l.ref);
    }
    if (siennes.length === 0) continue;
    // Les tranches d'un même lot font un seul lot.
    const deja = lots.find((x) => x.metier === p.metier);
    if (deja) deja.lignes = [...deja.lignes, ...siennes].sort(ordreDesReperes);
    else lots.push({ metier: p.metier, libelle: p.lecture.lots.find((x) => x.metier === p.metier)?.libelle ?? p.libelle, lignes: siennes.sort(ordreDesReperes) });
  }
  const nonLus = echecs.filter((e, i) => echecs.findIndex((x) => x.metier === e.metier) === i);
  const donnees: FicheDonnee[] = [];
  for (const d of parts.flatMap((p) => p.lecture.fiche.donnees)) {
    const deja = donnees.findIndex((x) => x.cle === d.cle);
    // Une donnée lue l'emporte sur la même donnée manquante dans un autre lot.
    if (deja < 0) donnees.push(d);
    else if (donnees[deja]!.valeur === null && d.valeur !== null) donnees[deja] = d;
  }
  const questions: LectureQuestion[] = [];
  for (const q of parts.flatMap((p) => p.lecture.questions)) if (!questions.some((x) => x.cle === q.cle)) questions.push(q);
  const contexte = Object.assign({}, ...parts.map((p) => p.lecture.contexte ?? {})) as Record<string, string>;
  return {
    metier: parts[0]!.metier,
    lots,
    fiche: { donnees: donnees.filter((d) => d.valeur !== null || !donnees.some((x) => x !== d && x.libelle === d.libelle && x.valeur !== null)) },
    bref: [...new Set(parts.flatMap((p) => p.lecture.bref))],
    questions,
    lignes: [...lignes.values()].sort((a, b) => ordreDesReperes(a.ref, b.ref)),
    contexte: Object.keys(contexte).length > 0 ? contexte : null,
    notes: [...new Set(parts.flatMap((p) => p.lecture.notes))],
    ...(nonLus.length > 0 ? { lotsNonLus: nonLus.map((e) => ({ metier: e.metier, libelle: e.libelle })) } : {}),
  };
}

/**
 * LES TRANCHES (vraie lecture de 7954, 24 octobre 2026 : lu lot par lot, le lot électricité seul, 274 lignes, dépassait
 * encore 16 000 jetons) : le repérage dit aussi les SECTIONS du devis (le métier de chaque bloc de lignes) ; chaque ligne
 * du texte va au métier de sa section (une ligne hors section suit la précédente : aucune ne se perd), et un lot de plus
 * de `LIGNES_PAR_TRANCHE` lignes est lu en plusieurs appels. Chaque appel ne reçoit que ses lignes.
 */
export const LIGNES_PAR_TRANCHE = 60;

export interface SectionDuDevis {
  metier: string;
  /** Les repères de la première et de la dernière ligne du bloc (« 1:001 », « 5:040 »). */
  de: string;
  a: string;
}

export interface TrancheDuDevis {
  metier: string;
  refs: string[];
  /** Les lignes numérotées de la tranche, telles quelles. */
  texte: string;
}

const REPERE = /^\[(\d+:\d+)\]/;

/** Les tranches du devis, lot par lot, dans l'ordre du devis ; `null` sans section utilisable (l'appel par lot suit). */
export function tranchesDuDevis(numberedText: string, metiers: readonly string[], sections: readonly SectionDuDevis[], max = LIGNES_PAR_TRANCHE): TrancheDuDevis[] | null {
  const valides = sections.filter((x) => metiers.includes(x.metier) && REPERE.test(`[${x.de}]`) && REPERE.test(`[${x.a}]`));
  if (valides.length === 0) return null;
  const parMetier = new Map<string, { ref: string; ligne: string }[]>(metiers.map((m) => [m, []]));
  let courant = metiers[0]!;
  for (const ligne of numberedText.split("\n")) {
    const ref = REPERE.exec(ligne.trim())?.[1];
    if (!ref) continue;
    const section = valides.find((x) => ordreDesReperes(x.de, ref) <= 0 && ordreDesReperes(ref, x.a) <= 0);
    if (section) courant = section.metier;
    parMetier.get(courant)!.push({ ref, ligne: ligne.trim() });
  }
  const tranches: TrancheDuDevis[] = [];
  for (const m of metiers) {
    const lignes = parMetier.get(m)!;
    for (let i = 0; i < lignes.length; i += max) {
      const morceau = lignes.slice(i, i + max);
      tranches.push({ metier: m, refs: morceau.map((l) => l.ref), texte: morceau.map((l) => l.ligne).join("\n") });
    }
  }
  return tranches;
}

/** La consigne d'une tranche : son lot, ses lignes toutes rendues, l'en-tête du devis pour le contexte seulement. */
export function consigneDeTranche(lot: { metier: string; libelle: string }, tous: readonly { metier: string; libelle: string }[], rang: number, total: number, entete: string): string {
  return [
    `LECTURE PAR LOT ET PAR TRANCHE : ce devis a plusieurs lots (${tous.map((l) => l.libelle).join(", ")}), lus chacun à part. Le texte ci-dessus est la tranche ${rang} sur ${total} du lot « ${lot.libelle} » (${lot.metier}), avec le référentiel ci-dessus.`,
    "- « lignes » : TOUTES les lignes de cette tranche, dans l'ordre, avec leur repère d'origine (une ligne d'un autre métier se rend ici aussi, avec ses fournitures).",
    `- « metier » : ${lot.metier} ; « lots » : un seul lot (${lot.metier}), avec les repères de ces lignes.`,
    "- « fiche », « bref » et « questions » : seulement ce que disent ces lignes (et l'en-tête) ; les autres tranches sont lues à part.",
    ...(entete.trim() ? [`EN-TÊTE DU DEVIS (pour le contexte : client, chantier, titres) :\n${entete}`] : []),
  ].join("\n");
}
