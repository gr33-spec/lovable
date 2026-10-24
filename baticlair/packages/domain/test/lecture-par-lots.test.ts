import { describe, expect, it } from "vitest";
import { consigneDeTranche, consigneDuLot, fusionnerLectures, tranchesDuDevis, lectureParLots, LIGNES_LECTURE_PAR_LOTS, ordreDesReperes, parseLecture, phraseLotNonLu, type LectureDevis } from "../src/index.js";

/**
 * LA LECTURE LOT PAR LOT (décision du fondateur, 24 octobre 2026, « option 1 ») : un gros devis de plusieurs métiers est lu
 * en un appel par métier, puis les lectures sont fusionnées ; un lot en échec est dit, les autres restent ; un devis d'un
 * seul métier garde l'appel unique.
 */
const ligne = (ref: string, designation: string) => ({ ref, designation, quantite: "1", unite: "u", role: "fourniture" as const, fournitures: [] });
const lecture = (metier: string, refs: [string, string][], extra: Partial<LectureDevis> = {}): LectureDevis => ({
  metier,
  lots: [{ metier, libelle: metier, lignes: refs.map((r) => r[0]) }],
  fiche: { donnees: [] },
  bref: [],
  questions: [],
  lignes: refs.map(([r, d]) => ligne(r, d)),
  contexte: null,
  notes: [],
  ...extra,
});

describe("lecture lot par lot", () => {
  it("seulement un gros devis de plusieurs métiers", () => {
    const gros = Array.from({ length: LIGNES_LECTURE_PAR_LOTS + 1 }, (_, i) => `[1:${i}] ligne`).join("\n");
    expect(lectureParLots(["electrical", "plumbing"], gros)).toBe(true);
    expect(lectureParLots(["electrical"], gros)).toBe(false);
    expect(lectureParLots(["electrical", "plumbing"], "[1:001] Prise\n[1:002] Mitigeur")).toBe(false);
  });

  it("fusion : chaque ligne une fois, dans l'ordre du devis, un lot par appel, questions et bref sans doublon", () => {
    const elec = lecture("electrical", [["1:002", "Prise 16 A"], ["1:010", "Installation de chantier"]], { bref: ["Rénovation d'un logement."], questions: [{ cle: "gamme_appareillage", texte: "Quelle gamme ?", boutons: [], unite: null, donnee: "gamme", ligne: null }] });
    const plomb = lecture("plumbing", [["1:003", "Mitigeur"], ["1:010", "Installation de chantier"]], { bref: ["Rénovation d'un logement.", "4 mitigeurs."], questions: [{ cle: "gamme_appareillage", texte: "Quelle gamme ?", boutons: [], unite: null, donnee: "gamme", ligne: null }] });
    const f = fusionnerLectures([{ metier: "electrical", libelle: "Électricité", lecture: elec }, { metier: "plumbing", libelle: "Plomberie", lecture: plomb }], [])!;
    expect(f.lignes.map((l) => l.ref)).toEqual(["1:002", "1:003", "1:010"]);
    expect(f.lots).toEqual([
      { metier: "electrical", libelle: "electrical", lignes: ["1:002", "1:010"] },
      { metier: "plumbing", libelle: "plumbing", lignes: ["1:003"] },
    ]);
    expect(f.bref).toEqual(["Rénovation d'un logement.", "4 mitigeurs."]);
    expect(f.questions).toHaveLength(1);
    expect(f.metier).toBe("electrical");
    expect(f.lotsNonLus).toBeUndefined();
  });

  it("un lot en échec : les autres restent, sa partie est dite, et la lecture gardée en base le garde", () => {
    const elec = lecture("electrical", [["1:002", "Prise 16 A"]]);
    const f = fusionnerLectures([{ metier: "electrical", libelle: "Électricité", lecture: elec }], [{ metier: "hvac", libelle: "Chauffage-ventilation" }])!;
    expect(f.lignes).toHaveLength(1);
    expect(f.lotsNonLus).toEqual([{ metier: "hvac", libelle: "Chauffage-ventilation" }]);
    expect(parseLecture(JSON.parse(JSON.stringify(f)))!.lotsNonLus).toEqual([{ metier: "hvac", libelle: "Chauffage-ventilation" }]);
    expect(phraseLotNonLu("Chauffage-ventilation")).toBe("Je n'ai pas pu lire la partie chauffage-ventilation, ajoute-la à la main ou renvoie-la.");
    expect(fusionnerLectures([], [{ metier: "hvac", libelle: "Chauffage" }])).toBeNull();
  });

  it("la consigne : ce lot seul ; le lot principal garde aussi les lignes sans lot", () => {
    const lots = [{ metier: "electrical", libelle: "Électricité" }, { metier: "plumbing", libelle: "Plomberie" }];
    expect(consigneDuLot(lots[0]!, lots, true)).toMatch(/SEULEMENT le lot « Électricité ».*\n.*PLUS celles qui ne relèvent d'aucun lot/s);
    expect(consigneDuLot(lots[1]!, lots, false)).not.toMatch(/aucun lot \(/);
    expect(ordreDesReperes("1:010", "2:001")).toBeLessThan(0);
    expect(ordreDesReperes("12", "3")).toBeGreaterThan(0);
  });
});

describe("les tranches d'un gros lot", () => {
  const texte = Array.from({ length: 150 }, (_, i) => `[1:${String(i + 1).padStart(3, "0")}] ligne ${i + 1}`).join("\n");
  it("chaque ligne va au métier de sa section, une ligne hors section suit la précédente, un lot long se coupe", () => {
    const t = tranchesDuDevis(texte, ["electrical", "plumbing"], [
      { metier: "electrical", de: "1:003", a: "1:130" },
      { metier: "plumbing", de: "1:136", a: "1:150" },
    ], 60)!;
    // 1:001-1:002 (avant toute section) au principal ; 1:131-1:135 (hors section) suivent l'électricité.
    expect(t.map((x) => [x.metier, x.refs.length])).toEqual([["electrical", 60], ["electrical", 60], ["electrical", 15], ["plumbing", 15]]);
    expect(t.flatMap((x) => x.refs)).toHaveLength(150);
    expect(t[3]!.texte.split("\n")[0]).toBe("[1:136] ligne 136");
  });
  it("sans section utilisable : null (le devis entier part à chaque lot)", () => {
    expect(tranchesDuDevis(texte, ["electrical", "plumbing"], [])).toBeNull();
    expect(tranchesDuDevis(texte, ["electrical", "plumbing"], [{ metier: "hvac", de: "1:001", a: "1:002" }])).toBeNull();
  });
  it("les tranches d'un même lot font un seul lot ; un lot non lu se dit une fois", () => {
    const a = lecture("electrical", [["1:001", "Prise"]]);
    const b = lecture("electrical", [["1:070", "Prise"]]);
    const f = fusionnerLectures([{ metier: "electrical", libelle: "Électricité", lecture: a }, { metier: "electrical", libelle: "Électricité", lecture: b }], [{ metier: "plumbing", libelle: "Plomberie" }, { metier: "plumbing", libelle: "Plomberie" }])!;
    expect(f.lots).toEqual([{ metier: "electrical", libelle: "electrical", lignes: ["1:001", "1:070"] }]);
    expect(f.lotsNonLus).toEqual([{ metier: "plumbing", libelle: "Plomberie" }]);
    expect(consigneDeTranche({ metier: "electrical", libelle: "Électricité" }, [{ metier: "electrical", libelle: "Électricité" }], 2, 3, "[1:001] DEVIS")).toMatch(/tranche 2 sur 3 du lot « Électricité »/);
    // Vraie lecture du 24 octobre 2026 : la désignation est recopiée, jamais reformulée.
    expect(consigneDeTranche({ metier: "electrical", libelle: "Électricité" }, [{ metier: "electrical", libelle: "Électricité" }], 1, 3, "")).toMatch(/« designation » : le texte de la ligne recopié tel quel.*jamais reformulé/);
  });
});
