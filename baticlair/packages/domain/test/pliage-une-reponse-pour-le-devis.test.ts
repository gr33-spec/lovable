import { describe, expect, it } from "vitest";
import { choixParPiece, ecranDeLecture, lignesDeLecture, planDeLecture, ROOFING_REFERENTIAL, type QuoteLineReading } from "../src/index.js";
import { HABITUDES_BANC } from "./support/habitudes.js";
import { lectureEnregistree } from "./support/lectures.js";
import { ARDOISES_LUCARNES_LINES } from "./devis-reels/ardoises-lucarnes.js";
import { D2026_011_LINES } from "./devis-reels/d2026-011.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";
import { D2026_018_LINES } from "./devis-reels/d2026-018.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { readQuote, type QuoteLineInput } from "./support/read-quote.js";

/**
 * RÈGLE CHANGÉE (Greg, 17 novembre 2026) : « "Je plie" : une seule réponse pour tout le devis, plus jamais pièce par pièce.
 * S'il plie lui-même : des feuilles de zinc, comptées d'après les développés et les longueurs. S'il achète tout fait : des
 * longueurs de pièces façonnées. Les pièces qu'on ne plie pas (crochets, descentes, naissances, accessoires) restent des
 * articles normaux dans les deux cas. Il peut modifier ce choix pour une pièce. »
 * Avant (§48.6, 2026-10-07) : une question par pièce de zinguerie écrite au devis.
 * Ce qui ne change pas : aucune question pour une pièce dont le devis dit le façonnage ; chaque pièce garde SES données
 * (son développé) ; les bacs d'une couverture à joint debout gardent leur question à eux.
 */
const faconnage = (v: ReturnType<typeof readQuote>) => v.questions.filter((d) => /^(engine:)?param:faconnage\b/.test(d.key));
const PLIAGE = "param:faconnage@pieces-pliees";

const SEVERAL_PIECES: QuoteLineInput[] = [
  { ref: "1", designation: "Bande de solin zinc naturel dév. 25", quantity: "5", unit: "ml" },
  { ref: "2", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "m" },
  { ref: "3", designation: "Bande de rive zinc dév. 33", quantity: "14", unit: "ml" },
  { ref: "4", designation: "Faîtage zinc dév. 33", quantity: "8", unit: "ml" },
];

describe("le pliage : une seule réponse pour tout le devis", () => {
  const BANC: [string, readonly QuoteLineInput[]][] = [
    ["plusieurs bandes", SEVERAL_PIECES],
    ["D-2026-018", D2026_018_LINES],
    ["D-2026-020", D2026_020_LINES],
    ["D-2026-015", D2026_015_LINES],
    ["D-2026-011", D2026_011_LINES],
    ["ardoises et lucarnes", ARDOISES_LUCARNES_LINES],
  ];
  for (const [name, lines] of BANC) {
    it(`${name} : une question de pliage au plus pour toutes les pièces, avec ses deux boutons ; jamais une par pièce`, () => {
      const posees = faconnage(readQuote(lines));
      expect(posees.filter((d) => d.key.replace(/^engine:/, "") === PLIAGE).length).toBeLessThanOrEqual(1);
      // Aucune question de façonnage au nom d'une pièce (« …@bandes-zinc__3 », « …@noue », « …@faitage-zinc »).
      expect(posees.map((d) => d.key.replace(/^engine:/, "")).filter((k) => k !== PLIAGE && !/@couverture-/.test(k) && k !== "param:faconnage")).toEqual([]);
      for (const d of posees) expect(d.question?.options).toHaveLength(2);
    });
  }

  it("quatre pièces écrites = UNE question, avec les mots de la fiche", () => {
    const v = readQuote(SEVERAL_PIECES);
    expect(faconnage(v).map((d) => d.question!.text)).toEqual(["Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?"]);
    // Chaque pièce garde ce que SA ligne écrit : le développé de 25 n'est pas celui de 33, ni une question.
    expect(v.questions.some((d) => /developpe@bandes-zinc__(1|3)$/.test(d.key))).toBe(false);
  });

  it("« je plie » : chaque pièce sort en feuilles 2 × 1 m, jamais fusionnées ; plus aucune question de pliage", () => {
    // La bande de ventilation n'écrit pas son développé : sa réponse est donnée ici pour que ses feuilles se comptent.
    const v = readQuote(SEVERAL_PIECES, { [PLIAGE]: { value: "1", unit: "u" }, "param:developpe@bandes-zinc__2": { value: "100", unit: "mm" } });
    expect(faconnage(v)).toEqual([]);
    const labels = v.toBuy.map((b) => b.label);
    for (const piece of [/solin/i, /ventilation/i, /rive/i]) expect(labels.some((l) => /^Feuilles .*2 × 1 m/.test(l) && piece.test(l)), `${piece} : ${labels.join(" | ")}`).toBe(true);
    // Le solin, la ventilation, la rive et le faîtage : quatre lignes de feuilles.
    expect(labels.filter((l) => /^Feuilles .*2 × 1 m/.test(l))).toHaveLength(4);
  });

  it("« tout fait » : chaque pièce sort en longueurs façonnées, aucune feuille", () => {
    const v = readQuote(SEVERAL_PIECES, { [PLIAGE]: { value: "2", unit: "u" } });
    expect(faconnage(v)).toEqual([]);
    expect(v.toBuy.some((b) => /^Feuilles/.test(b.label)), v.toBuy.map((b) => b.label).join(" | ")).toBe(false);
    expect(v.toBuy.some((b) => /^Bande de rive/i.test(b.label)), v.toBuy.map((b) => b.label).join(" | ")).toBe(true);
  });

  it("une dimension lue par l'IA sur une pièce (« développé 20 cm » de la rive) ne passe jamais à une autre (la ventilation)", () => {
    const lines: QuoteLineInput[] = [
      { ref: "a", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "m" },
      { ref: "b", designation: "Habillage de rive en zinc quartz", quantity: "14", unit: "m" },
    ];
    const v = readQuote(lines, {}, [{ key: "developpe", value: "200", unit: "mm", evidence: "Devis, b (« developpe : 20 cm »)", origin: "devis" as const, line: "b" }]);
    expect(v.questions.find((d) => /developpe@/.test(d.key))?.question?.text).toBe("Bande de ventilation en Z en zinc quartz : développé de la bande zinc ?");
    expect(v.questions.some((d) => d.key === "engine:param:developpe@bandes-zinc__b")).toBe(false);
  });

  it("il change ce choix pour UNE pièce : la rive toute faite, le reste plié", () => {
    const v = readQuote(SEVERAL_PIECES, { [PLIAGE]: { value: "1", unit: "u" }, "param:faconnage@bandes-zinc__3": { value: "2", unit: "u" } });
    expect(faconnage(v)).toEqual([]);
    const labels = v.toBuy.map((b) => b.label);
    expect(labels.some((l) => /^Feuilles .*rive/i.test(l)), labels.join(" | ")).toBe(false);
    expect(labels.some((l) => /^Bande de rive/i.test(l)), labels.join(" | ")).toBe(true);
    expect(labels.some((l) => /^Feuilles .*solin/i.test(l)), labels.join(" | ")).toBe(true);
  });

  it("au récapitulatif : chaque pièce avec son choix, modifiable pour elle seule", () => {
    const l = lectureEnregistree(ROOFING_REFERENTIAL, SEVERAL_PIECES, [], HABITUDES_BANC);
    const plan = planDeLecture(ROOFING_REFERENTIAL, l, lignesDeLecture(l));
    expect(choixParPiece(ROOFING_REFERENTIAL, plan, {})).toEqual([]);
    const plie = choixParPiece(ROOFING_REFERENTIAL, plan, { [PLIAGE]: { value: "1", unit: "u" } });
    expect(plie.map((c) => [c.piece, c.value])).toEqual([
      ["Bande de solin zinc naturel dév. 25", "1"],
      ["Bande de ventilation en Z en zinc quartz", "1"],
      ["Bande de rive zinc dév. 33", "1"],
      ["Faîtage en bande zinc", "1"],
    ]);
    for (const c of plie) expect(c.options.map((o) => o.value)).toEqual(["1", "2"]);
    const rive = plie.find((c) => /rive/.test(c.piece))!;
    const change = choixParPiece(ROOFING_REFERENTIAL, plan, { [PLIAGE]: { value: "1", unit: "u" }, [rive.key]: { value: "2", unit: "u" } });
    expect(change.map((c) => c.value)).toEqual(["1", "1", "2", "1"]);
    // Une réponse donnée pour tout le chantier (l'ancienne clé commune) se change aussi pièce par pièce.
    expect(choixParPiece(ROOFING_REFERENTIAL, plan, { "param:faconnage": { value: "2", unit: "u" } }).map((c) => c.value)).toEqual(["2", "2", "2", "2"]);
  });

  it("recette en ligne du 17 novembre 2026 : UNE question de façonnage du modèle, sans ligne, devient les deux questions du calcul (les bacs, les pièces pliées)", () => {
    const LIGNES: QuoteLineInput[] = [
      { ref: "1", designation: "Couverture zinc joint debout gris quartz", quantity: "91", unit: "m2" },
      { ref: "2", designation: "Voliges sapin 18 mm traité", quantity: "96", unit: "m2" },
      { ref: "3", designation: "Gouttière zinc demi-ronde dév. 25", quantity: "13", unit: "ml" },
      { ref: "4", designation: "Bande de ventilation en Z en zinc quartz", quantity: "13", unit: "ml" },
      { ref: "5", designation: "Bande de rive zinc quartz dév. 200", quantity: "14", unit: "ml" },
    ];
    const l = lectureEnregistree(ROOFING_REFERENTIAL, LIGNES, [], HABITUDES_BANC);
    const uneSeule = { cle: "faconnage", texte: "Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?", boutons: [{ label: "Je façonne", valeur: "1" }, { label: "Je commande façonné", valeur: "2" }], unite: null, donnee: "façonnage", ligne: null };
    const lecture = { ...l, questions: [uneSeule, ...l.questions.filter((q) => q.cle !== "faconnage")] };
    const e = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers: {}, preferences: {} });
    const cles = e.questions.filter((q) => /^param:faconnage/.test(q.key)).map((q) => q.key);
    // Jamais la clé commune « param:faconnage », qui vaudrait pour les bacs ET pour les pièces.
    expect(cles).toEqual(["param:faconnage@couverture-zinc-joint-debout", "param:faconnage@pieces-pliees"]);
    // « tout fait » pour les bacs, « je plie » pour les pièces : la rive part en feuilles, les bacs commandés façonnés.
    const apres = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers: { "param:faconnage@couverture-zinc-joint-debout": { value: "2", unit: "u" }, "param:faconnage@pieces-pliees": { value: "1", unit: "u" } }, preferences: {} });
    expect(apres.questions.filter((q) => /^param:faconnage/.test(q.key))).toEqual([]);
    expect(apres.purchase.toBuy.some((b) => /^Feuilles .*rive/i.test(b.label)), apres.purchase.toBuy.map((b) => b.label).join(" | ")).toBe(true);
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
    expect(v.questions.find((d) => d.key.startsWith("engine:fiche:"))?.question?.options?.map((o) => o.label)).toEqual(["2,7 mm", "3,0 mm"]);
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
