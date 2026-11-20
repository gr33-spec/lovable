import { describe, expect, it } from "vitest";
import { D2026_020_LECTURE, ecranDeLecture, forbiddenFlags, paramOfDonnee, ROOFING_REFERENTIAL, type EngineAnswer, type LectureDevis, type PurchaseView } from "../src/index.js";

/**
 * UNE INFORMATION ÉCRITE AU DEVIS N'EST JAMAIS DEMANDÉE ; UNE RÉPONSE DONNÉE N'EST JAMAIS REDEMANDÉE.
 * Retour de Greg du 18 novembre 2026 (devis D-2026-024, « bacs de 4 m ») : « dans le devis c'est assez clair, les bacs font
 * 4 ml, tu ne devrais pas poser la question alors que tu as l'information et en plus de ça quand je te dis que ça fait 4 m
 * ça ne fonctionne pas, ça me repose la même question. […] Si l'information fait partie du devis, il ne faut évidemment
 * pas poser la question. S'il y a un doute, par contre, effectivement ça vaut le coup de poser une question. »
 * Cause : le modèle nomme la donnée avec ses mots (« longueur des bacs », « rampant ») ; le calcul attendait sa propre clé
 * (« longueur_rampant »). Les mots du devis sont dans la fiche du métier ; le rapprochement est le même pour tous les métiers.
 */
type Variante = { fiche?: [string, string | null, string][]; donnees?: Record<string, string>; questions?: { cle: string; ligne: string | null; donnee: string }[] };
const lecture = (v: Variante): LectureDevis =>
  ({
    metier: "roofing",
    contexte: null,
    notes: [],
    lots: [],
    bref: ["Couverture zinc, 32 m²."],
    fiche: { donnees: (v.fiche ?? []).map(([cle, valeur, origine]) => ({ cle, libelle: cle.replace(/_/g, " "), valeur, origine, regle: null, preuve: valeur ? "ligne 1 : « bacs de 4 m »" : "" })) },
    lignes: [
      {
        ref: "1",
        role: "fourniture_et_pose",
        unite: "m²",
        quantite: "32",
        designation: v.fiche?.some(([, valeur]) => valeur) || v.donnees ? "Fourniture et pose couverture zinc joint debout, bacs de 4 m" : "Fourniture et pose couverture zinc joint debout",
        fournitures: [{ nom: "Couverture zinc joint debout anthracite", unite: "m²", quantite: "32", attend: [], donnees: { surface: "32", ...(v.donnees ?? {}) }, ouvrage: "couverture-zinc-joint-debout", aPreciser: [], precision: null, emplacement: "couverture" }],
      },
    ],
    questions: (v.questions ?? []).map((q) => ({ ...q, texte: "Longueur du rampant ?", unite: "m", boutons: [] })),
  }) as unknown as LectureDevis;
const JE_PLIE = { "param:faconnage@couverture-zinc-joint-debout": { value: "1", unit: "u" } } satisfies Record<string, EngineAnswer>;
const ecran = (v: Variante, answers: Record<string, EngineAnswer> = {}) => ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: lecture(v), answers: { ...JE_PLIE, ...answers }, preferences: {} });
const posees = (e: ReturnType<typeof ecran>) => e.purchase.questions.map((d) => d.question?.key ?? d.key);
const largeurDuPan = (e: ReturnType<typeof ecran>) => e.purchase.assumptions.find((a) => a.key === "derived:largeur_pan")?.value;

describe("une information écrite au devis n'est jamais demandée", () => {
  it("les mots du devis nomment la donnée de la fiche : « longueur des bacs », « bac », « rampant (longueur des bacs) »", () => {
    for (const mot of ["longueur des bacs", "longueur_des_bacs", "Longueur de bac", "rampant", "rampant_(longueur_des_bacs)", "Longueur du rampant"]) expect(paramOfDonnee(ROOFING_REFERENTIAL, mot)?.key, mot).toBe("longueur_rampant");
    // Un mot qui n'est celui d'aucune donnée du toit ne se rattache à rien : jamais au hasard.
    for (const mot of ["largeur du pan", "entraxe des tasseaux", "cheneau"]) expect(paramOfDonnee(ROOFING_REFERENTIAL, mot), mot).toBeNull();
  });

  it("« bacs de 4 m » dans la fiche lue : le calcul prend 4 m (32 m² ÷ 4 m = 8 m de pan), aucune question sur le rampant", () => {
    const e = ecran({ fiche: [["longueur_des_bacs", "4 m", "devis"]] });
    expect(posees(e).join(" ")).not.toMatch(/rampant/);
    expect(largeurDuPan(e)).toBe("8");
    // Plus jamais la supposition « 5,5 m » à côté d'une valeur écrite.
    expect(e.purchase.assumptions.map((a) => a.key)).not.toContain("param:longueur_rampant");
  });

  it("« bacs de 4 m » écrit sur la ligne, sous le mot du modèle (« longueur_bac ») : même chose", () => {
    const e = ecran({ donnees: { longueur_bac: "4" } });
    expect(posees(e).join(" ")).not.toMatch(/rampant/);
    expect(largeurDuPan(e)).toBe("8");
  });

  it("écrit au devis ET demandé par le modèle : la valeur écrite gagne, la question n'est pas posée", () => {
    const e = ecran({ fiche: [["longueur_des_bacs", "4 m", "devis"]], questions: [{ cle: "longueur_rampant", ligne: "1", donnee: "longueur du rampant" }] });
    expect(posees(e).join(" ")).not.toMatch(/rampant/);
    expect(largeurDuPan(e)).toBe("8");
  });
});

describe("s'il y a un doute, la question se pose UNE fois ; la réponse la ferme", () => {
  it("rien d'écrit : la longueur des bacs se demande (plus jamais 5,5 m supposés en silence), en mètres, sans boutons de tranche", () => {
    const e = ecran({});
    expect(posees(e)).toContain("param:longueur_rampant");
    const q = e.purchase.questions.find((d) => d.question?.key === "param:longueur_rampant")!.question!;
    expect(q.text).toBe("Longueur des bacs (le rampant, de l'égout au faîtage) ?");
    expect(q.unit).toBe("m");
    expect(q.options ?? []).toEqual([]);
    // Tant que la longueur manque, aucune bobine n'est comptée.
    expect(e.purchase.toBuy.filter((b) => /Bobine/.test(b.label) && b.quantity)).toEqual([]);
  });

  it("le modèle pose la question sous son mot (« rampant », sans ligne) : c'est LA question du calcul, pas une deuxième", () => {
    const e = ecran({ fiche: [["rampant", null, "manquante"]], questions: [{ cle: "rampant", ligne: null, donnee: "rampant" }] });
    expect(posees(e).filter((k) => /rampant/.test(k))).toEqual(["param:longueur_rampant"]);
  });

  it("« 4 » répondu : la question est fermée, sous tous ses noms ; le calcul prend 4 m", () => {
    for (const v of [{}, { fiche: [["rampant", null, "manquante"]], questions: [{ cle: "rampant", ligne: null, donnee: "rampant" }] }, { questions: [{ cle: "longueur_des_bacs", ligne: "1", donnee: "longueur des bacs" }] }] satisfies Variante[]) {
      const e = ecran(v, { "param:longueur_rampant": { value: "4", unit: "m" } });
      expect(posees(e).join(" "), JSON.stringify(v)).not.toMatch(/rampant|bacs/);
      expect(largeurDuPan(e)).toBe("8");
    }
  });
});

describe("une ligne qui attend sa réponse n'est pas, en plus, une question « Interdit… »", () => {
  const ligne = (extra: object) => ({ toBuy: [{ key: "line:1", label: "Bandes de rive zinc anthracite", quantity: "8 ml", order: { count: "8", unit: "ml" }, approx: null, kind: "direct", needIds: [], lineIds: ["1"], state: "ready", assumptionKeys: [], ...extra }] }) as unknown as PurchaseView;
  it("la bande de zinc au mètre dont le pliage ou le développé est demandé : aucun « interdit » ; sans question en cours, elle reste signalée", () => {
    expect(forbiddenFlags(ligne({ key: "manque:line:1", waitsOn: ["param:faconnage@pieces-pliees"] }))).toEqual([]);
    expect(forbiddenFlags(ligne({ waitsOn: ["param:developpe"] }))).toEqual([]);
    expect(forbiddenFlags(ligne({})).map((f) => f.key)).toEqual(["interdit:metal-ml:line:1"]);
  });
});

describe("« Je ne sais pas » à la longueur des bacs ne bloque pas un autre ouvrage", () => {
  // Le chantier ardoise de Greg (D-2026-020), avec en plus un joint debout dont le devis ne dit pas le rampant : la
  // question se pose pour tout le toit (sans ligne), comme le fait la lecture.
  const mixte = {
    ...D2026_020_LECTURE,
    lignes: [...D2026_020_LECTURE.lignes, { ...lecture({}).lignes[0]!, ref: "99" }],
    questions: [...D2026_020_LECTURE.questions, { cle: "longueur_rampant", ligne: null, texte: "Longueur du rampant ?", unite: "m", donnee: "longueur du rampant", boutons: [] }],
  } as LectureDevis;
  const voir = (answers: Record<string, EngineAnswer>) => ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture: mixte, answers: { "param:faconnage@pieces-pliees": { value: "1", unit: "u" }, ...JE_PLIE, ...answers }, preferences: {} });
  const ardoises = (e: ReturnType<typeof voir>) => e.purchase.toBuy.find((b) => /^Ardoises/.test(b.label));

  it("les ardoises reprennent leur rampant courant (il ne règle que leur recouvrement) et sont chiffrées ; les bacs restent à préciser", () => {
    const e = voir({ "param:longueur_rampant": null });
    // D-2026-020, crochet 11 : pureau (320 − 110) ÷ 2 + 2,5 mm = 10,75 cm (fiche couverture ; avant 11 cm, 2 052).
    expect(ardoises(e)?.quantity).toBe("2 122 pièces");
    expect((ardoises(e)?.waitsOn ?? []).join(" ")).not.toMatch(/rampant/);
    expect(e.purchase.toBuy.filter((b) => /^Bobine/.test(b.label) && b.quantity)).toEqual([]);
  });

  it("répondue (4 m) : les deux ouvrages la prennent", () => {
    const e = voir({ "param:longueur_rampant": { value: "4", unit: "m" } });
    expect(ardoises(e)?.quantity).toBeTruthy();
    expect(e.purchase.toBuy.some((b) => /^Bobine/.test(b.label) && b.quantity)).toBe(true);
  });
});
