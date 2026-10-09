import { describe, expect, it } from "vitest";
import { factsFromReading, normalizeText, ROOFING_REFERENTIAL, type QuoteLineReading } from "../src/index.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";
import { D2026_011_LINES } from "./devis-reels/d2026-011.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * §48.6, retour du fondateur du 2026-10-07 (« c'est la troisième fois ») : UNE QUESTION PAR PIÈCE DE ZINGUERIE ÉCRITE AU
 * DEVIS, chacune à son nom avec ses deux boutons, aucune pour une pièce dont le devis dit le façonnage. Jamais une
 * question « Bandes zinc (solin, rive, égout, ventilation, couvre-joint) : tu façonnes ? » qui regroupe plusieurs pièces.
 */
const PIECES = ["solin", "rive", "egout", "ventilation", "couvre-joint", "bavette", "couvertine", "noue", "abergement", "faitage", "joint debout", "bandes zinc"];
const piecesNamed = (text: string) => PIECES.filter((p) => normalizeText(text).includes(p));
const faconnage = (v: ReturnType<typeof readQuote>) => v.questions.filter((d) => /^(engine:)?param:faconnage\b/.test(d.key));

const SEVERAL_PIECES: QuoteLineInput[] = [
  { ref: "1", designation: "Bande de solin zinc naturel dév. 25", quantity: "5", unit: "ml" },
  { ref: "2", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "m" },
  { ref: "3", designation: "Bande de rive zinc dév. 33", quantity: "14", unit: "ml" },
  { ref: "4", designation: "Faîtage zinc dév. 33", quantity: "8", unit: "ml" },
];

describe("§48.6 : le façonnage se demande pièce par pièce", () => {
  const BANC: [string, readonly QuoteLineInput[]][] = [
    ["plusieurs bandes", SEVERAL_PIECES],
    ["D-2026-018", D2026_018_LINES],
    ["D-2026-020", D2026_020_LINES],
    ["D-2026-015", D2026_015_LINES],
    ["D-2026-011", D2026_011_LINES],
    ["ardoises et lucarnes", ARDOISES_LUCARNES_LINES],
  ];
  for (const [name, lines] of BANC) {
    it(`${name} : aucune question de façonnage ne regroupe plusieurs pièces`, () => {
      for (const d of faconnage(readQuote(lines))) {
        expect(piecesNamed(d.question?.text ?? d.text), d.question?.text ?? d.text).toHaveLength(1);
        expect(d.question?.options).toHaveLength(2);
      }
    });
  }

  it("trois bandes écrites = trois questions, chacune au nom de sa pièce, avec ses deux boutons", () => {
    const v = readQuote(SEVERAL_PIECES);
    const texts = faconnage(v).map((d) => d.question!.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        "Bande de solin zinc naturel dév. 25 : tu façonnes toi-même ou tu commandes façonné ?",
        "Bande de ventilation en Z en zinc quartz : tu façonnes toi-même ou tu commandes façonné ?",
        "Bande de rive zinc dév. 33 : tu façonnes toi-même ou tu commandes façonné ?",
        "Faîtage en bande zinc : tu façonnes toi-même ou tu commandes façonné ?",
      ]),
    );
    expect(texts).toHaveLength(4);
    // Chaque pièce garde ce que SA ligne écrit : le développé de 25 n'est pas celui de 33, ni une question.
    expect(v.questions.some((d) => /developpe@bandes-zinc__(1|3)$/.test(d.key))).toBe(false);
  });

  it("une dimension lue par l'IA sur une pièce (« développé 20 cm » de la rive) ne passe jamais à une autre (la ventilation)", () => {
    const lines: QuoteLineInput[] = [
      { ref: "a", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "m" },
      { ref: "b", designation: "Habillage de rive en zinc quartz", quantity: "14", unit: "m" },
    ];
    const v = readQuote(lines, {}, factsFromReading(ROOFING_REFERENTIAL, [{ ref: "b", dimensions: { developpe: "20 cm" } }]));
    expect(v.questions.find((d) => /developpe@/.test(d.key))?.question?.text).toBe("Bande de ventilation en Z en zinc quartz : développé de la bande zinc ?");
    expect(v.questions.some((d) => d.key === "engine:param:developpe@bandes-zinc__b")).toBe(false);
  });

  it("la réponse d'une pièce ne vaut que pour elle", () => {
    const v = readQuote(SEVERAL_PIECES, { "param:faconnage@bandes-zinc__1": { value: "1", unit: "u" } });
    const keys = faconnage(v).map((d) => d.key);
    expect(keys.some((k) => k.endsWith("@bandes-zinc__1"))).toBe(false);
    expect(keys.some((k) => k.endsWith("@bandes-zinc__3"))).toBe(true);
  });

  it("D-2026-018 : aucune question pour une pièce dont le devis dit le façonnage (« pliées en Z », « comprend le pliage »)", () => {
    const v = readQuote(D2026_018_LINES);
    expect(faconnage(v).map((d) => d.question!.text)).toEqual(["Couverture zinc à joint debout : tu façonnes toi-même ou tu commandes façonné ?"]);
    // La rive (pliée par l'artisan) part en feuilles ; la ventilation (déjà pliée) demande seulement SON développé.
    expect(v.toBuy.some((b) => /^Feuilles/.test(b.label) && b.lineIds.includes("4"))).toBe(true);
    expect(v.questions.find((d) => /developpe@/.test(d.key))?.question?.text).toBe("Bande de ventilation en Z en zinc quartz : développé de la bande zinc ?");
  });
});

describe("une info manquante se demande une fois, avant le calcul", () => {
  const MANQUE = new Map<string, QuoteLineReading>([
    ["2", { role: "fourniture_et_pose", articles: [], faconnage: null, manque: ["diamètre des moignons / naissances (80, 100)"] }],
  ]);
  it("le Ø des naissances est une donnée de la gouttière : sa question (« Descentes en Ø 80, Ø 100 ou Ø 120 ? »), jamais une 2e du comptoir", () => {
    const avant = readQuote(D2026_018_LINES, {}, [], undefined, {}, MANQUE);
    expect(avant.questions.filter((d) => /diam/i.test(d.question?.text ?? "") || /diametre/.test(d.key)).map((d) => d.key)).toEqual(["engine:param:diametre_descente"]);
    expect(avant.questions.some((d) => d.key.startsWith("comptoir:"))).toBe(false);
    // Après le calcul, la question du tiroir est close (pas de réponse) : la question du comptoir ne revient pas sur les cartes.
    const apres = readQuote(D2026_018_LINES, { "param:diametre_descente": null }, [], undefined, {}, MANQUE);
    expect(apres.toBuy.flatMap((b) => b.asks ?? []).some((a) => a.key.startsWith("comptoir:"))).toBe(false);
    expect(apres.toBuy.flatMap((b) => b.rules ?? []).some((r) => /moignons/.test(r.text))).toBe(false);
  });
  it("des choix « (0,65, 0,70, 0,80 mm) » : trois boutons, la virgule décimale ne coupe rien", () => {
    const v = readQuote([{ ref: "1", designation: "Couverture en ardoises naturelles 32x22", quantity: "48", unit: "m²" }], {}, [], undefined, {}, new Map([["1", { role: "fourniture", articles: [], faconnage: null, manque: ["épaisseur des crochets (2,7, 3,0 mm)"] }]]));
    expect(v.questions.find((d) => d.key.startsWith("comptoir:"))?.question?.options?.map((o) => o.label)).toEqual(["2,7 mm", "3,0 mm"]);
  });
});

describe("audit du 2026-10-07 : une pièce restée sans réponse sort UNE fois, à son nom (§49.1, §49.8)", () => {
  const LIGNES: QuoteLineInput[] = [
    { ref: "1", designation: "Couverture zinc joint debout gris quartz", quantity: "91", unit: "m2" },
    { ref: "2", designation: "Voliges sapin 18 mm traité", quantity: "96", unit: "m2" },
    { ref: "3", designation: "Gouttière zinc demi-ronde dév. 25", quantity: "13", unit: "ml" },
    { ref: "4", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "ml" },
    { ref: "5", designation: "Bande de rive zinc quartz dév. 200", quantity: "14", unit: "ml" },
  ];
  // Toutes les questions laissées sans réponse au calcul (« Calculer ma liste » sans rien toucher).
  const ouvert = readQuote(LIGNES);
  const closes = Object.fromEntries(ouvert.questions.filter((q) => q.question).map((q) => [q.key.replace(/^engine:/, ""), null]));
  const v = readQuote(LIGNES, closes as never);

  it("jamais à la fois orange « Info manquante » et grise « à préciser »", () => {
    for (const ref of ["1", "2", "4", "5"]) {
      const lignes = [...v.toBuy.filter((b) => b.lineIds.includes(ref) && b.key.startsWith("manque:line:")), ...v.toQuote.filter((q) => q.key === `line:${ref}`)];
      expect(lignes.length, `ligne ${ref}`).toBeLessThanOrEqual(1);
    }
  });

  it("chaque ligne orange porte le nom de SA pièce, jamais celui de l'ouvrage qui la range", () => {
    const labels = v.toBuy.filter((b) => b.key.startsWith("manque:line:")).map((b) => b.label);
    expect(labels).not.toContain("Bandes zinc");
    expect(labels.some((l) => /^Bande de ventilation en Z/.test(l))).toBe(true);
    expect(labels.some((l) => /^Bande de rive/.test(l))).toBe(true);
    // Des voliges ne s'appellent jamais « Couverture zinc… ».
    expect(labels.filter((l) => /sapin/i.test(l)).every((l) => !/^Couverture/.test(l))).toBe(true);
  });
});
