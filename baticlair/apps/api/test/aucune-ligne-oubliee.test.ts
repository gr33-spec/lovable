import { describe, expect, it } from "vitest";
import type { LectureDevis, LectureLigne } from "@baticlair/domain";
import { designationTelleQuEcrite, lireLotParLot } from "../src/modules/takeoff/application/lecture-par-lots.js";
import type { LectureReader, LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";

/**
 * AUCUNE LIGNE OUBLIÉE (§49.1 : un article écrit ne disparaît jamais ; 4e vraie lecture du 24 octobre 2026 : la ligne 281
 * de 7954, « MANCHON REGLABE LG 100MM HYGRO 25 », rendue par aucune tranche). Les repères qu'une tranche ne rend pas, hors
 * ceux que le code écarte exprès, repartent une fois au modèle ; ce qui manque encore entre tel qu'écrit, sans prix et sans
 * quantité inventée.
 */
const lignesDuTexte = (texte: string) =>
  texte
    .split("\n")
    .map((l) => /^\[(\d+:\d+)\]\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ ref: m[1]!, texte: m[2]! }));

const ligne = (ref: string, designation: string): LectureLigne => ({ ref, designation, quantite: "25", unite: "u", role: "fourniture", fournitures: [{ nom: designation, quantite: "25", unite: "u", ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }] });
const lecture = (lignes: LectureLigne[], ecartees: string[] = []): LectureDevis => ({ metier: "hvac", lots: [], fiche: { donnees: [] }, bref: [], questions: [], lignes, contexte: null, notes: [], ecartees });
const succes = (output: LectureDevis): ReadAttempt<LectureDevis> => ({ status: "success", output, provider: "fake", model: "fake", usage: { inputTokens: 1, outputTokens: 1 }, errorCode: null, durationMs: 1 }) as ReadAttempt<LectureDevis>;

/** Un modèle qui oublie certains repères (`oublis`), à la première lecture seulement ou toujours. */
function lecteur(oublis: string[], toujours: boolean, titres: string[] = [], forme: (ref: string) => string = (r) => r) {
  const vus: string[] = [];
  const l: Pick<LectureReader, "lire"> = {
    async lire(r: LectureRequest) {
      if (r.etape === "synthese") return succes(lecture([]));
      const rattrapage = /RATTRAPAGE/.test(r.consigne ?? "");
      vus.push(rattrapage ? `rattrapage:${lignesDuTexte(r.document.numberedText).map((x) => x.ref).join(",")}` : "tranche");
      const rendues = lignesDuTexte(r.document.numberedText).filter((x) => !titres.includes(x.ref) && (!oublis.includes(x.ref) || (rattrapage && !toujours)));
      return succes(lecture(rendues.map((x) => ligne(forme(x.ref), x.texte.replace(/\s+25,000.*$/, ""))), titres.filter((t) => r.document.numberedText.includes(`[${t}]`)).map(forme)));
    },
  };
  return { lecteur: l as LectureReader, vus };
}

const TEXTE = [
  "[5:037] VMC SIMPLE FLUX",
  "[5:038] KIT ALDES BAHIA OPTIMA MICROWATT 10,000 U 210,00 2 100,00",
  "[5:039] BOUCHE ENTREE D'AIR HYGRO 6/45 CLAS 30 25,000 U 8,50 212,50",
  "[5:040] MANCHON REGLABE LG 100MM HYGRO 25,000 U 4,50 112,50",
].join("\n");
const SECTIONS = [{ metier: "hvac", de: "5:037", a: "5:040" }];
const lire = (l: LectureReader) => lireLotParLot(l, { numberedText: TEXTE, imagePdf: null, imagePages: [] }, ["hvac", "electrical"], SECTIONS, null);

describe("aucune ligne oubliée", () => {
  it("une ligne oubliée par la tranche repart seule au modèle et revient", async () => {
    const { lecteur: l, vus } = lecteur(["5:040"], false, ["5:037"]);
    const r = await lire(l);
    expect(vus).toEqual(["tranche", "rattrapage:5:040"]);
    expect(r.lecture!.lignes.map((x) => x.ref)).toEqual(["5:038", "5:039", "5:040"]);
    expect(r.lecture!.lignes.at(-1)!.designation).toBe("MANCHON REGLABE LG 100MM HYGRO");
    expect(r.appels.map((a) => a.nom)).toContain("hvac : 1 ligne(s) oubliée(s), relues");
  });

  it("toujours oubliée : elle entre telle qu'écrite, sans prix ni quantité inventée ; un titre écarté par le code ne revient pas", async () => {
    const { lecteur: l } = lecteur(["5:040"], true, ["5:037"]);
    const r = await lire(l);
    const manchon = r.lecture!.lignes.find((x) => x.ref === "5:040")!;
    expect(manchon).toMatchObject({ designation: "MANCHON REGLABE LG 100MM HYGRO", quantite: null, role: "fourniture" });
    expect(manchon.fournitures[0]).toMatchObject({ nom: "MANCHON REGLABE LG 100MM HYGRO", quantite: null });
    expect(r.lecture!.lignes.some((x) => x.ref === "5:037")).toBe(false);
  });

  it("rien d'oublié : aucun appel de plus", async () => {
    const { lecteur: l, vus } = lecteur([], false, ["5:037"]);
    await lire(l);
    expect(vus).toEqual(["tranche"]);
  });

  // 5e vraie lecture du 24 octobre 2026 (7954) : « 30 ligne(s) oubliée(s), relues » sur presque chaque tranche, 754 lignes
  // au lieu de 324 : le modèle écrivait le repère autrement (« [5:040] », « 5:40 », « 40 »). Le repère se relit, jamais une
  // ligne relue pour rien.
  for (const [nom, forme] of [
    ["« [5:040] »", (r: string) => `[${r}]`],
    ["« 5:40 »", (r: string) => r.replace(/:0+(?=\d)/, ":")],
    ["« 40 »", (r: string) => String(Number(r.split(":")[1]))],
  ] as const) {
    it(`un repère écrit autrement (${nom}) n'est pas un oubli : aucun appel de plus, aucune ligne en double`, async () => {
      const { lecteur: l, vus } = lecteur([], false, ["5:037"], forme);
      const r = await lire(l);
      expect(vus).toEqual(["tranche"]);
      expect(r.lecture!.lignes.map((x) => x.ref)).toEqual(["5:038", "5:039", "5:040"]);
    });
  }

  it("la désignation telle qu'écrite perd les colonnes de chiffres (quantité, unité, prix)", () => {
    expect(designationTelleQuEcrite("[5:040] MANCHON REGLABE LG 100MM HYGRO 25,000 U 4,50 112,50")).toBe("MANCHON REGLABE LG 100MM HYGRO");
    expect(designationTelleQuEcrite("[1:012] L12  Prise de courant 16A 2P+T  9 u")).toBe("Prise de courant 16A 2P+T");
    expect(designationTelleQuEcrite("[5:038] KIT ALDES BAHIA OPTIMA MICROWATT 10,000 U 210,00 2 100,00 €")).toBe("KIT ALDES BAHIA OPTIMA MICROWATT");
  });
});
