import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, planQuote, ROOFING_REFERENTIAL, tradeProfile, type SiteFact } from "../src/index.js";
import { D2026_020_LINES } from "./devis-reels/d2026-020.js";
import { readQuote } from "./support/read-quote.js";

/**
 * DEVIS D-2026-020 (BATI INVEST, ardoises 32×22 + zinguerie), retour du fondateur 2026-10-06 : « 8 coudes au lieu de
 * 4 alors que le devis dit 4 unités, soit 2 jeux de 2 coudes », « il me dit voir des crochets de 11 et il me met des
 * crochets de 9 ». Diagnostic : les deux erreurs venaient du MOTEUR, pas de l'IA (l'appel n° 2 ne fait que signaler).
 *  - « Tubes de descente (Coude zinc Ø80) — 4 unités » était rangé « tubes » : ses 4 unités devenaient 4 DESCENTES,
 *    donc 4 × 2 = 8 coudes, 4 naissances, 4 dauphins. La parenthèse nomme l'article : ce sont 4 coudes.
 *  - La longueur de crochet n'était jamais lue : elle se calculait (zone 1 du code postal, 45° → recouvrement 8 cm →
 *    crochet 9 cm). Le crochet écrit au devis fixe maintenant le recouvrement (crochet − 1 cm, Cupa), donc le pureau.
 */
const ZONE_1: SiteFact[] = [{ key: "zone", value: "1", unit: "u", origin: "devis", evidence: "code postal" }];
const ardoises = (designation: string) => ({ ref: "1", designation, quantity: "48", unit: "m²" });
const crochets = (v: ReturnType<typeof readQuote>) => v.toBuy.find((b) => b.needIds.includes("crochets-ardoise"));
const slates = (v: ReturnType<typeof readQuote>) => v.toBuy.find((b) => b.needIds.includes("ardoises"));

describe("D-2026-020 : les coudes du devis sont des coudes, pas des descentes", () => {
  const LIGNES = [
    { ref: "5", designation: "Tuyau de descente zinc diam. 80mm, 2 descentes de 3 m", quantity: "6", unit: "ml" },
    { ref: "6", designation: "Tubes de descente (Coude zinc diam. 80mm) - 4 unités, soit 2 jeux de 2 coudes", quantity: "4", unit: "unités" },
  ];
  it("la parenthèse nomme l'article : la ligne 6 est une ligne de coudes, et elle ne compte pas les descentes", () => {
    const plan = planQuote(LIGNES, ROOFING_REFERENTIAL, tradeProfile("roofing"));
    expect(plan.lines[1]).toMatchObject({ status: "planned", workItemId: "descente", slot: "coude", mentions: [] });
    // « 2 descentes de 3 m » écrit au devis : 2 descentes, jamais les 4 coudes.
    expect(plan.inputs.find((i) => i.workItemId === "descente")?.params.nb_descentes?.value).toBe("2");
  });
  it("4 coudes à commander, tels que le devis les compte", () => {
    const v = readQuote(LIGNES);
    expect(v.toBuy.filter((b) => /coude/i.test(b.label)).map((b) => b.quantity)).toEqual(["4 pièces"]);
  });
  it("la descente se lit au devis : Ø « diam. 80mm », hauteur « 2 descentes de 3 m », 2 naissances (indissociables de la gouttière) ; ni colliers ni question", () => {
    const v = readQuote([{ ref: "3", designation: "Gouttière zinc demi-ronde dév. 25 (Longueur : 10 m)", quantity: "10", unit: "m" }, ...LIGNES]);
    const keys = v.questions.map((q) => q.key);
    for (const k of ["engine:param:diametre_descente", "engine:param:hauteur_descente", "engine:param:nb_descentes"]) expect(keys).not.toContain(k);
    const qty = (re: RegExp) => v.toBuy.filter((b) => re.test(b.label)).map((b) => b.quantity);
    // RÈGLE NUMÉRO UN : le devis n'écrit pas de colliers, ils ne sortent pas (avant : 12, puis 6, ajoutés d'office).
    expect(qty(/^Colliers/)).toEqual([]);
    expect(qty(/^Naissances/)).toEqual(["2 pièces"]);
  });
  it("« (Fourniture & Pose) » ne nomme rien ; « avec coudes … (2 ensembles) » reste 2 descentes complètes", () => {
    const plan = planQuote(
      [{ ref: "8", designation: "Descente d'eau pluviale PVC Ø80 avec coudes (Fourniture & Pose) - comprenant 2 jeux de coudes et les colliers de fixation par descente (2 ensembles au total)", quantity: "2", unit: "unités" }],
      ROOFING_REFERENTIAL,
      tradeProfile("roofing"),
    );
    expect(plan.lines[0]).toMatchObject({ slot: "tube" });
    expect(plan.inputs[0]?.params.nb_descentes?.value).toBe("2");
  });
});

describe("D-2026-020 : la longueur de crochet écrite au devis fait foi, et le reste suit", () => {
  it("sans longueur écrite : calculée (zone 1, 45° → recouvrement 8 cm → crochet 9 cm)", () => {
    const v = readQuote([ardoises("Couverture en ardoises naturelles 32x22 au crochet")], {}, ZONE_1);
    expect(crochets(v)?.label).toBe("Crochets d'ardoise inox standard, longueur 9 cm");
  });
  it("« crochet inox de 11 cm » : crochets de 11 cm, recouvrement 10 cm, pureau 11 cm, ardoises recomptées", () => {
    const sans = readQuote([ardoises("Couverture en ardoises naturelles 32x22 au crochet")], {}, ZONE_1);
    const v = readQuote([ardoises("Couverture en ardoises naturelles 32x22 posées au crochet inox de 11 cm")], {}, ZONE_1);
    expect(crochets(v)?.label).toBe("Crochets d'ardoise inox standard, longueur 11 cm");
    expect(v.assumptions.find((a) => a.key === "param:pureau")?.value).toBe("11");
    // Plus de recouvrement, plus d'ardoises : la liste reste cohérente avec le crochet commandé.
    expect(Number(slates(v)!.quantity!.replace(/\D/g, ""))).toBeGreaterThan(Number(slates(sans)!.quantity!.replace(/\D/g, "")));
    // « inox » qualifie le crochet, pas l'ardoise.
    expect(slates(v)?.label).toBe("Ardoises naturelles Espagne 1er choix 32×22");
  });
  it("sur une ligne de crochets à part (« 110 mm ») : lue aussi", () => {
    const v = readQuote([ardoises("Couverture en ardoises naturelles 32x22"), { ref: "2", designation: "Crochets d'ardoise inox teintés noirs 110 mm", quantity: "1", unit: "lot" }], {}, ZONE_1);
    expect(crochets(v)?.label).toMatch(/longueur 11 cm/);
  });
  it("« Ø 2,7 mm » n'est pas une longueur de crochet", () => {
    const v = readQuote([ardoises("Couverture en ardoises naturelles 32x22 au crochet inox 2,7 mm")], {}, ZONE_1);
    expect(crochets(v)?.label).toMatch(/longueur 9 cm/);
  });
});

/**
 * Le VRAI devis D-2026-020, lignes de pose comprises (retours du fondateur, 2026-10-06 : « tu mets des crochets de 12
 * alors que dans le devis c'est bien indiqué crochet de 11 … ne pas poser des questions inutiles », puis la RÈGLE NUMÉRO
 * UN : « BatiClair lit le devis ligne par ligne et retranscrit ce qui est écrit, avec les quantités … il n'ajoute jamais
 * un article absent du devis : ni en vert, ni en orange, ni en suggestion »). Calcul comme l'API (règles « à vérifier »
 * calculées, en orange).
 */
describe("D-2026-020 réel : le devis entier, lu jusqu'au bout", () => {
  const read = (answers: Record<string, unknown> = {}) => applyRuleConfirmations(readQuote(D2026_020_LINES, answers as never, ZONE_1, undefined, { acceptDraft: true }), answers as never);
  const v = read();
  const plan = planQuote(D2026_020_LINES, ROOFING_REFERENTIAL, tradeProfile("roofing"));
  const label = (re: RegExp, view = v) => view.toBuy.find((b) => re.test(b.label));
  const row = (itemKey: string, view = v) => view.screen.groups.flatMap((g) => g.rows).find((r) => r.itemKey === itemKey);
  const keys = (view = v) => view.questions.map((q) => q.key).sort();
  const u = (value: string, unit = "u") => ({ value, unit });
  // Toutes les réponses aux questions qui restent (artisan qui façonne tout, gouttière de 33).
  const REPONSES = {
    "param:developpe_gouttiere": u("330", "mm"),
    "param:developpe": u("250", "mm"),
    "param:faconnage@faitage-zinc": u("1"),
    "param:faconnage@bande-porte-solin": u("1"),
  };
  const repondu = read(REPONSES);

  it("RÈGLE NUMÉRO UN : aucun article absent du devis n'apparaît nulle part (vert, orange, gris, suggestion, question)", () => {
    const ABSENTS = /liteau|[ée]cran|hpv|pare-?pluie|patte|collier|dauphin|\bvis\b|silicone|mastic|pointe|closoir|about|jonction|talon|angle|bobineau/i;
    for (const view of [v, repondu]) {
      const partout = [
        ...view.toBuy.map((b) => b.label),
        ...view.toQuote.map((q) => q.label),
        ...view.suggestions.map((s) => s.label),
        ...view.questions.map((q) => `${q.title} ${q.text}`),
        ...view.screen.groups.flatMap((g) => g.rows).map((r) => r.pending?.label ?? ""),
      ];
      expect(partout.filter((t) => ABSENTS.test(t))).toEqual([]);
      expect(view.suggestions).toEqual([]);
    }
    // Ce qui sort, une fois tout répondu : les articles écrits, leur forme d'achat (feuilles 2 × 1 m pour le zinc façonné)
    // et la naissance, seul accessoire indissociable (§48.7). Rien d'autre.
    expect(repondu.toBuy.map((b) => [b.label.split(" - ")[0], b.quantity])).toEqual([
      ["Ardoises naturelles Espagne 1er choix 32×22", "2 052 pièces"],
      ["Crochets d'ardoise inox standard, longueur 11 cm", "2 094 pièces"],
      // Une feuille pour chaque pièce façonnée (rive 4 m, porte-solin 4 m, faîtage 8 m au développé de 25 cm : 8 m par
      // feuille), réunies sur une ligne au comptoir ; chaque usage est dit dans la précision.
      ["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "3 pièces"],
      ["Ciment 35 kg + sable (mortier de solin)", "1 sac"],
      ["Gouttière zinc Havraise dév. 33", "3 longueurs de 4 m"],
      ["Naissances zinc Havraise dév. 33 Ø80", "2 pièces"],
      ["Crochets de gouttière Havraise", "20 pièces"],
      ["Tuyau de descente zinc diam. 80mm", "2 longueurs de 3 m"],
      ["Coude zinc diam. 80mm", "4 pièces"],
    ]);
    expect(repondu.toQuote).toEqual([]);
    expect(label(/^Feuilles/, repondu)?.precision?.split(" ; ").map((p) => p.split(" :")[0])).toEqual(["pour 8 ml de faîtage", "pour 4 ml de bande", "pour 4 ml de porte-solin"]);
  });

  it("1. ni liteaux 18×40, ni contre-liteaux 27×40, ni écran HPV : le devis n'en écrit pas", () => {
    expect(label(/Liteaux|Écran/)).toBeUndefined();
  });

  it("crochets de 11, comme écrit (fourniture et pose d'accord) ; « inox » reste au crochet ; la pente (30°) vient de la ligne de pose", () => {
    expect(crochets(v)?.label).toBe("Crochets d'ardoise inox standard, longueur 11 cm");
    expect(slates(v)?.label).toBe("Ardoises naturelles Espagne 1er choix 32×22");
    expect(plan.lines.find((l) => l.ref === "2")).toEqual({ ref: "2", status: "not_material" });
    expect(plan.inputs.find((i) => i.workItemId === "couverture-ardoises-crochet")?.params.pente?.value).toBe("30");
  });

  it("6. crochets d'ardoise : 2 094 pour 2 052 ardoises, l'écart justifié sur la ligne (un par ardoise + 2 % de casse, référentiel)", () => {
    expect(slates(v)?.quantity).toBe("2 052 pièces");
    expect(crochets(v)).toMatchObject({ quantity: "2 094 pièces", precision: "un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02)" });
  });

  it("7. aucune question sur ce que le devis écrit : ni Ø des descentes (Ø80), ni longueur de crochet (11), ni hauteur, ni nombre de descentes", () => {
    for (const k of ["diametre_descente", "longueur_crochet", "hauteur_descente", "nb_descentes", "pente", "dauphin", "diametre_crochet"]) expect(keys()).not.toContain(`engine:param:${k}`);
  });

  it("2. zinc pièce par pièce : une question par ouvrage (faîtage, porte-solin), aucune pour les bandes de rive que le devis dit façonnées", () => {
    expect(keys().filter((k) => k.includes("faconnage"))).toEqual(["engine:param:faconnage@bande-porte-solin", "engine:param:faconnage@faitage-zinc"]);
    expect(plan.inputs.find((i) => i.workItemId === "bandes-zinc")?.params.faconnage?.value).toBe("1");
    // Restent seulement les vraies absences du devis : le développé de la gouttière Havraise, celui des bandes (pour le
    // façonnage), et les « C'est bon » (mortier estimé, écart sur les crochets de gouttière).
    expect(keys()).toEqual([
      "engine:param:developpe",
      "engine:param:developpe_gouttiere",
      "engine:param:faconnage@bande-porte-solin",
      "engine:param:faconnage@faitage-zinc",
      "ratio:line:4",
      "ratio:product:Ciment 35 kg + sable (mortier de solin)",
    ]);
    // Façonné sur place (§48.6) : feuilles 2 × 1 m d'après le développé, le raisonnement dit en clair.
    expect(label(/^Feuilles/, repondu)?.precision).toMatch(/estimation d'après un développé de 25 cm, ajuste selon ton façonnage$/);
  });

  it("3. le mortier de ciment de la ligne porte-solin apparaît, orange « Quantité à confirmer »", () => {
    const mortier = label(/^Ciment 35 kg \+ sable/)!;
    expect(mortier).toMatchObject({ quantity: "1 sac", lineIds: ["10"] });
    expect(row(mortier.key)).toMatchObject({ status: "check", reason: "Quantité à confirmer : estimation 1 sac de ciment 35 kg + sable" });
  });

  it("4. la gouttière garde « Havraise » dans sa désignation (et sa naissance aussi)", () => {
    expect(label(/^Gouttière/, repondu)?.label).toBe("Gouttière zinc Havraise dév. 33");
    expect(label(/^Naissances/, repondu)?.label).toBe("Naissances zinc Havraise dév. 33 Ø80");
  });

  it("5. tuyau de descente en longueurs : 2 longueurs de 3 m (« 2 descentes de 3 mètres »), pas 6 ml ; 4 coudes tels qu'écrits", () => {
    expect(label(/^Tuyau de descente/)).toMatchObject({ quantity: "2 longueurs de 3 m", order: { count: "2", unit: "longueurs de 3 m" } });
    expect(label(/^Coude zinc/)?.quantity).toBe("4 pièces");
    expect(plan.lines.find((l) => l.ref === "13")).toMatchObject({ slot: "coude", mentions: [] });
    for (const re of [/^Tuyau de descente/, /^Coude zinc/]) expect(row(label(re)!.key)?.status).toBe("ok");
  });

  it("quantité écrite comparée au calcul : 20 crochets de gouttière gardés, orange avec l'écart (21 pour 10 m à 50 cm)", () => {
    const crochetsGouttiere = label(/^Crochets de gouttière Havraise/)!;
    expect(crochetsGouttiere.quantity).toBe("20 pièces");
    expect(plan.lines.find((l) => l.ref === "4")).toMatchObject({ slot: "crochet", mentions: [] });
    expect(row(crochetsGouttiere.key)).toMatchObject({
      status: "check",
      reason: "Quantité à confirmer : 20 au devis, 21 calculés pour 10 ml de gouttière, un tous les 50 cm + 1 en bout",
    });
    const ok = read({ [`ratio:${crochetsGouttiere.key}`]: "ok" });
    expect(row(crochetsGouttiere.key, ok)?.status).toBe("ok");
  });

  it("répondu et confirmé : la liste peut partir", () => {
    const tout = read({ ...REPONSES, "ratio:line:4": "ok", "ratio:product:Ciment 35 kg + sable (mortier de solin)": "ok" });
    expect(tout.questions).toEqual([]);
    expect(tout.canValidate).toBe(true);
  });
});
