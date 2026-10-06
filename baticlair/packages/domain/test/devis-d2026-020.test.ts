import { describe, expect, it } from "vitest";
import { planQuote, ROOFING_REFERENTIAL, tradeProfile, type SiteFact } from "../src/index.js";
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
  it("la descente entière se déduit du devis : Ø « diam. 80mm », hauteur « 2 descentes de 3 m », 6 colliers, 2 naissances ; aucune question qu'il règle déjà", () => {
    const v = readQuote([{ ref: "3", designation: "Gouttière zinc demi-ronde dév. 25 (Longueur : 10 m)", quantity: "10", unit: "m" }, ...LIGNES]);
    const keys = v.questions.map((q) => q.key);
    for (const k of ["engine:param:diametre_descente", "engine:param:hauteur_descente", "engine:param:nb_descentes"]) expect(keys).not.toContain(k);
    const qty = (re: RegExp) => v.toBuy.filter((b) => re.test(b.label)).map((b) => b.quantity);
    // Avant : 12 colliers et 4 naissances (4 « descentes » lues dans les coudes).
    expect(qty(/^Colliers/)).toEqual(["6 pièces"]);
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
 * Le VRAI devis D-2026-020, lignes de pose comprises (retour du fondateur, 2026-10-06 : « tu mets des crochets de 12 alors
 * que dans le devis c'est bien indiqué crochet de 11 … ne pas poser des questions inutiles »). Tout ce que le devis écrit
 * se retrouve dans la liste, et aucune question ne porte sur ce qu'il règle déjà.
 */
describe("D-2026-020 réel : le devis entier, lu jusqu'au bout", () => {
  const v = readQuote(D2026_020_LINES, {}, ZONE_1);
  const plan = planQuote(D2026_020_LINES, ROOFING_REFERENTIAL, tradeProfile("roofing"));
  const label = (re: RegExp) => v.toBuy.find((b) => re.test(b.label));

  it("crochets de 11, comme écrit (ligne de fourniture et ligne de pose d'accord) ; « inox » reste au crochet", () => {
    expect(crochets(v)?.label).toBe("Crochets d'ardoise inox standard, longueur 11 cm");
    expect(slates(v)?.label).toBe("Ardoises naturelles Espagne 1er choix 32×22");
  });
  it("la ligne de pose donne la pente (30°) sans rien commander", () => {
    expect(plan.lines.find((l) => l.ref === "2")).toEqual({ ref: "2", status: "not_material" });
    expect(plan.inputs.find((i) => i.workItemId === "couverture-ardoises-crochet")?.params.pente?.value).toBe("30");
  });
  it("gouttière Havraise : les 20 crochets du devis, sans relire la gouttière dans « crochets de gouttière »", () => {
    expect(plan.lines.find((l) => l.ref === "4")).toMatchObject({ slot: "crochet", mentions: [] });
    expect(label(/^Crochets de gouttière Havraise/)?.quantity).toBe("20 pièces");
  });
  it("descentes : 6 ml de tubes et 4 coudes tels qu'écrits, 6 colliers ; « dévoiement des descentes » ne cite pas les tubes", () => {
    expect(plan.lines.find((l) => l.ref === "13")).toMatchObject({ slot: "coude", mentions: [] });
    expect(label(/^Coude zinc/)?.quantity).toBe("4 pièces");
    expect(label(/^Tuyau de descente/)?.quantity).toBe("6 ml");
    expect(label(/^Colliers/)?.quantity).toBe("6 pièces");
    expect(v.toQuote.map((q) => q.label).join(" ")).not.toMatch(/Tubes de descente/);
  });
  it("bandes de rive + bande porte-solin : 8 m de bande, façonnées par l'artisan (« Façonnage et pose »)", () => {
    const bandes = plan.inputs.find((i) => i.workItemId === "bandes-zinc")!;
    expect(bandes.params.longueur_bande?.value).toBe("8");
    expect(bandes.params.faconnage?.value).toBe("1");
    // Le développé du faîtage (25 cm) n'est pas celui des bandes de rive.
    expect(bandes.params.developpe).toBeUndefined();
    expect(v.toQuote).toEqual([]);
  });
  it("aucune question sur ce que le devis écrit ; restent les deux du comptoir que le devis ne règle pas", () => {
    expect(v.questions.map((q) => q.key).sort()).toEqual(["engine:param:dauphin", "engine:param:developpe_gouttiere"]);
  });
});
