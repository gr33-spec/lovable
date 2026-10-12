import { lignesDeLecture, planDeLecture, type CompanyPreferences, type EngineOptions, type LectureDevis, type QuotePlan, type QuoteLineReading, type Referential, type SiteFact } from "../../src/index.js";
/** La question des consommables (§49.1 point 4), telle que le modèle la pose pour tout le chantier. */
export const QUESTION_CONSOMMABLES: LectureDevis["questions"][number] = { cle: "consommables", texte: "Consommables de pose (pointes, vis, pattes, étain, silicone) : je les ajoute à la liste ?", boutons: [{ label: "Oui", valeur: "1" }, { label: "Non", valeur: "0" }], unite: "u", donnee: "consommables", ligne: null };

import { lectureEnregistree } from "./lectures.js";
import type { QuoteLineInput } from "./read-quote.js";

/** Le plan du calcul (ouvrages, emplacements, données) tel que la LECTURE ENREGISTRÉE du devis le donne (§51.5). */
export function planOf(ref: Referential, bench: readonly QuoteLineInput[], extraFacts: readonly SiteFact[] = [], preferences: CompanyPreferences = {}, options: EngineOptions = {}, readings?: ReadonlyMap<string, QuoteLineReading>): QuotePlan {
  const lecture = lectureEnregistree(ref, bench, extraFacts, preferences, options, readings);
  return planDeLecture(ref, lecture, lignesDeLecture(lecture), extraFacts);
}

/** Une lecture écrite à la main : chaque ligne nomme sa fourniture, son ouvrage et son emplacement (ce que rend le modèle). */
export function lectureSimple(lines: readonly { ref: string; designation: string; quantity: string | null; unit: string | null; ouvrage: string; emplacement: string; donnees?: Record<string, string> }[], questions: LectureDevis["questions"] = []): LectureDevis {
  return {
    metier: null,
    lots: [],
    fiche: { donnees: [] },
    bref: [],
    questions,
    lignes: lines.map((l) => ({
      ref: l.ref,
      designation: l.designation,
      quantite: l.quantity,
      unite: l.unit,
      role: "fourniture",
      fournitures: [{ nom: l.designation, quantite: l.quantity, unite: l.unit, ouvrage: l.ouvrage, emplacement: l.emplacement, donnees: l.donnees ?? {}, attend: [], aPreciser: [], precision: null }],
    })),
    contexte: null,
    notes: [],
  };
}
