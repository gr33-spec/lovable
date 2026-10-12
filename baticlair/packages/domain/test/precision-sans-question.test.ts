/**
 * Retour du fondateur (2026-10-12, PDF fournisseur, ligne « Tuyau de descente eaux pluviales Ø100 mm · 3 m », précision
 * « Ta descente Ø100 en façade, tu la prends en PVC, en zinc ou en alu : Zinc ») : « Ce document sert au négoce, ça ne
 * sert à rien qu'il voie les questions que tu m'as posées ! Là il faut juste lui donner l'info comme quoi le tuyau est en
 * zinc. » Une réponse s'écrit avec le nom court de la donnée (« Matière de la descente : Zinc »), jamais avec la question.
 */
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseFiche, reponseLue, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";

const QUESTION = { cle: "matiere_descente", texte: "Ta descente Ø100 en façade, tu la prends en PVC, en zinc ou en alu ?", boutons: [{ label: "PVC", valeur: "PVC" }, { label: "Zinc", valeur: "Zinc" }, { label: "Alu", valeur: "Alu" }], unite: null, donnee: "matière de la descente", ligne: "1" };
const lecture: LectureDevis = {
  metier: "roofing",
  lots: [],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "toiture-terrasse", origine: "lue", preuve: "ligne 1" }])!,
  bref: ["Tuyau de descente 3 m, Ø100 mm, en façade"],
  questions: [QUESTION],
  lignes: [
    { ref: "1", designation: "Tuyau de descente eaux pluviales Ø100 mm", quantite: "3", unite: "ml", role: "fourniture_et_pose", fournitures: [{ nom: "Tuyau de descente eaux pluviales Ø100 mm", quantite: "3", unite: "m", ouvrage: null, emplacement: null, donnees: {}, attend: ["matiere_descente"], aPreciser: [], precision: "Descente en façade, hauteur 3 m" }] },
  ],
  contexte: {},
  notes: [],
};

describe("la précision dit l'info au négoce, jamais la question posée à l'artisan", () => {
  it("« Ta descente Ø100 … : Zinc » devient « Matière de la descente : Zinc »", () => {
    const v = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers: { "fiche:matiere_descente": "Zinc" } }).purchase;
    const tuyau = v.toBuy.find((b) => /^Tuyau de descente/.test(b.label))!;
    expect(tuyau.precision).toBe("Descente en façade, hauteur 3 m ; Matière de la descente : Zinc");
    expect(tuyau.precision).not.toMatch(/\btu\b|\bta\b|\?/i);
  });

  it("le nom court de la donnée, ou la valeur seule quand la donnée est écrite comme une question", () => {
    expect(reponseLue("matière de la descente", "Zinc")).toBe("Matière de la descente : Zinc");
    expect(reponseLue("Fenêtre de toit : quelle taille", "78 × 118")).toBe("78 × 118");
    expect(reponseLue("ta descente, tu la prends en quoi", "Zinc")).toBe("Zinc");
  });
});
