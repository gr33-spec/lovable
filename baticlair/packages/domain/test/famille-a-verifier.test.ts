/**
 * Greg, 7 novembre 2026 (prompt maître, point 6, décision) : la famille se lit dans le TITRE de la section (le lot) ;
 * aucune étiquette répétée sur chaque ligne ; seule une ligne dont la famille est incertaine (aucun lot ne la citait,
 * rangée au lot principal faute de mieux) porte « Famille à vérifier ».
 */
import { describe, expect, it } from "vitest";
import { ecranParLots, parseFiche, referentialFor, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";

const f = (nom: string, quantite: string, unite: string, ouvrage: string | null = null) => ({ nom, quantite, unite, ouvrage, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null });
const lecture: LectureDevis = {
  metier: "electrical",
  lots: [
    { metier: "electrical", libelle: "Électricité", lignes: ["1"] },
    { metier: "plumbing", libelle: "Sanitaire", lignes: ["2"] },
  ],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "4 logements", origine: "lue", preuve: "en-tête" }])!,
  bref: ["Transformation d'un immeuble en 4 logements"],
  questions: [],
  lignes: [
    { ref: "1", designation: "Prise de courant 16A", quantite: "9", unite: "u", role: "fourniture_et_pose", fournitures: [f("Prise de courant 16 A 2P+T", "9", "u", "prise-16a")] },
    { ref: "2", designation: "Mitigeur lavabo chromé", quantite: "4", unite: "u", role: "fourniture_et_pose", fournitures: [f("Mitigeur lavabo chromé", "4", "u")] },
    // Aucun lot ne cite cette ligne : elle va au lot principal, sa famille est incertaine.
    { ref: "3", designation: "Silicone sanitaire blanc", quantite: "6", unite: "u", role: "fourniture_et_pose", fournitures: [f("Silicone sanitaire blanc", "6", "u")] },
  ],
  contexte: {},
  notes: [],
};

describe("la famille sur les lignes", () => {
  it("le titre de section dit la famille ; seule la ligne non rangée porte « Famille à vérifier »", () => {
    const e = ecranParLots({ ref: ROOFING_REFERENTIAL, lecture, refDe: (m) => referentialFor(m) });
    expect(e.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Sanitaire"]);
    const rows = e.purchase.screen.groups.flatMap((g) => g.rows);
    const incertaines = rows.filter((r) => r.familleIncertaine);
    expect(incertaines).toHaveLength(1);
    expect(incertaines[0]!.lineIds).toEqual(["3"]);
    expect(rows.filter((r) => r.lineIds.includes("1") || r.lineIds.includes("2")).every((r) => !r.familleIncertaine)).toBe(true);
  });
});
