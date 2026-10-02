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
} from "../src/index.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";

/**
 * LE SOCLE EN TROIS NIVEAUX, sur le vrai devis D-2026-015 :
 *  1. ce que dit le devis (mesure de l'ouvrage, ou quantité à commander) ;
 *  2. le besoin matériel calculé ;
 *  3. la quantité à commander (seulement si le conditionnement est sourcé).
 * Les règles de couverture restent EN BROUILLON : ces tests le vérifient aussi.
 */
function read(answers: Record<string, EngineAnswer> = {}, acceptDraft = false) {
  const profile = tradeProfile("roofing");
  const raw = validateTakeoff(
    D2026_015_LINES.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })),
    profile,
  );
  const plan = planQuote(D2026_015_LINES.map((l) => ({ ...l })), ROOFING_REFERENTIAL, profile);
  const proposals = proposeLineRoles(D2026_015_LINES.map((l) => ({ ref: l.ref })), plan, raw, ROOFING_REFERENTIAL);
  const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
  const validation = applyLineRoles(raw, roles);
  const engine = computeWithAnswers(ROOFING_REFERENTIAL, plan, answers, {}, { acceptDraft }, slotsGivenByQuote(plan, validation));
  const lines = D2026_015_LINES.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: false, enteredByArtisan: false }));
  const view = artisanView(lines, validation, engine, { plan, roles, ref: ROOFING_REFERENTIAL });
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

  it("règles en brouillon : le besoin en liteaux est « à calculer », avec la raison", () => {
    const liteaux = read(ANSWERS).ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux).toMatchObject({ need: null, order: null, state: "missing" });
    expect(liteaux.missing).toMatch(/en attente de vérification/);
  });

  it("calcul provisoire (règle en brouillon, écran du validateur) : un besoin en mètres de liteaux, distinct de la surface", () => {
    const liteaux = read(ANSWERS, true).ouvrage("ligne 3").needs.find((n) => n.slot === "liteau")!;
    expect(liteaux.need).toEqual({ value: "349.85", unit: "ml" });
    // Longueur vendue du liteau non sourcée : rien à commander, le fournisseur précise.
    expect(liteaux.order).toBeNull();
    expect(liteaux.missing).toMatch(/[Cc]onditionnement/);
  });
});

describe("niveau 3 : à commander, jamais avant que le besoin ne soit établi", () => {
  it("une règle en brouillon ne produit aucun ✓, même quand le calcul provisoire aboutit", () => {
    for (const draft of [false, true]) {
      const { view } = read(ANSWERS, draft);
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
  it("2 descentes de 4 m avec coudes et colliers = 2 ouvrages à décomposer, pas 2 articles à commander", () => {
    const { ouvrage, view } = read();
    const descente = ouvrage("ligne 8");
    expect(descente.role).toBe("measure");
    expect(descente.direct).toBeNull();
    expect(descente.needs.map((n) => n.slot).sort()).toEqual(["collier", "coude", "tube"]);
    expect(descente.state).not.toBe("verified");
    expect(view.items.find((i) => i.id === "ligne 8")!.state).not.toBe("verified");
  });

  it("20 m de gouttière « crochets et naissances compris » : pas de ✓ tant que ses besoins ne sont pas établis, accessoires visibles", () => {
    const { ouvrage, view } = read();
    const gouttiere = ouvrage("ligne 7");
    expect(gouttiere.role).toBe("measure");
    expect(gouttiere.direct).toBeNull();
    expect(gouttiere.needs.map((n) => n.slot).sort()).toEqual(["crochet", "naissance", "profil"]);
    for (const slot of ["crochet", "naissance"]) expect(gouttiere.needs.find((n) => n.slot === slot)!.origin).toBe("explicit");
    expect(gouttiere.state).not.toBe("verified");
    expect(view.items.find((i) => i.id === "ligne 7")!.state).not.toBe("verified");
  });

  it("faîtage : le closoir et les fixations cités restent visibles, même sans quantité", () => {
    const faitage = read().ouvrage("ligne 6");
    expect(faitage.needs.map((n) => n.slot)).toEqual(expect.arrayContaining(["faitiere", "closoir", "fixation_faitiere"]));
    expect(faitage.state).not.toBe("verified");
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
      "Valeurs réellement produites par BatiClair. Les règles de couverture sont EN BROUILLON :",
      "aucune n'a été validée pour ce rapport.",
      "",
      table("1. Aujourd'hui, sans réponse de l'artisan (ce que voit l'application)", {}, false),
      table("2. Après les réponses de l'artisan (modèle de tuile, pureau 34,3 cm, écran)", ANSWERS, false),
      table("3. Calcul PROVISOIRE avec les règles en brouillon (écran du validateur, jamais montré à l'artisan)", ANSWERS, true),
    ].join("\n");
    await expect(doc).toMatchFileSnapshot("../../../docs/socle-trois-niveaux-d2026-015.md");
  });
});
