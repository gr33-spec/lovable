import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  artisanView,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type EngineAnswer,
  type LineRole,
  type OuvrageLevels,
  type Referential,
} from "../src/index.js";
import { drafted } from "./support/brouillon.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";

/**
 * LE SOCLE EN TROIS NIVEAUX, sur le vrai devis D-2026-015 :
 *  1. ce que dit le devis (mesure de l'ouvrage, ou quantité à commander) ;
 *  2. le besoin matériel calculé ;
 *  3. la quantité à commander (seulement si le conditionnement est sourcé).
 * Les règles de couverture sont validées par le fondateur (2026-10-02) ; les
 * garanties « brouillon » restent prouvées sur une copie remise en brouillon.
 */
function read(answers: Record<string, EngineAnswer> = {}, acceptDraft = false, ref: Referential = ROOFING_REFERENTIAL) {
  const profile = tradeProfile("roofing");
  const raw = validateTakeoff(
    D2026_015_LINES.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })),
    profile,
  );
  const plan = planQuote(D2026_015_LINES.map((l) => ({ ...l })), ref, profile);
  const proposals = proposeLineRoles(D2026_015_LINES.map((l) => ({ ref: l.ref })), plan, raw, ref);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ref, plan, answers, {}, { acceptDraft }, slotsGivenByQuote(plan, validation));
  const lines = D2026_015_LINES.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false }));
  const view = artisanView(lines, validation, engine, { plan, roles, ref });
  return { proposals, roles, validation, view, ouvrage: (ref: string) => view.ouvrages.find((o) => o.lineId === ref)! };
}

const ANSWERS: Record<string, EngineAnswer> = {
  "product:tuile": "edilians-hp10-huguenot",
  "param:pureau": { value: "34.3", unit: "cm" },
  "product:ecran": "soprema-sop-ecran-hpv-r2-150x50",
};

describe("niveau 1 : ce que dit le devis", () => {
  it("chaque ligne a un rôle explicite, avec sa raison", () => {
    const { proposals } = read();
    expect(Object.fromEntries([...proposals].map(([k, v]) => [k, v.role]))).toEqual({
      "ligne 1": "measure",
      "ligne 2": "measure",
      "ligne 3": "measure",
      "ligne 4": "measure",
      "ligne 5": "measure",
      "ligne 6": "measure",
      "ligne 7": "measure",
      "ligne 8": "measure",
      "ligne 9": "purchase",
      "ligne 10": "purchase",
    });
    expect(proposals.get("ligne 7")!.why).toMatch(/crochets.*naissances.*compris/i);
    expect(proposals.get("ligne 8")!.why).toMatch(/ouvrage/);
  });

  it("120 m² de lattage reste une mesure de toiture : jamais une quantité à commander", () => {
    const { validation, ouvrage } = read();
    const lattage = ouvrage("ligne 3");
    expect(lattage.role).toBe("measure");
    expect(lattage.read).toEqual({ quantity: "120", unit: "m²" });
    expect(lattage.direct).toBeNull();
    expect(validation.lines.find((v) => v.lineId === "ligne 3")!.basis).toBe("work");
  });
});

describe("niveau 2 : le besoin, dans SA propre unité", () => {
  const ml120 = (o: OuvrageLevels) => o.needs.some((n) => n.need?.value === "120" && (n.need.unit === "m" || n.need.unit === "ml")) || (o.direct?.quantity === "120" && /m/.test(o.direct.unit) && !/m²|m2/.test(o.direct.unit));

  it("120 m² de lattage ne devient JAMAIS 120 ml de liteaux, quelles que soient les réponses", () => {
    for (const [answers, draft] of [
      [{}, false],
      [ANSWERS, false],
      [ANSWERS, true],
    ] as const) {
      const { view, ouvrage } = read(answers, draft);
      for (const ref of ["ligne 2", "ligne 3"]) expect(ml120(ouvrage(ref))).toBe(false);
      expect(view.items.some((i) => i.quantity === "120 m" || i.quantity === "120 ml")).toBe(false);
    }
  });

  it("règle remise en brouillon : le besoin en liteaux est « à calculer », avec la raison", () => {
    const liteaux = read(ANSWERS, false, drafted(ROOFING_REFERENTIAL)).ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux).toMatchObject({ need: null, order: null, state: "missing" });
    expect(liteaux.missing).toMatch(/en attente de vérification/);
  });

  it("sans pureau écrit : l'hypothèse du référentiel (pureau mini en zone littorale) calcule les liteaux, et le dit", () => {
    const liteaux = read().ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!;
    // 120 / 0,31 = 387,10 ml + 5 % = 406,45 ml.
    expect(liteaux.need).toEqual({ value: "406.45", unit: "ml" });
    expect(liteaux.assumptions.map((a) => a.key)).toEqual(expect.arrayContaining(["param:pureau", "param:zone"]));
  });

  it("règle validée, pureau répondu : un besoin en mètres de liteaux, distinct de la surface, jamais provisoire", () => {
    const liteaux = read(ANSWERS).ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!;
    // 120 / 0,343 = 349,85 ml + 5 % de chutes = 367,35 ml, commandés au mètre.
    expect(liteaux.need).toEqual({ value: "367.35", unit: "ml" });
    expect(liteaux.provisional).toBe(false);
    expect(liteaux.order).toMatchObject({ count: "368", unit: { many: "ml" } });
    expect(liteaux.assumptions.some((a) => a.key === "param:pureau")).toBe(false);
  });
});

describe("niveau 3 : à commander, jamais avant que le besoin ne soit établi", () => {
  it("une règle en brouillon ne produit aucun ✓, même quand le calcul provisoire aboutit", () => {
    for (const draft of [false, true]) {
      const { view } = read(ANSWERS, draft, drafted(ROOFING_REFERENTIAL));
      for (const o of view.ouvrages.filter((x) => x.role === "measure")) {
        for (const n of o.needs) expect(n.state).not.toBe("verified");
        expect(o.state).not.toBe("verified");
      }
      for (const i of view.items.filter((x) => x.kind === "need")) expect(i.state).not.toBe("verified");
    }
  });

  it("une quantité inconnue reste inconnue : jamais remplacée par 1", () => {
    const { view } = read();
    for (const o of view.ouvrages) {
      for (const n of o.needs.filter((x) => x.state !== "verified")) {
        expect(n.need === null || n.need.value !== "1").toBe(true);
        expect(n.order).toBeNull();
      }
    }
  });
});

describe("ouvrages composés", () => {
  it("2 descentes de 4 m avec coudes et colliers = 2 ouvrages décomposés : 8 m de tube, 4 coudes, 8 colliers", () => {
    const { ouvrage } = read();
    const descente = ouvrage("ligne 8");
    expect(descente.role).toBe("measure");
    expect(descente.direct).toBeNull();
    const q = (slot: string) => descente.needs.find((n) => n.slot === slot)!;
    expect(q("tube").need).toEqual({ value: "8", unit: "ml" });
    // « 2 jeux de coudes » n'est pas un nombre : hypothèse 2 coudes par descente (un dévoiement), dite.
    expect(q("coude")).toMatchObject({ need: { value: "4", unit: "u" }, assumptions: expect.arrayContaining([expect.objectContaining({ key: "param:coudes_par_descente" })]) });
    // Un collier tous les 1,8 m plus un : 2 × (3 + 1).
    expect(q("collier").need).toEqual({ value: "8", unit: "u" });
    expect(descente.state).toBe("verified");
  });

  it("20 m de gouttière « crochets et naissances compris » : profil, crochets et naissances calculés, accessoires visibles", () => {
    const { ouvrage } = read();
    const gouttiere = ouvrage("ligne 7");
    expect(gouttiere.role).toBe("measure");
    expect(gouttiere.direct).toBeNull();
    expect(gouttiere.needs.map((n) => n.slot).sort()).toEqual(["crochet", "naissance", "profil"]);
    for (const slot of ["crochet", "naissance"]) expect(gouttiere.needs.find((n) => n.slot === slot)!.origin).toBe("explicit");
    const q = (slot: string) => gouttiere.needs.find((n) => n.slot === slot)!;
    expect(q("profil").order).toMatchObject({ count: "5", unit: { many: "longueurs de 4 m" } });
    // Zone littorale par défaut : un crochet tous les 40 cm.
    expect(q("crochet").need).toEqual({ value: "50", unit: "u" });
    expect(q("naissance").need).toEqual({ value: "2", unit: "u" });
    expect(gouttiere.state).toBe("verified");
  });

  it("faîtage : faîtières, closoir, crochets de faîtière et abouts, tous calculés avec les pièces par défaut", () => {
    const faitage = read().ouvrage("ligne 6");
    expect(faitage.needs.map((n) => n.slot).sort()).toEqual(["about", "closoir", "faitiere", "fixation_faitiere"]);
    const q = (slot: string) => faitage.needs.find((n) => n.slot === slot)!;
    // 10 m × 2,9 pièces/ml = 29 faîtières (modèle à préciser par le fournisseur), autant de crochets, 2 abouts, 2 rouleaux de closoir.
    expect(q("faitiere").order).toMatchObject({ count: "29" });
    expect(q("fixation_faitiere").order).toMatchObject({ count: "29" });
    expect(q("about").order).toMatchObject({ count: "2" });
    expect(q("closoir").order).toMatchObject({ count: "2", unit: { many: "rouleaux de 5 m" } });
    expect(faitage.state).toBe("verified");
  });

  it("une quantité d'article écrite reste à commander telle quelle (chatières, sortie de toit)", () => {
    const { ouvrage } = read();
    expect(ouvrage("ligne 9")).toMatchObject({ role: "purchase", direct: { quantity: "10", unit: "unités" }, needs: [], state: "verified" });
    expect(ouvrage("ligne 10")).toMatchObject({ role: "purchase", direct: { quantity: "1", unit: "unité" }, needs: [], state: "verified" });
  });
});

/** « Lu dans le devis → Il faut → À commander », tel que BatiClair le produit (rapport généré). */
describe("rapport : D-2026-015 en trois niveaux", () => {
  const unit = (u: string) => (u === "u" ? "pièce(s)" : u === "m2" ? "m²" : u);
  const fr = (v: string) => v.replace(".", ",");
  const table = (title: string, answers: Record<string, EngineAnswer>, draft: boolean) => {
    const { view } = read(answers, draft);
    const rows = view.ouvrages.map((o) => {
      const lu = `${o.read.quantity ?? "?"} ${o.read.unit ?? ""}`.trim();
      const role = o.role === "measure" ? "mesure de l'ouvrage" : o.role === "purchase" ? "à commander tel quel" : "indéterminé";
      const besoin = o.direct
        ? `${o.direct.quantity} ${o.direct.unit} (tel quel)`
        : o.needs.length === 0
          ? `à calculer — ${o.pending ?? ""}`
          : o.needs.map((n) => `${n.label} : ${n.need ? `${fr(n.need.value)} ${unit(n.need.unit)}` : n.needRange ? `${fr(n.needRange.min)} à ${fr(n.needRange.max)} ${unit(n.needRange.unit)}` : "à calculer"}`).join(" ; ");
      const commande = o.direct
        ? `${o.direct.quantity} ${o.direct.unit}`
        : o.needs.length === 0
          ? "—"
          : o.needs.map((n) => `${n.label} : ${n.order ? `${n.order.count} ${Number(n.order.count) > 1 ? n.order.unit.many : n.order.unit.one}` : "à préciser"}`).join(" ; ");
      const state = { verified: "✓", to_confirm: "⚠", missing: "?" }[o.state];
      return `| ${o.lineId} — ${o.designation.split(" (")[0]} | ${lu} (${role}) | ${besoin} | ${commande} | ${state} |`;
    });
    return [`### ${title}`, "", "| Ligne du devis | Lu dans le devis | Il faut | À commander | État |", "|---|---|---|---|---|", ...rows, ""].join("\n");
  };

  it("génère docs/socle-trois-niveaux-d2026-015.md", async () => {
    const doc = [
      "# D-2026-015 en trois niveaux : lu dans le devis → il faut → à commander",
      "",
      "Fichier GÉNÉRÉ par `packages/domain/test/socle-trois-niveaux.test.ts` : ne pas modifier à la main.",
      "Valeurs réellement produites par BatiClair. Règles, hypothèses par défaut (pente 45 %, zone littorale, rampant ≤ 5,5 m,",
      "entraxe 60 cm) et pertes : référentiel du fondateur (couvreur), 2026-10-03. Ce qui n'a pas de règle reste « à faire chiffrer ».",
      "",
      table("1. Sans réponse de l'artisan (ce que voit l'application à l'ouverture)", {}, false),
      table("2. Après les réponses de l'artisan (modèle de tuile, pureau 34,3 cm, écran)", ANSWERS, false),
    ].join("\n");
    await expect(doc).toMatchFileSnapshot("../../../docs/socle-trois-niveaux-d2026-015.md");
  });
});

describe("aucune ambiguïté de nom pour l'artisan", () => {
  it("lattage et contre-lattage ne portent jamais le même nom de besoin", () => {
    for (const draft of [false, true]) {
      const { ouvrage } = read(ANSWERS, draft);
      const lattage = ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!.label;
      const contre = ouvrage("ligne 2").needs.find((n) => n.slot === "contre_liteau")!.label;
      expect(lattage).not.toBe(contre);
      expect(contre).toMatch(/^Contre-liteaux/);
    }
  });
});
