/**
 * D.2026.105 (retour du fondateur, 2026-10-12, capture iPhone) : « Tout à l'heure j'avais les questions, là j'ai pas eu !
 * Tout à l'heure ça me demandait la couleur et le modèle. » Une lecture a rendu la tuile « identique à l'existant » sans
 * question ni « à préciser » : la ligne est sortie verte, sans modèle ni teinte (§49.2 : une donnée manquante n'est
 * jamais verte ; CLAUDE.md, tuiles : « modèle douteux → question »). Le prompt `lecture_devis` v4 en fait UNE question
 * de l'article ; le contrôle de la vraie lecture (`controleLectureD2026105`) refuse toute lecture qui la perd.
 */
import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, controleLectureD2026105, ecranDeLecture, parseFiche, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";
import { D2026_105_LINES } from "./devis-reels/d2026-105.js";

const devis = D2026_105_LINES.map((l) => ({ ref: l.ref, designation: l.designation }));
const lecture = (tuile: { attend: string[]; aPreciser: string[] }, questions: LectureDevis["questions"]): LectureDevis => ({
  metier: "roofing",
  lots: [],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "réparation de couverture en tuiles", origine: "lue", preuve: "ligne 1" }])!,
  bref: ["Réparation d'une couverture en tuiles existante, pas de couverture neuve"],
  questions,
  lignes: [
    { ref: "1", designation: D2026_105_LINES[0]!.designation, quantite: "20", unite: "u", role: "fourniture_et_pose", fournitures: [{ nom: "Tuile terre cuite mécanique", quantite: "20", unite: "u", ouvrage: null, emplacement: null, donnees: {}, attend: tuile.attend, aPreciser: tuile.aPreciser, precision: null }] },
    { ref: "2", designation: D2026_105_LINES[1]!.designation, quantite: "1.5", unite: "h", role: "pose", fournitures: [] },
    { ref: "3", designation: D2026_105_LINES[2]!.designation, quantite: "1", unite: "u", role: "pose", fournitures: [] },
    { ref: "4", designation: D2026_105_LINES[3]!.designation, quantite: "1", unite: "fft", role: "hors_quantitatif", fournitures: [] },
  ],
  contexte: {},
  notes: [],
});
const QUESTION = { cle: "modele_tuile", texte: "Quelle tuile : modèle et teinte ?", boutons: [], unite: null, donnee: "modèle et teinte de la tuile", ligne: "1" };
const statut = (l: LectureDevis, answers = {}) => {
  const v = applyRuleConfirmations(ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: l, answers }).purchase, answers);
  return v.screen.groups.flatMap((g) => g.rows).map((r) => r.status);
};

describe("D.2026.105 : le modèle et la teinte de la tuile ne se perdent jamais", () => {
  it("la lecture de la capture (aucune question, rien à préciser) est refusée par le contrôle de la vraie lecture", () => {
    const capture = lecture({ attend: [], aPreciser: [] }, []);
    expect(statut(capture)).toEqual(["ok"]);
    expect(controleLectureD2026105(capture, devis)).toEqual(["Question absente : modèle et teinte de la tuile", "Tuile sans question ni « à préciser » : « Tuile terre cuite mécanique » sortirait verte sans modèle ni teinte"]);
  });

  it("la lecture attendue : UNE question, que la tuile attend ; orange jusqu'à la réponse, puis verte", () => {
    const bonne = lecture({ attend: ["modele_tuile"], aPreciser: [] }, [QUESTION]);
    expect(controleLectureD2026105(bonne, devis)).toEqual([]);
    expect(statut(bonne)).toEqual(["check"]);
    expect(statut(bonne, { "fiche:modele_tuile": "Huguenot H10 rouge vieilli" })).toEqual(["ok"]);
  });
});
