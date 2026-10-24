import {
  avecSynthese,
  consigneDeSynthese,
  consigneDeTranche,
  consigneDuLot,
  donneesAttendues,
  exportPourLecture,
  fusionnerLectures,
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
