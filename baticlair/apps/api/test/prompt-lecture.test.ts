import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportPourLecture, ROOFING_REFERENTIAL } from "@baticlair/domain";
import { decodeLecture, LECTURE_PROMPT, lectureSystemPrompt, lectureWireSchema, RULE_49_1, RULE_49_4, RULE_51_5, RULE_ELEC_1, RULE_ELEC_4, RULE_ELEC_5 } from "../src/modules/takeoff/application/lecture-reader.js";
import { RULE_51_1 } from "../src/modules/takeoff/application/prompt.js";

/**
 * §51.5 : le lecteur reçoit le référentiel, mot pour mot (règle numéro un §49.1, questions §49.4, fiche §51.1, questions
 * de la fiche §51.2, décision §51.5), puis l'export du tiroir du métier ; le format envoyé à l'API tient sous ses plafonds.
 */
const doc = readFileSync(new URL("../../../docs/referentiel-couverture.md", import.meta.url), "utf8");
const section = (from: string, to: string) => doc.slice(doc.indexOf(from), doc.indexOf(to, doc.indexOf(from) + 1));
const plain = (t: string) => t.replace(/\*\*/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

describe("le prompt de lecture (§51.5, v2)", () => {
  it("cite le §49.1, le §49.4 (points 2, 3, 5), le §51.1 et le §51.5 du référentiel mot pour mot, puis l'export du tiroir", () => {
    expect(LECTURE_PROMPT).toEqual({ id: "lecture_devis", version: 4 });
    const s491 = plain(section("### 49.1", "### 49.2")).split("\n").slice(1).join("\n");
    expect(RULE_49_1.split("\n").slice(1).join("\n")).toBe(s491);
    const s494 = plain(section("### 49.4", "### 49.5")).split("\n");
    for (const n of ["2.", "3.", "5."]) expect(RULE_49_4).toContain(s494.find((l) => l.startsWith(n))!);
    const s511 = plain(section("## 51.1", "## 51.2")).split("\n").slice(1).join(" ");
    expect(RULE_51_1.split("\n").slice(1).join(" ")).toBe(s511);
    const s515 = plain(section("## 51.5", "Test permanent DE00000071")).split("\n").slice(1).join(" ").trim();
    expect(RULE_51_5.split("\n").slice(1).join(" ")).toBe(s515);
    const prompt = lectureSystemPrompt({ tradeLabel: "Couverture", referentiel: exportPourLecture(ROOFING_REFERENTIAL) });
    for (const rule of [RULE_51_5, RULE_49_1, RULE_49_4, RULE_51_1]) expect(prompt).toContain(rule);
    expect(prompt).toContain("OUVRAGE gouttiere : Gouttière (profil, crochets, naissances)");
    expect(prompt).toContain("- developpe_gouttiere (Développé de la gouttière)");
    expect(prompt.indexOf("RÉFÉRENTIEL DU MÉTIER (export)")).toBeGreaterThan(prompt.indexOf("CE QUE TU RENVOIES"));
  });

  it("le format envoyé à l'API n'a aucun champ « valeur ou vide » (plafonds : 16 unions, 24 optionnels)", () => {
    type Json = { type?: string | string[]; anyOf?: Json[]; properties?: Record<string, Json>; required?: string[]; items?: Json; $defs?: Record<string, Json> };
    let unions = 0;
    let optionals = 0;
    const walk = (s: Json | undefined) => {
      if (!s) return;
      for (const [name, p] of Object.entries(s.properties ?? {})) {
        if (p.anyOf || Array.isArray(p.type)) unions++;
        if (!(s.required ?? []).includes(name)) optionals++;
        walk(p);
      }
      for (const a of s.anyOf ?? []) walk(a);
      walk(s.items);
      for (const d of Object.values(s.$defs ?? {})) walk(d);
    };
    walk(zodOutputFormat(lectureWireSchema).schema as Json);
    expect(unions).toBe(0);
    expect(optionals).toBe(0);
  });

  it("une réponse se relit : chaînes vides → absent, couples → objets, rôle et origine vérifiés", () => {
    const wire = lectureWireSchema.parse({
      metier: "roofing",
      lots: [],
      fiche: [{ donnee: "ouvrage", valeur: "toiture bac acier", origine: "lue", regle: "", preuve: "ligne 1" }],
      bref: ["Toiture en bac acier"],
      questions: [{ cle: "developpe_gouttiere", texte: "Développé : 25 ou 33 ?", boutons: [{ label: "De 25", valeur: "25" }], unite: "cm", donnee: "développé", ligne: "" }],
      lignes: [
        { ref: "1", designation: "Gouttière", quantite: "17,40", unite: "", role: "fourniture_et_pose", fournitures: [{ nom: "Gouttière zinc", quantite: "17,40", unite: "ml", ouvrage: "gouttiere", emplacement: "profil", donnees: [{ cle: "longueur_gouttiere", valeur: "17,40 m" }], attend: ["developpe_gouttiere"], a_preciser: [], precision: "" }] },
        { ref: "2", designation: "Dépose", quantite: "1", unite: "", role: "pose", fournitures: [] },
      ],
      contexte: [{ cle: "ville", valeur: "Brest" }],
      notes: [],
    });
    const lecture = decodeLecture(wire)!;
    expect(lecture.lignes[0]!.fournitures[0]).toMatchObject({ unite: "ml", ouvrage: "gouttiere", donnees: { longueur_gouttiere: "17,40 m" }, precision: null });
    expect(lecture.lignes[1]).toMatchObject({ role: "pose", fournitures: [], unite: null });
    expect(lecture.questions[0]).toMatchObject({ cle: "developpe_gouttiere", ligne: null, boutons: [{ label: "De 25", valeur: "25" }] });
    expect(lecture.contexte).toEqual({ ville: "Brest" });
    expect(lecture.fiche.donnees[0]).toMatchObject({ cle: "ouvrage", valeur: "toiture bac acier", origine: "devis" });
    expect(lecture).toMatchObject({ metier: "roofing", lots: [] });
  });
});

/**
 * Temps un (retour du fondateur, 12 octobre 2026) : le modèle dit le métier du devis (ou ses lots), et pour un devis
 * d'électricité il reçoit les sections 1 (un point contient ses fournitures), 4 (tableau déduit, sa question) et 5 (questions obligatoires) du référentiel
 * électricité du 11 octobre, mot pour mot.
 */
const elec = readFileSync(new URL("../../../docs/referentiel-electricite.md", import.meta.url), "utf8");
const sectionElec = (from: string, to: string) => elec.slice(elec.indexOf(from), elec.indexOf(to, elec.indexOf(from) + 1));

describe("le prompt de lecture, temps un : métier, lots, référentiel électricité", () => {
  it("cite les sections 1, 4 et 5 du référentiel électricité mot pour mot, pour un devis d'électricité seulement", () => {
    expect(RULE_ELEC_1.split("\n").slice(1).join("\n")).toBe(plain(sectionElec("## 1.", "## 2.")).split("\n").slice(1).join("\n"));
    expect(RULE_ELEC_5.split("\n").slice(1).join("\n")).toBe(plain(sectionElec("## 5.", "## 6.")).split("\n").slice(1).join("\n"));
    // Correction du fondateur (2026-10-12) : la section 4 (composition déduite, « C'est bon / Modifier ») est cité ; le tableau a sa question.
    expect(RULE_ELEC_4.split("\n").slice(1).join("\n")).toBe(plain(sectionElec("## 4.", "## 5.")).replace(/\\([[\]])/g, "$1").split("\n").slice(1).join("\n"));
    const electricite = lectureSystemPrompt({ trade: "electrical", tradeLabel: "Électricité", referentiel: "" });
    for (const rule of [RULE_ELEC_1, RULE_ELEC_4, RULE_ELEC_5, RULE_49_1]) expect(electricite).toContain(rule);
    expect(electricite).not.toMatch(/tableau[^\n]*jamais une question/);
    const couverture = lectureSystemPrompt({ trade: "roofing", tradeLabel: "Couverture", referentiel: "" });
    expect(couverture).not.toContain(RULE_ELEC_1);
    expect(couverture).not.toContain(RULE_ELEC_5);
  });

  it("donne la liste des métiers (identifiant et nom) et demande le métier et les lots", () => {
    const prompt = lectureSystemPrompt({ trade: "electrical", tradeLabel: "Électricité", referentiel: "" });
    for (const m of ["electrical (electricite)", "hvac (chauffage-ventilation)", "plumbing (plomberie)", "roofing (couverture)"]) expect(prompt).toContain(m);
    expect(prompt).toMatch(/- metier :/);
    expect(prompt).toMatch(/- lots :/);
  });

  it("relit le métier et les lots rendus par le modèle", () => {
    const wire = lectureWireSchema.parse({
      metier: "electrical",
      lots: [
        { metier: "electrical", libelle: "Électricité", lignes: ["1", "2"] },
        { metier: "hvac", libelle: "VMC", lignes: ["3"] },
      ],
      fiche: [],
      bref: [],
      questions: [],
      lignes: [],
      contexte: [],
      notes: [],
    });
    expect(decodeLecture(wire)).toMatchObject({ metier: "electrical", lots: [{ metier: "electrical", libelle: "Électricité", lignes: ["1", "2"] }, { metier: "hvac", libelle: "VMC", lignes: ["3"] }] });
  });
});
