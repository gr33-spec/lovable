import { describe, expect, it } from "vitest";
import { ecranDeLecture, exportPourLecture, LIGNE_NON_CHIFFREE, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis } from "../src/index.js";

/**
 * COUVERTURE ZINC À TASSEAUX (Greg, 18 novembre 2026, devis D-2026-024). Le zinc à tasseaux n'était pas dans la fiche
 * Couverture : « Fourniture et pose couverture zinc à tasseaux, 32 m², bacs de 4 m » sortait sans aucune fourniture.
 * Greg : « En général : bobine de 65 cm de largeur, hauteur de tasseau 50 mm, entraxe 62, les pattes sont souvent faites
 * avec des chutes de zinc. Parfois les bacs sont faits dans des bobines de 50 cm de large. […] Tu dois TOUT connaître sur
 * la couverture ! » Vérifié sur le descriptif type VMZINC « Couverture à tasseaux » : 650 → entraxe 620 (tasseaux de 50),
 * 500 → 470.
 */
const lecture = (ecrits: ("tasseau" | "couvre_joint")[] = []): LectureDevis =>
  ({
    metier: "roofing",
    contexte: null,
    notes: [],
    lots: [],
    bref: ["Couverture zinc à tasseaux, 32 m², bacs de 4 m."],
    fiche: { donnees: [{ cle: "longueur_des_bacs", libelle: "Longueur des bacs", valeur: "4 m", origine: "devis", regle: null, preuve: "ligne 1 : « bacs de 4 m »" }] },
    lignes: [
      {
        ref: "1",
        role: "fourniture_et_pose",
        unite: "m²",
        quantite: "32",
        designation: "Fourniture et pose couverture zinc à tasseaux : couverture en zinc prépatiné anthracite sur tasseaux bois et couvre-joints, bacs de 4 m",
        fournitures: [
          { nom: "Couverture zinc prépatiné anthracite à tasseaux", unite: "m²", quantite: "32", attend: [], donnees: { surface: "32", aspect_zinc: "Anthra-Zinc" }, ouvrage: "couverture-zinc-tasseaux", aPreciser: [], precision: null, emplacement: "couverture" },
          ...ecrits.map((emplacement) => ({ nom: emplacement === "tasseau" ? "Tasseaux bois" : "Couvre-joints zinc", unite: null, quantite: null, attend: [], donnees: {}, ouvrage: "couverture-zinc-tasseaux", aPreciser: [], precision: null, emplacement })),
        ],
      },
    ],
    questions: [],
  }) as unknown as LectureDevis;
const ecran = (l: LectureDevis, answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: l, answers, preferences: {} });
const liste = (e: ReturnType<typeof ecran>) => e.purchase.toBuy.map((b) => [b.label, b.quantity, b.precision ?? null]);

describe("couverture zinc à tasseaux : de la bobine au mètre, d'après l'entraxe des tasseaux", () => {
  it("le devis de Greg : 32 m², bacs de 4 m → 8 m de pan ÷ 0,62 = 13 bacs × (4 m + 15 cm) = 54 ml de bobine de 650, sans aucune question", () => {
    const e = ecran(lecture());
    expect(e.purchase.questions).toEqual([]);
    expect(liste(e)).toEqual([["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm", "54 ml", "13 bacs × 4,15 m"]]);
    // Ce qui est supposé se dit (et se change) : la bobine de 650 de Greg, l'entraxe de 620, l'épaisseur courante.
    const hypotheses = Object.fromEntries(e.purchase.assumptions.map((a) => [a.key, a.value]));
    expect(hypotheses).toMatchObject({ "param:largeur_bobine_tasseaux": "650", "derived:entraxe_tasseaux": "620", "derived:largeur_pan": "8" });
    // Les pattes se font dans les chutes : jamais une ligne à commander.
    expect(JSON.stringify(e.purchase)).not.toMatch(/patte/i);
  });

  it("« parfois dans des bobines de 50 cm » : entraxe 470 → 18 bacs, 75 ml de bobine de 500", () => {
    const e = ecran(lecture(), { "param:largeur_bobine_tasseaux": { value: "500", unit: "mm" } });
    expect(liste(e)).toEqual([["Bobine Anthra-Zinc 0,65 mm, largeur 500 mm", "75 ml", "18 bacs × 4,15 m"]]);
  });

  it("règle numéro un : tasseaux et couvre-joints seulement si le devis les écrit ; leur nombre de rangs n'est pas encore validé, ils restent « à chiffrer », jamais avec une quantité inventée", () => {
    expect(ecran(lecture()).purchase.toQuote).toEqual([]);
    const e = ecran(lecture(["tasseau", "couvre_joint"]));
    expect(liste(e).map((l) => l[0])).toEqual(["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm"]);
    expect(e.purchase.toQuote.map((t) => [t.label.replace(/ \(.*$/, ""), t.reason])).toEqual([
      ["Tasseaux bois trapézoïdaux de 50 mm", "Règle de calcul en attente de vérification."],
      ["Couvre-joints zinc de tasseaux", "Règle de calcul en attente de vérification."],
    ]);
  });

  it("le modèle reçoit l'ouvrage et les mots du devis qui disent ses données", () => {
    const texte = exportPourLecture(ROOFING_REFERENTIAL);
    expect(texte).toContain("OUVRAGE couverture-zinc-tasseaux : Couverture zinc à tasseaux");
    expect(texte).toMatch(/longueur_rampant \(Longueur du rampant\) : .*le devis peut la dire : « rampant », « longueur des bacs »/);
  });
});

describe("un article écrit ne disparaît jamais : une ligne de fourniture dont la lecture ne tire rien reste dans la liste", () => {
  // Comme sur le site de test le 18 novembre 2026 : le modèle n'a rattaché ni la couverture ni les porte-solin à un ouvrage.
  const sansOuvrage = {
    ...lecture(),
    fiche: { donnees: [] },
    lignes: [
      { ref: "1", role: "fourniture_et_pose", unite: "m²", quantite: "32", designation: "Fourniture et pose couverture en lauzes de pays", fournitures: [] },
      { ref: "2", role: "fourniture_et_pose", unite: "unités", quantite: "2", designation: "Fourniture et pose bandes porte-solin cheminées", fournitures: [] },
      { ref: "3", role: "pose", unite: "m²", quantite: "32", designation: "Dépose ancienne couverture", fournitures: [] },
      // Une ligne de pose que le modèle aurait rangée « fourniture » : ses mots disent qu'elle n'achète rien.
      { ref: "4", role: "fourniture", unite: "unité", quantite: "1", designation: "Installation et location échafaudage", fournitures: [] },
    ],
  } as unknown as LectureDevis;

  it("« fourniture et pose » sans article : « à chiffrer », avec ses mots et sa mesure ; la pose et l'échafaudage restent sans fourniture", () => {
    const e = ecran(sansOuvrage);
    expect(e.purchase.toQuote.map((t) => [t.label, t.measure, t.reason])).toEqual([
      ["Fourniture et pose couverture en lauzes de pays", "32 m²", LIGNE_NON_CHIFFREE],
      ["Fourniture et pose bandes porte-solin cheminées", "2 unités", LIGNE_NON_CHIFFREE],
    ]);
    expect(e.sansFourniture.map((l) => l.label)).toEqual(["Dépose ancienne couverture", "Installation et location échafaudage"]);
  });
});
