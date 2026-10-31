import {
  avecSynthese,
  consigneDeSynthese,
  consigneDeTranche,
  consigneDuLot,
  donneesAttendues,
  exportPourLecture,
  fusionnerLectures,
  ordreDesReperes,
  repereDeTranche,
  referentialFor,
  tradeProfile,
  tranchesDuDevis,
  type LectureDevis,
  type SectionDuDevis,
} from "@baticlair/domain";
import type { DocumentInput, ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { LectureReader, LectureRequest } from "./lecture-reader.js";

/** Un appel de la lecture lot par lot : son nom (« electrical 3/13 », « synthèse ») et sa tentative. */
export interface AppelDeLecture {
  nom: string;
  attempt: ReadAttempt<LectureDevis> | null;
}

export interface LectureLotParLot {
  /** La lecture du devis entier, `null` si aucun lot n'a pu être lu. */
  lecture: LectureDevis | null;
  appels: AppelDeLecture[];
  /** Le métier du premier lot lu. */
  metier: string;
  /** Le temps réel de toute la lecture (deux vagues de tranches, puis la synthèse). */
  dureeMs: number;
}

const exportDe = (m: string) => {
  const r = referentialFor(m);
  return r ? exportPourLecture(r) : "Aucun référentiel pour ce métier.";
};

/**
 * LA LECTURE LOT PAR LOT D'UN GROS DEVIS (décisions du fondateur, 24 octobre 2026), le même chemin en production et dans
 * la vraie lecture de la CI :
 * 1. Avec les sections du repérage, le devis est coupé en TRANCHES par lot ; chaque tranche ne rend QUE SES LIGNES
 *    (modèle rapide, sortie réduite aux lignes). La première tranche de chaque lot part d'abord, les autres ensuite :
 *    elles relisent alors le prompt système (référentiel) depuis le cache, au dixième du prix.
 * 2. Les lignes sont fusionnées (`fusionnerLectures`), puis UN appel de SYNTHÈSE (le modèle de lecture) relit le devis
 *    entier et écrit la fiche, le bref et les questions, dédoublonnées, avec les clés que les lignes attendent.
 * Sans section utilisable, l'ancien chemin reste : un appel complet par lot. Un lot en échec n'empêche pas les autres
 * (`lotsNonLus`) ; une synthèse en échec laisse les lignes lues, sans bref ni questions.
 */
export async function lireLotParLot(
  lecteur: LectureReader,
  document: DocumentInput,
  metiers: readonly string[],
  sections: readonly SectionDuDevis[],
  siteNotes: string | null,
): Promise<LectureLotParLot> {
  const debut = Date.now();
  const lots = metiers.map((m) => ({ metier: m, libelle: tradeProfile(m).label }));
  const tranches = tranchesDuDevis(document.numberedText, metiers, sections);
  const appels: AppelDeLecture[] = [];

  if (!tranches) {
    const requetes = lots.map((lot, i) => ({ lot, nom: lot.metier, request: { document, trade: lot.metier, tradeLabel: lot.libelle, referentiel: exportDe(lot.metier), siteNotes, consigne: consigneDuLot(lot, lots, i === 0) } as LectureRequest }));
    const essais = await Promise.all(requetes.map((r) => lecteur.lire(r.request)));
    requetes.forEach((r, i) => appels.push({ nom: r.nom, attempt: essais[i] ?? null }));
    const lus = (i: number) => essais[i]?.status === "success" && essais[i]!.output;
    const lecture = fusionnerLectures(
      requetes.flatMap((r, i) => (lus(i) ? [{ ...r.lot, lecture: essais[i]!.output! }] : [])),
      requetes.filter((_, i) => !lus(i)).map((r) => r.lot),
    );
    return { lecture, appels, metier: lecture?.lots[0]?.metier ?? metiers[0]!, dureeMs: Date.now() - debut };
  }

  // 1. Les tranches : le texte de leurs lignes seulement (les pages scannées n'y sont pas : leurs lignes n'ont pas de texte).
  const entete = document.numberedText.split("\n").slice(0, 12).join("\n");
  const requetes = tranches.map((t) => {
    const lot = lots.find((l) => l.metier === t.metier)!;
    const siennes = tranches.filter((x) => x.metier === t.metier);
    const rang = siennes.indexOf(t) + 1;
    return {
      lot,
      rang,
      nom: `${t.metier} ${rang}/${siennes.length} (${t.refs.length} lignes)`,
      request: {
        document: { numberedText: t.texte, imagePdf: null, imagePages: [] },
        trade: lot.metier,
        tradeLabel: lot.libelle,
        referentiel: exportDe(lot.metier),
        siteNotes,
        consigne: consigneDeTranche(lot, lots, rang, siennes.length, entete),
        etape: "lignes",
      } satisfies LectureRequest,
    };
  });
  const essais: (ReadAttempt<LectureDevis> | null)[] = new Array(requetes.length).fill(null);
  const lancer = async (indices: number[]) => {
    const r = await Promise.all(indices.map((i) => lecteur.lire(requetes[i]!.request)));
    indices.forEach((i, k) => (essais[i] = r[k] ?? null));
  };
  const premieres = requetes.flatMap((r, i) => (r.rang === 1 ? [i] : []));
  await lancer(premieres);
  await lancer(requetes.flatMap((r, i) => (r.rang === 1 ? [] : [i])));
  requetes.forEach((r, i) => appels.push({ nom: r.nom, attempt: essais[i] ?? null }));
  await rattraperLesOublis(lecteur, tranches, requetes, essais, appels);
  const lu = (i: number) => essais[i]?.status === "success" && essais[i]!.output;
  const lignes = fusionnerLectures(
    requetes.flatMap((r, i) => (lu(i) ? [{ ...r.lot, lecture: essais[i]!.output! }] : [])),
    requetes.filter((_, i) => !lu(i)).map((r) => r.lot),
  );
  if (!lignes) return { lecture: null, appels, metier: metiers[0]!, dureeMs: Date.now() - debut };

  // 2. La synthèse du devis entier : fiche, bref, questions.
  const synthese = await lecteur.lire({
    document,
    trade: lots[0]!.metier,
    tradeLabel: lots[0]!.libelle,
    referentiel: lots.map((l) => `=== Référentiel ${l.libelle} (${l.metier}) ===\n${exportDe(l.metier)}`).join("\n\n"),
    siteNotes,
    consigne: consigneDeSynthese(lots, donneesAttendues(lignes)),
    etape: "synthese",
  });
  appels.push({ nom: "synthèse", attempt: synthese });
  const lecture = synthese?.status === "success" && synthese.output ? avecSynthese(lignes, synthese.output) : lignes;
  return { lecture, appels, metier: lignes.lots[0]?.metier ?? metiers[0]!, dureeMs: Date.now() - debut };
}

/** Une ligne numérotée du devis (« [5:040] MANCHON … 25,000 U 4,50 112,50 ») par son repère. */
const ligneDuTexte = (texte: string, ref: string) => texte.split("\n").find((l) => l.startsWith(`[${ref}]`)) ?? null;

/**
 * La désignation d'une ligne du devis telle qu'écrite, sans son repère ni les colonnes de chiffres de la fin (quantité,
 * unité, prix) : jamais un prix dans la liste ni chez le négoce.
 */
export function designationTelleQuEcrite(ligne: string): string {
  return ligne
    .replace(/^\[\d+:\d+\]\s*/, "")
    .replace(/^L\d+\s+/, "")
    .replace(/(\s+(?:[\d\s]*\d[\d\s.,]*\s*(?:€|EUR|HT|TTC)?|u|U|ml|ML|m²|M2|m2|m|ens|ENS|ft|FT|fft|FFT|h|H|kg|KG|forfait|%))+\s*$/, "")
    .trim();
}

/**
 * AUCUNE LIGNE OUBLIÉE (§49.1 : un article écrit ne disparaît jamais ; 4e vraie lecture du 24 octobre 2026 : « MANCHON
 * REGLABE LG 100MM HYGRO », ligne 281 de 7954, rendu par aucune tranche). Chaque repère d'une tranche lue doit revenir,
 * sauf ceux que le code a écartés exprès (titre vide, suite recollée). Les oubliés repartent UNE fois au modèle, seuls
 * (une petite tranche) ; ce qui manque encore entre tel qu'écrit, sans quantité inventée : la ligne reste à régler.
 */
async function rattraperLesOublis(
  lecteur: LectureReader,
  tranches: readonly { metier: string; refs: string[]; texte: string }[],
  requetes: readonly { lot: { metier: string; libelle: string }; rang: number; request: LectureRequest }[],
  essais: (ReadAttempt<LectureDevis> | null)[],
  appels: AppelDeLecture[],
): Promise<void> {
  // Les repères écrits autrement par le modèle reprennent d'abord la forme de leur tranche : ce ne sont pas des oublis.
  essais.forEach((e, i) => {
    if (e?.status !== "success" || !e.output) return;
    const refs = tranches[i]!.refs;
    essais[i] = { ...e, output: { ...e.output, lignes: e.output.lignes.map((l) => ({ ...l, ref: repereDeTranche(l.ref, refs) })), ecartees: (e.output.ecartees ?? []).map((x) => repereDeTranche(x, refs)) } };
  });
  const oublis = (i: number, lecture: LectureDevis) => tranches[i]!.refs.filter((ref) => !lecture.lignes.some((l) => l.ref === ref) && !(lecture.ecartees ?? []).includes(ref));
  const relances = essais.flatMap((e, i) => {
    if (e?.status !== "success" || !e.output) return [];
    const refs = oublis(i, e.output);
    return refs.length > 0 ? [{ i, refs }] : [];
  });
  if (relances.length === 0) return;
  const reponses = await Promise.all(
    relances.map(({ i, refs }) => {
      const texte = refs.map((ref) => ligneDuTexte(tranches[i]!.texte, ref)).filter((l): l is string => !!l).join("\n");
      const r = requetes[i]!.request;
      return lecteur.lire({ ...r, document: { numberedText: texte, imagePdf: null, imagePages: [] }, consigne: `${r.consigne ?? ""}\n- RATTRAPAGE : ces lignes ont été oubliées à la première lecture de la tranche ; rends-les TOUTES, une par repère.` });
    }),
  );
  relances.forEach(({ i, refs }, k) => {
    const r = reponses[k] ?? null;
    appels.push({ nom: `${tranches[i]!.metier} : ${refs.length} ligne(s) oubliée(s), relues`, attempt: r });
    const lecture = essais[i]!.output!;
    const rendues = r?.status === "success" && r.output ? r.output.lignes.map((l) => ({ ...l, ref: repereDeTranche(l.ref, refs) })).filter((l) => refs.includes(l.ref)) : [];
    const ecartees = r?.status === "success" && r.output ? (r.output.ecartees ?? []).map((x) => repereDeTranche(x, refs)).filter((x) => refs.includes(x)) : [];
    const encore = refs.filter((ref) => !rendues.some((l) => l.ref === ref) && !ecartees.includes(ref));
    const telles = encore.flatMap((ref) => {
      const ligne = ligneDuTexte(tranches[i]!.texte, ref);
      const designation = ligne ? designationTelleQuEcrite(ligne) : "";
      if (!designation) return [];
      return [{ ref, designation, quantite: null, unite: null, role: "fourniture" as const, fournitures: [{ nom: designation, quantite: null, unite: null, ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }] }];
    });
    essais[i] = { ...essais[i]!, output: { ...lecture, lignes: [...lecture.lignes, ...rendues, ...telles].sort((a, b) => ordreDesReperes(a.ref, b.ref)), ecartees: [...(lecture.ecartees ?? []), ...ecartees] } };
  });
}
