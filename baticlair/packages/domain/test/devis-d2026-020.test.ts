import { describe, expect, it } from "vitest";
import { applyRuleConfirmations, planQuote, ROOFING_REFERENTIAL, tradeProfile, type QuoteLineReading, type SiteFact } from "../src/index.js";
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
 * §49.6 TEST PERMANENT D-2026-020 (devis réel, anonymisé) : la charte du quantitatif (§49) vérifiée ligne par ligne.
 * Toute modification future qui casse une de ces attentes fait échouer le test avant la mise en ligne. Calcul comme
 * l'API (règles « à vérifier » calculées, en orange).
 */
describe("§49.6 D-2026-020 : la liste, ligne par ligne, dans l'ordre du devis", () => {
  const read = (answers: Record<string, unknown> = {}, readings?: Map<string, QuoteLineReading>) =>
    applyRuleConfirmations(readQuote(D2026_020_LINES, answers as never, ZONE_1, undefined, { acceptDraft: true }, readings), answers as never);
  const v = read();
  const plan = planQuote(D2026_020_LINES, ROOFING_REFERENTIAL, tradeProfile("roofing"));
  const rows = (view = v) => view.screen.groups.flatMap((g) => g.rows);
  const row = (key: string, view = v) => rows(view).find((r) => r.itemKey === key);
  const keys = (view = v) => view.questions.filter((q) => q.question).map((q) => q.key).sort();
  const u = (value: string, unit = "u") => ({ value, unit });
  const liste = (view = v) => view.toBuy.map((b) => [b.label.split(" - ")[0], b.quantity]);
  // L'artisan répond à tout : gouttière de 33, bandes de 25, il façonne faîtage et porte-solin, et dit oui aux consommables.
  const REPONSES = {
    "param:developpe_gouttiere": u("330", "mm"),
    "param:developpe": u("250", "mm"),
    "param:faconnage@faitage-zinc": u("1"),
    "param:faconnage@bande-porte-solin": u("1"),
  };
  const repondu = read({ ...REPONSES, "param:consommables": u("0") });

  it("1. la liste attendue, dans l'ordre du devis (avant réponse) : chaque article écrit, la naissance d'office, rien d'autre", () => {
    expect(liste()).toEqual([
      ["Ardoises naturelles Espagne 1er choix 32×22", "2 052 pièces"],
      ["Crochets d'ardoise inox standard, longueur 11 cm", "2 094 pièces"],
      ["Gouttière zinc Havraise dév. ?", "3 longueurs de 4 m"],
      ["Naissances zinc Havraise dév. ? Ø80", "2 pièces"],
      ["Crochets de gouttière Havraise", "20 pièces"],
      ["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "1 pièce"],
      ["Faîtage en bande zinc, dév. 25 cm", "8 ml"],
      ["Bande porte-solin zinc", "4 ml"],
      ["Mortier d'étanchéité pour solin, sac 25 kg", "1 sac de 25 kg"],
      ["Tuyau de descente zinc diam. 80mm", "2 tubes de 3 m"],
      ["Coude zinc diam. 80mm", "4 pièces"],
      ["Colliers de descente Ø80", "6 pièces"],
    ]);
    expect(v.toQuote).toEqual([]);
    expect(v.suggestions).toEqual([]);
  });

  it("ardoises : pièces d'après 48 m², crochet 11, pente 30°, la marge écrite ; crochets inox 11 cm = ardoises × 1,02", () => {
    const ardoises = v.toBuy[0]!;
    expect(ardoises.precision).toBe("48 m² × 40,7 ardoises/m² (crochet 11 cm, pente 30°) + 5 % de marge");
    expect(v.toBuy[1]!.precision).toBe("un par ardoise commandée, + 2 % de casse (référentiel : crochets = ardoises × 1,02)");
    expect(plan.inputs.find((i) => i.workItemId === "couverture-ardoises-crochet")?.params.pente?.value).toBe("30");
  });

  it("gouttière Havraise : longueurs de barre, orange « Info manquante : développé » tant que l'artisan n'a pas répondu, avec le retour d'angle écrit ; naissance d'office", () => {
    const [gouttiere, naissance] = [v.toBuy[2]!, v.toBuy[3]!];
    expect(gouttiere.precision).toBe("y compris retour d'angle et gouttière au-dessus de la verrière");
    for (const b of [gouttiere, naissance]) expect(row(b.key)).toMatchObject({ status: "check", decisionKey: "engine:param:developpe_gouttiere", reason: "Info manquante : développé de la gouttière" });
    expect(liste(repondu).slice(2, 4)).toEqual([
      ["Gouttière zinc Havraise dév. 33", "3 longueurs de 4 m"],
      ["Naissances zinc Havraise dév. 33 Ø80", "2 pièces"],
    ]);
  });

  it("crochets de gouttière : 20 comme au devis, orange « Le devis dit 20, le calcul donne 21 » ; « C'est bon » tranche", () => {
    const crochets = v.toBuy[4]!;
    expect(row(crochets.key)).toMatchObject({ status: "check", reason: "Le devis dit 20, le calcul donne 21 (pour 10 ml de gouttière, un tous les 50 cm + 1 en bout)" });
    expect(row(crochets.key, read({ [`ratio:${crochets.key}`]: "ok" }))?.status).toBe("ok");
  });

  it("bandes de rive : façonnées (le devis le dit, pas de question), feuilles 2 × 1 m estimées, orange « ajuste selon ton façonnage »", () => {
    const rive = v.toBuy[5]!;
    expect(rive.lineIds).toEqual(["6"]);
    expect(row(rive.key)?.status).toBe("check");
    expect(row(rive.key)?.reason).toMatch(/ajuste selon ton façonnage/);
    expect(plan.inputs.find((i) => i.workItemId === "bandes-zinc")?.params.faconnage?.value).toBe("1");
  });

  it("faîtage dév. 25 cm et porte-solin : une question façonnage chacun ; façonnés, des feuilles chacun (jamais fusionnées)", () => {
    expect(row(v.toBuy[6]!.key)).toMatchObject({ status: "check", decisionKey: "engine:param:faconnage@faitage-zinc" });
    expect(row(v.toBuy[7]!.key)).toMatchObject({ status: "check", decisionKey: "engine:param:faconnage@bande-porte-solin" });
    expect(repondu.toBuy.filter((b) => b.label.startsWith("Feuilles")).map((b) => [b.lineIds, b.quantity, b.precision?.split(" :")[0]])).toEqual([
      [["6"], "1 pièce", "pour 4 ml de bande"],
      [["8"], "1 pièce", "pour 8 ml de faîtage"],
      [["10"], "1 pièce", "pour 4 ml de porte-solin"],
    ]);
    // Commandé tout fait : des longueurs, pas des feuilles.
    const achete = read({ ...REPONSES, "param:faconnage@faitage-zinc": u("2") });
    expect(achete.toBuy.find((b) => b.lineIds.includes("8"))?.label).toMatch(/^Faîtage zinc naturel 0,65 mm, bande dév\. 25 cm/);
  });

  it("§49.7 mortier du porte-solin : mortier d'étanchéité, 4 ml × 2 kg/ml = 8 kg ⇒ 1 sac de 25 kg, vert ; tuyau Ø80 en 2 tubes de 3 m ; 4 coudes ; colliers Ø80 orange (fixation non chiffrée)", () => {
    const mortier = v.toBuy[8]!;
    expect(mortier).toMatchObject({ label: "Mortier d'étanchéité pour solin, sac 25 kg", quantity: "1 sac de 25 kg", precision: "4 ml × 2 kg/ml", lineIds: ["10"] });
    expect(row(mortier.key)?.status).toBe("ok");
    for (const b of [v.toBuy[9]!, v.toBuy[10]!]) expect(row(b.key)?.status).toBe("ok");
    expect(v.toBuy[9]!.order).toEqual({ count: "2", unit: "tubes de 3 m" });
    expect(v.toBuy[11]!).toMatchObject({ lineIds: ["14"] });
    expect(row(v.toBuy[11]!.key)).toMatchObject({ status: "check", reason: "Le devis parle de fixation sans les chiffrer : quantité calculée, à vérifier" });
  });

  it("consommables : seulement si l'artisan dit oui, liés aux lignes écrites, orange et en fin de liste ; non : rien", () => {
    expect(keys()).toContain("engine:param:consommables");
    expect(repondu.toBuy.filter((b) => b.consumable)).toEqual([]);
    const oui = read({ ...REPONSES, "param:consommables": u("1") });
    const consommables = oui.toBuy.filter((b) => b.consumable);
    expect(consommables.map((b) => [b.label, b.lineIds])).toEqual([
      ["Décapant zinc, flacon de 250 ml", ["3"]],
      ["Étain à souder en baguettes de 250 g", ["3"]],
      ["Vis inox 4 × 40", ["6"]],
      ["Cartouches de silicone zinc", ["6"]],
      ["Pattes de fixation", ["8"]],
      ["Cartouches de silicone zinc", ["10"]],
    ]);
    expect(oui.toBuy.slice(-consommables.length)).toEqual(consommables);
    for (const c of consommables) expect(row(c.key, oui)?.status).toBe("check");
  });

  it("lignes interdites : ni liteaux, ni contre-liteaux, ni écran, ni pare-pluie (ni nulle part ailleurs)", () => {
    const INTERDITS = /liteau|[ée]cran|hpv|pare-?pluie/i;
    for (const view of [v, repondu, read({ ...REPONSES, "param:consommables": u("1") })]) {
      const partout = [...view.toBuy.map((b) => b.label), ...view.toQuote.map((q) => q.label), ...view.suggestions.map((s) => s.label), ...view.questions.map((q) => `${q.title} ${q.text}`)];
      expect(partout.filter((t) => INTERDITS.test(t))).toEqual([]);
    }
  });

  it("questions interdites : ni Ø80, ni longueur de crochet, ni façonnage des rives, ni nombre de descentes (même si l'IA les mettait dans « manque »)", () => {
    const readings = new Map<string, QuoteLineReading>([
      ["3", { role: "fourniture", articles: [], faconnage: "fourni", manque: ["développé de la gouttière (25, 28, 33, 40)"] }],
      ["6", { role: "fourniture", articles: [], faconnage: null, manque: ["façonnage des bandes de rive"] }],
      ["12", { role: "fourniture", articles: [], faconnage: "fourni", manque: ["diamètre des descentes (80, 100)", "nombre de descentes"] }],
    ]);
    const lu = read({}, readings);
    const textes = lu.questions.filter((q) => q.question).map((q) => q.question!.text);
    for (const interdit of [/Ø|diam[eè]tre/i, /longueur de crochet/i, /nombre de descentes|combien de descentes/i]) expect(textes.filter((t) => interdit.test(t))).toEqual([]);
    expect(keys(lu).filter((k) => k.includes("faconnage@bandes-zinc") || k === "engine:param:faconnage")).toEqual([]);
    for (const k of ["diametre_descente", "longueur_crochet", "hauteur_descente", "nb_descentes", "pente"]) expect(keys(lu)).not.toContain(`engine:param:${k}`);
    // Le tiroir pose déjà le développé de la gouttière : « manque » ne le redemande pas.
    expect(textes.filter((t) => /d[ée]velopp|de 25, de 28/i.test(t) && /goutti/i.test(t))).toEqual(["Gouttière de 25, de 28, de 33 ou de 40 ?"]);
  });

  it("§49.4 : une question de comptoir venue de « manque » (absente du tiroir) : boutons tirés de la parenthèse ; sans réponse, ses lignes sont orange ; la réponse part en précision", () => {
    const readings = new Map<string, QuoteLineReading>([["1", { role: "fourniture", articles: [], faconnage: null, manque: ["qualité de l'ardoise (Espagne 1er choix, NF Cupa)", "épaisseur du zinc (0,65, 0,80)"] }]]);
    const lu = read({}, readings);
    const q = lu.questions.find((d) => d.key.startsWith("comptoir:1:"))!;
    expect(q.question).toMatchObject({ text: "Qualité de l'ardoise ?", options: [{ label: "Espagne 1er choix" }, { label: "NF Cupa" }] });
    // L'épaisseur du zinc est déjà annoncée (« Je pars sur ces valeurs ») : pas de seconde question.
    expect(lu.questions.filter((d) => d.key.startsWith("comptoir:"))).toHaveLength(1);
    expect(row(lu.toBuy[0]!.key, lu)).toMatchObject({ status: "check", decisionKey: q.key });
    const repondu = read({ [q.key]: "NF Cupa" }, readings);
    expect(repondu.toBuy[0]!.precision).toMatch(/; Qualité de l'ardoise : NF Cupa$/);
    expect(repondu.questions.some((d) => d.key === q.key)).toBe(false);
  });

  it("§49.8 : chaque ligne orange porte de quoi se régler dans sa carte, d'un geste (boutons, ou « Garder 20 » / « Mettre 21 »)", () => {
    const [ardoises, , gouttiere, naissance, crochets] = v.toBuy;
    expect(gouttiere!.asks).toEqual([{ key: "param:developpe_gouttiere", text: "Gouttière de 25, de 28, de 33 ou de 40", unit: "cm", options: expect.arrayContaining([expect.objectContaining({ label: "De 25" }), expect.objectContaining({ label: "De 40" })]) }]);
    expect(naissance!.asks?.map((q) => q.key)).toEqual(["param:developpe_gouttiere"]);
    expect(crochets!.gap).toEqual({ written: "20", computed: "21", unit: "pièces" });
    expect(ardoises!.asks?.map((q) => q.key)).toEqual(["param:diametre_crochet"]);
    expect(v.toBuy[6]!.asks?.[0]?.options.map((o) => o.label)).toEqual(["Je façonne (feuilles ou bobineau)", "Je commande façonné"]);
    // Un tap : la gouttière se recalcule et passe au vert.
    const tap = read({ "param:developpe_gouttiere": u("330", "mm") });
    expect(row(tap.toBuy[2]!.key, tap)?.status).toBe("ok");
  });

  it("répondu et confirmé : rien ne reste orange, la liste peut partir", () => {
    const base = { ...REPONSES, "param:consommables": u("0"), "param:diametre_crochet": u("1", "mm"), "param:aspect_zinc": u("1"), "param:epaisseur_zinc": u("0.65", "mm") };
    let tout = read(base);
    const ok = Object.fromEntries(tout.questions.filter((q) => q.key.startsWith("ratio:")).map((q) => [q.key, "ok"]));
    tout = read({ ...base, ...ok });
    expect(tout.questions).toEqual([]);
    expect(tout.canValidate).toBe(true);
  });
});
