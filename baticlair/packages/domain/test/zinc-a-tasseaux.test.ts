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
  it("le devis de Greg : 32 m², bacs de 4 m → 8 m de pan ÷ 0,62 = 13 bacs × (4 m + 15 cm) = 54 ml de bobine de 650 ; une seule question, la finition des rives (tasseaux et couvre-joints sont écrits)", () => {
    // Greg, 20 novembre 2026 : « si ça dépend de la finition de rive, pose la question une seule fois, avec des boutons ».
    const ouvert = ecran(lecture());
    expect(ouvert.questions.map((q) => [q.text, (q.options ?? []).map((o) => o.label)])).toEqual([
      ["Ton pan finit comment, de chaque côté ?", ["Une rive de chaque côté", "Une rive et un mur", "Un mur de chaque côté"]],
    ]);
    const e = ecran(lecture(), { "param:nb_rives_tasseau": { value: "2", unit: "u" } });
    expect(e.purchase.questions).toEqual([]);
    expect(liste(e).find((l) => /^Bobine/.test(String(l[0])))).toEqual(["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm", "54 ml", "13 bacs × 4,15 m"]);
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

  it("la largeur de bobine ne se demande jamais : une question du modèle sur elle (sous sa clé ou sous ses mots) est écartée, la bobine de 650 reste, la couverture est chiffrée", () => {
    // Recette en ligne du 19 novembre 2026 : deux lectures sur trois posaient « bobine de 650 ou de 500 ? » ; la couverture
    // restait en attente et sortait « je n'ai pas su en tirer les articles ».
    for (const cle of ["largeur_bobine_tasseaux", "largeur_de_bobine"]) {
      const l = { ...lecture(), questions: [{ cle, ligne: "1", texte: "Tes bacs : dans de la bobine de 650 ou de 500 ?", unite: "mm", donnee: "largeur de bobine", boutons: [] }] } as unknown as LectureDevis;
      const e = ecran(l);
      expect(e.purchase.questions.map((d) => d.question?.key ?? d.key).join(" "), cle).not.toMatch(/bobine/);
      expect(liste(e), cle).toEqual([["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm", "54 ml", "13 bacs × 4,15 m"]]);
      expect(e.purchase.toQuote, cle).toEqual([]);
    }
  });

  it("tasseaux et couvre-joints (écrits au devis) : un rang entre deux bacs, plus le tasseau de chaque rive, aucun contre un mur (RHEINZINK §1.15 et §1.6.5, VMZINC Delta, NedZink)", () => {
    // Greg, 20 novembre 2026 : « ne compte pas sur moi, vérifie-le toi-même […] Croise au moins deux sources ».
    const rangs = (rives: string) => {
      const e = ecran(lecture(["tasseau", "couvre_joint"]), { "param:nb_rives_tasseau": { value: rives, unit: "u" } });
      expect(e.purchase.toQuote).toEqual([]);
      return liste(e).filter((l) => !/^Bobine/.test(String(l[0]))).map((l) => [l[0], l[1]]);
    };
    expect(rangs("2")).toEqual([
      ["Tasseaux bois trapézoïdaux de 50 mm", "56 ml"],
      ["Couvre-joints Anthra-Zinc 0,65 mm pour tasseaux de 50 mm", "56 ml"],
    ]);
    expect(rangs("1").map((l) => l[1])).toEqual(["52 ml", "52 ml"]);
    expect(rangs("0").map((l) => l[1])).toEqual(["48 ml", "48 ml"]);
  });

  it("la finition des rives écrite au devis (« bandes de rive pour les 2 côtés ») ne se demande pas", () => {
    const l = lecture();
    const avecRive = { ...l, lignes: [...l.lignes, { ref: "3", role: "fourniture_et_pose", unite: "m", quantite: "8", designation: "Fourniture et pose habillages de rive : bandes de rive en zinc anthracite pour les 2 côtés (2 x 4 m)", fournitures: [] }] } as unknown as LectureDevis;
    const e = ecran(avecRive);
    expect(e.questions.map((q) => q.key)).not.toContain("param:nb_rives_tasseau");
    expect(liste(e).filter((x) => /Tasseaux/.test(String(x[0])))).toEqual([["Tasseaux bois trapézoïdaux de 50 mm", "56 ml", "14 rangs × 4 m"]]);
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
    // Les lauzes : aucun ouvrage de la fiche ; les porte-solin : rattachés par le code à leur ouvrage (Greg, 20 novembre 2026),
    // le nombre écrit se commande tel quel.
    expect(e.purchase.toQuote.map((t) => [t.label, t.measure, t.reason])).toEqual([["Fourniture et pose couverture en lauzes de pays", "32 m²", LIGNE_NON_CHIFFREE]]);
    expect(e.purchase.toBuy.map((b) => [b.label, b.quantity])).toEqual([["Bandes porte-solin cheminées", "2 pièces"]]);
    expect(e.sansFourniture.map((l) => l.label)).toEqual(["Dépose ancienne couverture", "Installation et location échafaudage"]);
  });
});

describe("une ligne « Fourniture et pose » dont l'article est nommé sans quantité (recette en ligne du 19 novembre 2026)", () => {
  // Sur trois lectures réelles du devis D-2026-024, le modèle nommait la couverture sans quantité (la quantité est celle de la
  // ligne) : l'article était jeté et la couverture sortait « je n'ai pas su en tirer les articles ».
  const sansQuantite = (role: string) =>
    ({
      ...lecture(),
      lignes: [{ ...lecture().lignes[0]!, role, fournitures: [{ ...lecture().lignes[0]!.fournitures[0]!, quantite: null, unite: null }] }],
    }) as unknown as LectureDevis;

  it("seul sur sa ligne, l'article prend la quantité de la ligne : la couverture est chiffrée", () => {
    const e = ecran(sansQuantite("fourniture_et_pose"));
    expect(liste(e)).toEqual([["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm", "54 ml", "13 bacs × 4,15 m"]]);
    expect(e.purchase.toQuote).toEqual([]);
  });

  // Recette en ligne du 19 novembre 2026 (deux lectures sur trois) : le modèle détaille la ligne en trois articles sans
  // quantité, tous de l'ouvrage « couverture-zinc-tasseaux » (bobine, tasseaux, couvre-joints) ; la surface était perdue.
  const detaillee = () =>
    ({
      ...lecture(),
      lignes: [
        {
          ...lecture().lignes[0]!,
          fournitures: [
            { nom: "Zinc prépatiné anthracite en bobine pour couverture à tasseaux, bacs de 4 m", unite: null, quantite: null, attend: ["epaisseur_zinc", "largeur_bobine_tasseaux"], donnees: { surface: "32", aspect_zinc: "3", longueur_rampant: "4" }, ouvrage: "couverture-zinc-tasseaux", aPreciser: [], precision: null, emplacement: "bobine" },
            { nom: "Tasseaux bois", unite: null, quantite: null, attend: [], donnees: { surface: "32", longueur_rampant: "4" }, ouvrage: "couverture-zinc-tasseaux", aPreciser: [], precision: null, emplacement: "tasseau" },
            { nom: "Couvre-joints zinc anthracite", unite: null, quantite: null, attend: ["epaisseur_zinc"], donnees: { surface: "32", aspect_zinc: "3", longueur_rampant: "4" }, ouvrage: "couverture-zinc-tasseaux", aPreciser: [], precision: null, emplacement: "couvre_joint" },
          ],
        },
      ],
    }) as unknown as LectureDevis;

  it("détaillée en plusieurs articles sans quantité du même ouvrage : le premier prend la quantité de la ligne, la couverture est chiffrée, tasseaux et couvre-joints restent « à chiffrer »", () => {
    const e = ecran(detaillee(), { "param:epaisseur_zinc": { value: "0.65", unit: "mm" } });
    expect(liste(e)).toContainEqual(["Bobine Anthra-Zinc 0,65 mm, largeur 650 mm", "54 ml", "13 bacs × 4,15 m"]);
    expect(e.purchase.toQuote.map((t) => t.label).join(" ")).not.toMatch(/Fourniture et pose couverture/);
    expect(e.purchase.toBuy.filter((b) => /tasseau|couvre/i.test(b.label) && b.quantity)).toEqual([]);
  });

  it("la largeur de bobine est un défaut affiché, jamais « à confirmer » ; un nombre que le code calcule (les rangs de tasseaux) n'est jamais demandé", () => {
    const l = { ...detaillee(), questions: [{ cle: "nb_rangs", ligne: "1", texte: "Combien de rangs de tasseaux sur le toit ?", unite: "u", donnee: "nombre de rangs de tasseaux", boutons: [] }] } as unknown as LectureDevis;
    const e = ecran(l, { "param:epaisseur_zinc": { value: "0.65", unit: "mm" } });
    expect(JSON.stringify(e.purchase.questions)).not.toMatch(/rangs/);
    expect(JSON.stringify(e.purchase)).not.toMatch(/Valeur par défaut à confirmer : largeur de la bobine/);
  });

  it("une ligne de pose seule qui cite un article reste une ligne de pose (rien n'est acheté)", () => {
    const e = ecran(sansQuantite("pose"));
    expect(e.purchase.toBuy.filter((b) => b.quantity)).toEqual([]);
  });
});
