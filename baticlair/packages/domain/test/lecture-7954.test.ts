import { describe, expect, it } from "vitest";
import { controleLecture7954, controleLectureDe00000071, DE00000071_LECTURE, parseLecture, type LectureDevis } from "../src/index.js";
import { DE00000071_LINES } from "./devis-reels/de00000071.js";
import { DEVIS_7954 } from "./devis-reels/devis-7954.js";
import { lectureAttendue7954 } from "./support/lecture-7954.js";

/**
 * TEMPS UN (directive du fondateur, 2026-10-11 ; référentiel électricité §6, référentiel couverture §51.5) : la lecture
 * du devis rend le MÉTIER (ou les lots), le BREF, la FICHE (chaque donnée lue, déduite ou manquante) et, pour chaque
 * ligne, la fourniture ou « sans fourniture ». Le contrôle est écrit d'après le résultat attendu du fondateur ; il
 * s'applique tel quel à la vraie lecture d'Opus (`apps/api/scripts/lecture-reelle.ts`), qui seule fait foi avant fusion.
 * La lecture « attendue » ci-dessous est écrite d'après le §6, pour éprouver le contrôle : elle ne remplace pas le modèle.
 */
const copie = (l: LectureDevis): LectureDevis => structuredClone(l);

describe("temps un, devis 7954 : le contrôle d'après le §6 du référentiel électricité", () => {
  it("la lecture attendue passe : métier électricité, lots électricité / chauffage-ventilation / plomberie, bref, fiche, lignes", () => {
    expect(controleLecture7954(lectureAttendue7954(), DEVIS_7954)).toEqual([]);
  });

  it("le métier et les lots se relisent depuis le modèle ou la base", () => {
    const lecture = parseLecture(JSON.parse(JSON.stringify(lectureAttendue7954())))!;
    expect(lecture.metier).toBe("electrical");
    expect(lecture.lots.map((l) => l.metier).sort()).toEqual(["electrical", "hvac", "plumbing"]);
    expect(lecture.lots.find((l) => l.metier === "plumbing")!.lignes.length).toBeGreaterThan(30);
  });

  it("un mauvais métier, une ligne oubliée, un fait du bref manquant : chacun est un écart", () => {
    const l = copie(lectureAttendue7954());
    l.metier = "roofing";
    l.lignes = l.lignes.filter((x) => x.designation !== "PLAN ELECTRIQUE");
    l.bref = l.bref.map((b) => b.replace(/Paimpol/g, "Brest"));
    const ecarts = controleLecture7954(l, DEVIS_7954);
    expect(ecarts).toEqual(expect.arrayContaining([expect.stringMatching(/^Métier/), expect.stringMatching(/^Ligne absente : PLAN ELECTRIQUE/), expect.stringMatching(/^Bref : .*Paimpol/)]));
  });

  it("une ligne d'étude avec une fourniture, un point sans fourniture : écarts", () => {
    const l = copie(lectureAttendue7954());
    const plan = l.lignes.find((x) => x.designation === "PLAN ELECTRIQUE")!;
    plan.fournitures = [{ nom: "Plan", quantite: "1", unite: "u", ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }];
    const tv = l.lignes.find((x) => x.designation === "PRISE TV")!;
    tv.fournitures = [];
    const ecarts = controleLecture7954(l, DEVIS_7954);
    expect(ecarts).toEqual(expect.arrayContaining([expect.stringMatching(/^Sans fourniture attendue : PLAN ELECTRIQUE/), expect.stringMatching(/^Fourniture attendue : PRISE TV/)]));
  });

  it("une question sur une donnée écrite (la marque, une contenance) : écart, et le compte passe à 8 au lieu de 7", () => {
    const l = copie(lectureAttendue7954());
    l.questions.push({ cle: "marque_appareillage", texte: "Quelle marque d'appareillage ?", boutons: [], unite: null, donnee: "marque", ligne: null });
    const ecarts = controleLecture7954(l, DEVIS_7954);
    expect(ecarts).toEqual(expect.arrayContaining([expect.stringMatching(/^Question sur une donnée écrite : Quelle marque/), expect.stringMatching(/^Questions : 8 au lieu de 7/)]));
  });

  /**
   * Correction du fondateur (2026-10-12) : le tableau fait l'objet d'une question (section 4 du référentiel électricité :
   * composition déduite, ligne orange avec « C'est bon / Modifier » ; 51.6 : tout orange a sa question). Sept questions.
   */
  it("la composition des tableaux est une question (déduite, C'est bon / Modifier) : son absence est un écart", () => {
    const attendue = lectureAttendue7954();
    const composition = attendue.questions.find((q) => /composition/i.test(q.texte))!;
    expect(composition.boutons.map((b) => b.label)).toEqual(["C'est bon", "Modifier"]);
    const tableaux = attendue.lignes.filter((x) => x.designation.startsWith("TABLEAU GENERAL ELECTRIQUE"));
    expect(tableaux.length).toBe(10);
    for (const t of tableaux) expect(t.fournitures.every((f) => f.attend.includes(composition.cle))).toBe(true);
    const l = copie(attendue);
    l.questions = l.questions.filter((q) => q !== l.questions.find((x) => /composition/i.test(x.texte)));
    const ecarts = controleLecture7954(l, DEVIS_7954);
    expect(ecarts).toEqual(expect.arrayContaining([expect.stringMatching(/^Question absente : composition des tableaux/), expect.stringMatching(/^Questions : 6 au lieu de 7/)]));
  });
});

describe("temps un, DE00000071 : le même contrôle d'après le §51.5 du référentiel couverture", () => {
  it("la lecture relue par le fondateur passe : métier couverture, un seul lot, bref, cinq questions, lignes", () => {
    expect(DE00000071_LECTURE.metier).toBe("roofing");
    expect(controleLectureDe00000071(DE00000071_LECTURE, DE00000071_LINES)).toEqual([]);
  });

  it("une question sur les Velux (écrits au devis) est un écart", () => {
    const l = copie(DE00000071_LECTURE);
    l.questions.push({ cle: "velux", texte: "Quelle taille pour les Velux ?", boutons: [], unite: null, donnee: "taille des Velux", ligne: null });
    expect(controleLectureDe00000071(l, DE00000071_LINES)).toEqual(expect.arrayContaining([expect.stringMatching(/^Question sur une donnée écrite : Quelle taille pour les Velux/)]));
  });
});
