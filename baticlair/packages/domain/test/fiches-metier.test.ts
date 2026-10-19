/**
 * §52, LE FORMAT COMMUN DES RÉFÉRENTIELS MÉTIER (mission du fondateur, 2026-10-19 : « un fichier par métier, format commun
 * en 8 sections ; ajouter un métier = ajouter un fichier, zéro code » ; « un ratio sans source ni niveau de confiance est
 * interdit »). Chaque fiche de `referentiels/metiers/` se lit sans faute ; chaque fiche calculée passe son propre test
 * permanent (section 6) : les questions attendues, tout orange avec sa question (§51.6), puis, une fois répondu, zéro
 * orange et les comptes attendus au mot près. Le moteur générique est éprouvé ici sur une fiche d'essai.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { controleLectureFiche, ecranDeLecture, exportPourLecture, FICHES, fautesDeFiche, METIER_NAMES, parseFicheMetier, referentialFor, referentielDeFiche, ratiosEnValidation, type FicheMetier, type LectureDevis } from "../src/index.js";

const dossier = join(import.meta.dirname, "../../../referentiels/metiers");

/** Le devis de la section 6 lu comme le modèle le lirait : chaque ligne nomme son ouvrage, rien d'autre. */
function lectureDuTest(f: FicheMetier): LectureDevis {
  return {
    metier: f.metier,
    lots: [],
    fiche: { donnees: [] },
    bref: f.test.bref,
    questions: [],
    lignes: f.test.devis.map((l) => ({
      ref: l.ligne,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      role: l.ouvrage && l.ouvrage !== "—" ? "fourniture_et_pose" : "pose",
      fournitures: l.ouvrage && l.ouvrage !== "—"
        ? [
            { nom: l.designation, quantite: l.quantite, unite: l.unite, ouvrage: l.ouvrage, emplacement: "ouvrage", donnees: {}, attend: [], aPreciser: [], precision: null },
            // La pose d'un article écrit (« Article écrit » = oui) : l'article lui-même reste, tel qu'écrit.
            ...(f.ouvrages.find((o) => o.id === l.ouvrage)?.garde ? [{ nom: l.designation, quantite: l.quantite, unite: l.unite, ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }] : []),
          ]
        : [],
    })),
    contexte: null,
    notes: [],
  };
}

/** La section 6 d'une fiche : questions attendues, oranges avec question, puis comptes une fois tout répondu. */
function epreuve(f: FicheMetier) {
  const ref = referentielDeFiche(f);
  const lecture = lectureDuTest(f);
  const avant = ecranDeLecture({ ref, lecture, fiche: f });
  const posees = avant.purchase.questions.flatMap((d) => (d.question ? [d.question.key.replace(/^fiche:/, "")] : []));
  const sansQuestion = avant.purchase.toBuy.filter((b) => (b.waitsOn?.length ?? 0) === 0 && b.state !== "ready").map((b) => b.label);
  const answers = Object.fromEntries(Object.entries(f.test.reponses).map(([k, v]) => [`fiche:${k}`, v]));
  const apres = ecranDeLecture({ ref, lecture, fiche: f, answers });
  const oranges = apres.purchase.toBuy.filter((b) => (b.waitsOn?.length ?? 0) > 0).map((b) => b.label);
  const comptes = Object.fromEntries(apres.purchase.toBuy.map((b) => [b.label, b.quantity]));
  return { posees, sansQuestion, oranges, comptes };
}

const ESSAI = `---
code: essai
metier: essai_dalle
nom: Essai (dalle)
etat: brouillon
version: 2026-10-19
moteur: fiche
---
## 1. Unités et vocabulaire du devis
Dalle en m².
## 2. Ouvrages
| Ouvrage | Libellé | Unité | Ce que le devis écrit |
|---|---|---|---|
| dalle | Dalle béton armé | m² | « Dalle béton » |
## 3. Ratios
| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| dalle | Béton C25/30 | 0,12 | m³ | epaisseur=12 | sûr | S1 |
| dalle | Béton C25/30 | 0,15 | m³ | epaisseur=15 | sûr | S1 |
| dalle | Treillis soudé ST25C | 1,15 | m² | — | usuel | S2 |
## 4. Conditionnements
| Fourniture | Vendu en | Contenance | Unité | Confiance | Source |
|---|---|---|---|---|---|
| Béton C25/30 | m³ | 0,5 | m³ | usuel | S2 |
| Treillis soudé ST25C | panneau | 14,4 | m² | sûr | S2 |
## 5. Questions
| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| epaisseur | Ta dalle, elle fait quelle épaisseur ? | 12 cm=12 / 15 cm=15 | dalle |
## 6. Test permanent
### Devis
| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dalle béton armé | 20 | m² | dalle |
| 2 | Main-d'œuvre | 8 | h | — |
### Bref
- Dalle béton armé de 20 m².
### Questions attendues
- \`epaisseur\`
### Réponses
- \`epaisseur\` = 12
### Comptes attendus
| Fourniture | Commande |
|---|---|
| Béton C25/30 | 2,5 m³ |
| Treillis soudé ST25C | 2 panneaux de 14,4 m² |
## 7. À relire par un artisan
- Recouvrement du treillis (15 %).
## 8. Sources
- S1 : géométrie (épaisseur × surface).
- S2 : de mémoire, à vérifier.
`;

describe("§52 : le format commun des fiches métier", () => {
  it("chaque fiche du dossier se lit sans faute (ratios sourcés et notés, conditionnements, questions, test)", () => {
    const fautes = FICHES.flatMap((f) => fautesDeFiche(f));
    expect(fautes).toEqual([]);
    expect(FICHES.map((f) => f.code)).toEqual(expect.arrayContaining(["couverture", "electricite"]));
    expect(fautesDeFiche(parseFicheMetier(readFileSync(join(dossier, "_modele.md"), "utf8"), "_modele.md"))).toEqual([]);
  });

  it("un ratio sans source ni confiance, ou sans conditionnement, est refusé", () => {
    const fausse = ESSAI.replace("| dalle | Treillis soudé ST25C | 1,15 | m² | — | usuel | S2 |", "| dalle | Treillis soudé ST25C | 1,15 | m² | — | usuel | S9 |").replace("| Treillis soudé ST25C | panneau | 14,4 | m² | sûr | S2 |\n", "");
    const fautes = fautesDeFiche(parseFicheMetier(fausse, "fausse"));
    expect(fautes).toEqual(expect.arrayContaining([expect.stringMatching(/source absente/), expect.stringMatching(/sans conditionnement/)]));
  });

  it("le moteur générique : question attendue, orange avec sa question, puis zéro orange et les comptes au mot près", () => {
    const f = parseFicheMetier(ESSAI, "essai");
    expect(fautesDeFiche(f)).toEqual([]);
    const r = epreuve(f);
    expect(r.posees).toEqual(["epaisseur"]);
    expect(r.sansQuestion).toEqual([]);
    expect(r.oranges).toEqual([]);
    expect(r.comptes).toEqual({ "Béton C25/30": "2,5 m³", "Treillis soudé ST25C": "2 panneaux de 14,4 m²" });
  });

  it("une donnée écrite au devis (dans « donnees ») tranche la condition : pas de question", () => {
    const f = parseFicheMetier(ESSAI, "essai");
    const lecture = lectureDuTest(f);
    lecture.lignes[0]!.fournitures[0]!.donnees = { epaisseur: "15" };
    const e = ecranDeLecture({ ref: referentielDeFiche(f), lecture, fiche: f });
    expect(e.purchase.questions.filter((d) => d.question)).toEqual([]);
    expect(e.purchase.toBuy.find((b) => b.label === "Béton C25/30")?.quantity).toBe("3 m³");
  });

  for (const f of FICHES.filter((x) => x.moteur === "fiche")) {
    it(`${f.code} : son test permanent (section 6) passe`, () => {
      const r = epreuve(f);
      expect(r.sansQuestion).toEqual([]);
      expect([...r.posees].sort()).toEqual([...f.test.questions].sort());
      expect(r.oranges).toEqual([]);
      for (const c of f.test.comptes) expect(r.comptes[c.fourniture], c.fourniture).toBe(c.commande);
    });
  }

  it("le contrôle de la vraie lecture (au retour du crédit) : une lecture juste passe, un ouvrage faux ou une donnée inventée est un écart", () => {
    for (const f of FICHES.filter((x) => x.moteur === "fiche")) expect(controleLectureFiche(f, lectureDuTest(f)), f.code).toEqual([]);
    const f = parseFicheMetier(ESSAI, "essai");
    const fausse = lectureDuTest(f);
    fausse.lignes[0]!.fournitures[0]!.donnees = { epaisseur: "12" };
    fausse.lignes[1]!.fournitures = [{ ...fausse.lignes[0]!.fournitures[0]! }];
    expect(controleLectureFiche(f, fausse)).toEqual([
      "ligne 1 : « epaisseur » = 12 lu, alors que le devis ne l'écrit pas",
      "ligne 2 « Main-d'œuvre » : ouvrage dalle au lieu de aucun",
      "ligne 2 : « epaisseur » = 12 lu, alors que le devis ne l'écrit pas",
    ]);
  });

  it("le registre : un métier déclaré par une fiche est un métier de BatiClair, son état dit la mention §52", () => {
    expect(METIER_NAMES.roofing).toBe("couverture");
    expect(ratiosEnValidation("roofing")).toBe(false);
    expect(ratiosEnValidation("electrical")).toBe(true);
    for (const f of FICHES.filter((x) => x.moteur === "fiche")) {
      expect(METIER_NAMES[f.metier]).toBeDefined();
      expect(referentialFor(f.metier)?.id).toBe(`fiche-${f.code}`);
      expect(exportPourLecture(referentialFor(f.metier)!)).toContain(`RÉFÉRENTIEL ${f.nom}`);
      expect(ratiosEnValidation(f.metier)).toBe(f.etat !== "relu");
    }
  });
});
