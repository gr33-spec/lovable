/**
 * §52, LA CARTE « LOTS REPÉRÉS » (directive du fondateur, 2026-10-13) : « après la lecture, une carte « Lots repérés :
 * Électricité · VMC · Sanitaire » avec un bouton par lot pour le retirer et « Ajouter un lot », puis « C'est bon ». Ne
 * s'affiche que si plus d'un lot. » La réponse (`lots:confirmes`) décide du calcul lot par lot : un lot retiré rend ses
 * lignes au lot principal (rien ne disparaît, §49.1), un lot ajouté prend les lignes dont l'ouvrage est le sien.
 */
import { describe, expect, it } from "vitest";
import { ecranParLots, LOTS_KEY, lotsRetenus, parseFiche, referentialFor, ROOFING_REFERENTIAL, type LectureDevis } from "../src/index.js";

const f = (nom: string, quantite: string, unite: string, ouvrage: string | null = null, emplacement: string | null = null) => ({ nom, quantite, unite, ouvrage, emplacement, donnees: {}, attend: [], aPreciser: [], precision: null });
const lecture: LectureDevis = {
  metier: "electrical",
  lots: [
    { metier: "electrical", libelle: "Électricité", lignes: ["1", "2", "4"] },
    { metier: "vmc", libelle: "VMC", lignes: ["5"] },
    { metier: "plumbing", libelle: "Sanitaire", lignes: ["3"] },
  ],
  fiche: parseFiche([{ donnee: "ouvrage", valeur: "4 logements", origine: "lue", preuve: "en-tête" }])!,
  bref: ["Transformation d'un immeuble en 4 logements"],
  questions: [],
  lignes: [
    { ref: "1", designation: "Prise de courant 16A", quantite: "9", unite: "u", role: "fourniture_et_pose", fournitures: [f("Prise de courant 16 A 2P+T", "9", "u", "prise-16a")] },
    { ref: "2", designation: "Prise de courant 16A", quantite: "6", unite: "u", role: "fourniture_et_pose", fournitures: [f("Prise de courant 16 A 2P+T", "6", "u", "prise-16a")] },
    { ref: "3", designation: "Mitigeur lavabo chromé", quantite: "4", unite: "u", role: "fourniture_et_pose", fournitures: [f("Mitigeur lavabo chromé", "4", "u")] },
    { ref: "4", designation: "Climatiseur mural 2,5 kW", quantite: "1", unite: "u", role: "fourniture_et_pose", fournitures: [f("Climatiseur mural 2,5 kW", "1", "u", "split", "ouvrage")] },
    { ref: "5", designation: "Bouche d'extraction VMC", quantite: "3", unite: "u", role: "fourniture_et_pose", fournitures: [f("Bouche d'extraction VMC", "3", "u")] },
  ],
  contexte: {},
  notes: [],
};
const ecran = (reponse?: string) => ecranParLots({ ref: ROOFING_REFERENTIAL, lecture, answers: reponse === undefined ? {} : { [LOTS_KEY]: reponse }, refDe: (m) => referentialFor(m) });
const sections = (e: ReturnType<typeof ecran>) => e.purchase.screen.groups.filter((g) => g.key.startsWith("lot:")).map((g) => [g.label, g.rows.map((r) => e.purchase.toBuy.find((b) => b.key === r.itemKey)?.label ?? r.itemKey)] as const);
const toutes = (e: ReturnType<typeof ecran>) => e.purchase.screen.groups.flatMap((g) => g.rows.map((r) => e.purchase.toBuy.find((b) => b.key === r.itemKey)?.label ?? ""));

describe("§52 : la carte « Lots repérés » décide des lots du calcul", () => {
  it("sans réponse, les lots de la lecture, tels quels", () => {
    expect(lotsRetenus(lecture, undefined)).toBe(lecture.lots);
    expect(sections(ecran()).map(([l]) => l)).toEqual(["Électricité", "VMC", "Sanitaire"]);
  });

  it("un lot retiré rend ses lignes au lot principal : rien ne disparaît (§49.1)", () => {
    const e = ecran("electrical,plumbing");
    expect(sections(e).map(([l]) => l)).toEqual(["Électricité", "Sanitaire"]);
    expect(sections(e)[0]![1]).toContainEqual(expect.stringMatching(/Bouche d'extraction/));
  });

  it("un seul lot gardé : une seule liste, sans section, toutes les lignes, calculée par le tiroir de ce lot", () => {
    const e = ecran("electrical");
    expect(e.lots).toEqual([]);
    expect(e.purchase.screen.groups.some((g) => g.key.startsWith("lot:"))).toBe(false);
    expect(toutes(e)).toEqual(expect.arrayContaining([expect.stringMatching(/Mitigeur lavabo/), expect.stringMatching(/Bouche d'extraction/), expect.stringMatching(/^Prise 2P\+T 16 A/)]));
  });

  it("un lot ajouté prend les lignes dont l'ouvrage nommé par le modèle est le sien (jamais un mot de la désignation)", () => {
    const lots = lotsRetenus(lecture, "electrical,vmc,plumbing,hvac");
    expect(lots.map((l) => [l.libelle, l.lignes])).toEqual([
      ["Électricité", ["1", "2"]],
      ["VMC", ["5"]],
      ["Sanitaire", ["3"]],
      ["Chauffage, ventilation (PAC, VMC, clim)", ["4"]],
    ]);
    expect(sections(ecran("electrical,vmc,plumbing,hvac")).map(([l]) => l)).toEqual(["Électricité", "VMC", "Sanitaire", "Chauffage, ventilation (PAC, VMC, clim)"]);
  });

  it("un lot ajouté sans aucune ligne à lui ne fait pas de section vide", () => {
    expect(sections(ecran("electrical,vmc,plumbing,masonry")).map(([l]) => l)).toEqual(["Électricité", "VMC", "Sanitaire"]);
  });
});
