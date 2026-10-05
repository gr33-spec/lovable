import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL, supplierTest } from "../src/index.js";
import { readQuote } from "./support/read-quote.js";

/**
 * LA RÈGLE DU COMPTOIR (§47.8, retour du fondateur, 2026-10-04) : toute question posée à l'artisan est une question que
 * le vendeur de comptoir du négoce lui poserait pour chiffrer, avec ses mots ; ce qu'il ne demanderait pas (zone,
 * entraxe, pureau, perte) est une hypothèse dite et modifiable. Et une ligne qu'il ne peut pas chiffrer telle quelle
 * est une question manquante.
 */

/** Les seules questions du catalogue couverture, chacune avec la raison pour laquelle Point.P la poserait. */
const COMPTOIR: Record<string, string> = {
  surface: "la surface à couvrir, quand le devis ne la donne pas",
  longueur_rives: "les mètres de rive à servir",
  recouvrement_canal: "à trancher par le fondateur : pas de défaut sourcé (tableau du DTU 40.22 non lu)",
  longueur_faitage: "les mètres de faîtage à servir",
  longueur_bande: "les mètres de bande à servir",
  developpe: "« tu la veux en quel développé ? »",
  faconnage: "« je te la plie, ou tu prends du bobineau ? »",
  bacs_longs: "« en un bac ou en plusieurs longueurs ? »",
  aspect_zinc: "« quartz ou anthra ? » quand le devis dit prépatiné sans la teinte",
  nb_cheminees: "le nombre d'abergements",
  perimetre_cheminee: "les dimensions de la souche",
  nb_sorties: "le nombre de sorties",
  diametre_sortie: "« en quel diamètre ? »",
  usage_sortie: "« conduit de fumée ou ventilation ? »",
  support_sortie: "« embase plomb ou platine zinc ? »",
  longueur_gouttiere: "les mètres de gouttière",
  developpe_gouttiere: "« gouttière de 25 ou de 33 ? »",
  fixation_crochet: "« crochets à queue ou bandeau ? »",
  nb_descentes: "le nombre de naissances et de descentes",
  diametre_descente: "« descente de 80 ou de 100 ? »",
  hauteur_descente: "les mètres de tube",
  qualite_ardoise: "« quelle ardoise ? » (habitude de l'entreprise, demandée une fois)",
  longueur_noue: "les mètres de noue",
  longueur_aretier: "les mètres d'arêtier",
  aretier_matiere: "« arêtier en tuiles ou en zinc ? » quand le devis ne le dit pas",
  nb_aretiers: "le nombre d'abouts d'arêtier",
  developpe_aretier: "« bande de 25 ou de 33 ? »",
  nb_fenetres: "le nombre de fenêtres de toit",
  raccord_couverture: "« raccord pour tuiles ou pour ardoises ? »",
  matiere_gouttiere: "« PVC ou alu ? » (toujours lu : c'est lui qui choisit l'ouvrage)",
  teinte_gouttiere: "« grise, blanche ou sable ? »",
  nb_angles: "« combien d'angles ? »",
};
/** Ce que le comptoir ne demande jamais : une hypothèse, dite et modifiable d'un tap. */
const JAMAIS: readonly string[] = ["zone", "entraxe_supports", "pureau", "pente", "longueur_rampant", "epaisseur_zinc", "diametre_crochet", "coudes_par_descente"];

const u = (value: string, unit = "u") => ({ value, unit });
const TEST = [
  { ref: "1", designation: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantity: "91", unit: "m²" },
  { ref: "2", designation: "Voligeage en sapin traité 18×200 mm", quantity: "91", unit: "m²" },
  { ref: "3", designation: "Bande zinc d'égout", quantity: "13", unit: "ml" },
  { ref: "4", designation: "Gouttière zinc demi-ronde", quantity: "13", unit: "ml" },
];
const BREST = [
  { ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" },
  { ref: "2", designation: "Gouttière demi-ronde zinc développé 33", quantity: "24", unit: "ml" },
];
const keys = (v: ReturnType<typeof readQuote>) => v.questions.map((d) => d.question?.key ?? d.key).sort();

describe("la règle du comptoir (§47.8)", () => {
  it("le catalogue : chaque question est une question de comptoir ; « égout et faîtage, on les ajoute ? » n'en est plus une", () => {
    const asked = new Set<string>();
    const never = new Set<string>();
    for (const w of ROOFING_REFERENTIAL.workItems) {
      for (const p of w.params) (p.default && !p.default.unlessText ? never : asked).add(p.key);
    }
    expect([...asked].filter((k) => !COMPTOIR[k])).toEqual([]);
    expect(asked.has("egout_faitage")).toBe(false);
    // Ce que le comptoir ne demande jamais a toujours une hypothèse : jamais une question.
    for (const k of JAMAIS) expect(never.has(k), k).toBe(true);
  });

  it("chantier Test : avant, 4 questions dont « on les ajoute ? » ; après, les 6 questions du comptoir, et l'égout ou le faîtage dans « On ajoute ? »", () => {
    const v = readQuote(TEST);
    expect(keys(v)).toEqual([
      "param:developpe",
      "param:developpe_gouttiere",
      "param:diametre_descente",
      "param:faconnage",
      "param:fixation_crochet",
      "param:nb_descentes",
    ]);
    // Quartz lu au devis : pas de question d'aspect.
    expect(keys(v)).not.toContain("param:aspect_zinc");
  });

  it("chantier Test répondu : chaque ligne porte ce que le comptoir doit savoir (aspect, épaisseur, développé, Ø, pose)", () => {
    const v = readQuote(TEST, {
      "param:faconnage": u("1"),
      "param:nb_descentes": u("2"),
      "param:developpe": u("330", "mm"),
      "param:developpe_gouttiere": u("33", "cm"),
      "param:fixation_crochet": u("2"),
      "param:diametre_descente": u("80", "mm"),
    });
    expect(v.questions).toEqual([]);
    expect(v.toBuy.map((b) => b.label)).toEqual([
      "Bobineau Quartz-Zinc 500 × 17 m, 0,65",
      "Bobine Quartz-Zinc 0,65 mm, largeur 500 mm",
      "Pattes coulissantes joint debout",
      "Pattes fixes joint debout",
      "Pointes annelées 2,5 × 28 mm",
      "Voliges sapin 18×200 mm traité",
      "Gouttière zinc demi-ronde dév. 33",
      "Crochets de gouttière bandeau dév. 33",
      "Naissances zinc demi-ronde dév. 33 Ø80",
    ]);
    for (const b of v.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null)).toBeNull();
  });

  it("chantier de Brest : la qualité d'ardoise, la pose des crochets, le Ø et le nombre de descentes ; le développé est lu au devis", () => {
    const v = readQuote(BREST, {}, [], {});
    expect(keys(v)).toEqual(["param:diametre_descente", "param:fixation_crochet", "param:nb_descentes", "param:qualite_ardoise"]);
    // Un devis qui dit tout ne pose aucune question.
    const complet = readQuote(
      [
        { ref: "1", designation: "Couverture en ardoises naturelles d'Espagne 1er choix 30x22 posées au crochet", quantity: "200", unit: "m²" },
        { ref: "2", designation: "Gouttière demi-ronde zinc développé 33, crochets bandeau, 2 descentes Ø80", quantity: "24", unit: "ml" },
      ],
      {},
      [],
      {},
    );
    expect(complet.questions).toEqual([]);
    expect(complet.toBuy.map((b) => b.label)).toEqual(
      expect.arrayContaining(["Ardoises naturelles Espagne 1er choix 30×22", "Crochets d'ardoise inox standard, longueur 11 cm", "Gouttière zinc demi-ronde dév. 33", "Naissances zinc demi-ronde dév. 33 Ø80"]),
    );
  });

  it("l'aspect du zinc : lu au devis (quartz, anthra), naturel quand rien n'est dit (hypothèse), demandé quand le devis dit « prépatiné » sans la teinte", () => {
    const zinc = (designation: string) => readQuote([{ ref: "1", designation, quantity: "91", unit: "m²" }], { "param:faconnage": u("1") });
    expect(zinc("Couverture zinc joint debout anthra-zinc").toBuy[0]!.label).toBe("Bobine Anthra-Zinc 0,65 mm, largeur 500 mm");
    const nature = zinc("Couverture zinc joint debout");
    expect(nature.toBuy[0]!.label).toBe("Bobine zinc naturel 0,65 mm, largeur 500 mm");
    expect(nature.assumptions.map((a) => a.key)).toContain("param:aspect_zinc");
    const vague = zinc("Couverture zinc joint debout prépatiné");
    expect(keys(vague)).toEqual(["param:aspect_zinc"]);
    expect(vague.questions[0]!.question?.text).toBe("Zinc prépatiné : Quartz-Zinc (gris) ou Anthra-Zinc (noir) ?");
  });
});
