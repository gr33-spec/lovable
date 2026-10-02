import { describe, expect, it } from "vitest";
import {
  artisanView,
  computeWithAnswers,
  groupIdenticalLines,
  planQuote,
  ROOFING_REFERENTIAL,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type ArtisanView,
  type Decision,
  type EngineAnswer,
  type Referential,
  type ViewLine,
} from "../src/index.js";
import { D2026_011_LINES } from "./devis-reels/d2026-011.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";
import { MORELLEC_LINES } from "./devis-reels/electricite-plomberie-morellec.js";
import { PISCINE_LINES } from "./devis-reels/piscine.js";
import { LEZARDRIEUX_LINES } from "./devis-reels/platrerie-lezardrieux.js";
import type { BenchLine } from "./devis-reels/truth.js";

/**
 * L'ÉCRAN DE L'ARTISAN SUR LES VRAIS DEVIS : ce qu'il voit à l'arrivée,
 * combien de décisions il prend, ce qui change après ses réponses, la liste
 * qui part au fournisseur. Rapport généré : docs/vue-artisan-vrais-devis.md.
 */
interface Line extends ViewLine {
  section: readonly string[];
}

const toLines = (bench: BenchLine[]): Line[] =>
  bench.map((l) => ({ id: l.ref, designation: l.designation, quantity: l.quantity, unit: l.unit, section: l.section ?? [], confirmed: false, enteredByArtisan: false }));

function view(lines: Line[], trade: string, answers: Record<string, EngineAnswer> = {}, ref: Referential = ROOFING_REFERENTIAL): ArtisanView {
  const profile = tradeProfile(trade);
  const validation = validateTakeoff(
    lines.map((l) => ({ id: l.id, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, section: l.section, source: "client_quote" as const })),
    profile,
  );
  const plan = planQuote(lines.map((l) => ({ ref: l.id, ...l })), ref, profile);
  const engine = computeWithAnswers(ref, plan, answers, {}, {}, slotsGivenByQuote(plan, validation));
  return artisanView(lines, validation, engine);
}

/** Le geste de l'artisan sur une décision : ce que fait l'application (unité « u », « C'est bon »). */
function decide(lines: Line[], d: Decision): Line[] {
  if (!d.primary || d.primary.action === "answer" || d.primary.action === "edit") return lines;
  return lines.map((l) => {
    if (!d.lineIds.includes(l.id)) return l;
    if (d.primary!.action === "pieces" && d.pieceLineIds?.includes(l.id)) return { ...l, unit: "u", enteredByArtisan: true, confirmed: true };
    return { ...l, confirmed: true };
  });
}

const CASES = [
  { id: "Morellec — électricité + plomberie", lines: MORELLEC_LINES, trade: "electrical,plumbing" },
  { id: "Lézardrieux — plâtrerie", lines: LEZARDRIEUX_LINES, trade: "drywall" },
  { id: "Piscine", lines: PISCINE_LINES, trade: "other" },
  { id: "D-2026-011 — salle de bain", lines: D2026_011_LINES, trade: "plumbing,tiling,electrical,painting" },
  { id: "D-2026-015 — couverture", lines: D2026_015_LINES, trade: "roofing" },
];

/** L'artisan prend chaque décision proposée (réponse principale). Les questions du calcul : « aucun de ces produits ». */
function walkthrough(c: (typeof CASES)[number]) {
  let lines = toLines(c.lines);
  const answers: Record<string, EngineAnswer> = {};
  const arrival = view(lines, c.trade);
  const taken: Decision[] = [];
  for (let turn = 0; turn < 50; turn++) {
    const v = view(lines, c.trade, answers);
    const next = v.decisions.find((d) => d.primary && (d.primary.action === "pieces" || d.primary.action === "keep" || d.primary.action === "answer") && !taken.some((t) => t.key === d.key));
    if (!next) break;
    taken.push(next);
    if (next.question) answers[next.question.key] = null;
    else lines = decide(lines, next);
  }
  const after = view(lines, c.trade, answers);
  return { arrival, taken, after, lines };
}

const counts = (v: ArtisanView) => `✓ ${v.counts.verified} prêts · ⚠ ${v.counts.to_confirm} à confirmer · ? ${v.counts.missing} information manquante`;

describe("écran de l'artisan sur les vrais devis", () => {
  it("le rapport est à jour (docs/vue-artisan-vrais-devis.md)", async () => {
    const out: string[] = [
      "# Ce que voit l'artisan — vrais devis du banc",
      "",
      "Fichier GÉNÉRÉ par `packages/domain/test/vue-artisan.test.ts` : ne pas modifier à la main.",
      "Réponses simulées : l'artisan accepte la proposition de chaque décision (« Oui, à la pièce »,",
      "« Oui, tels qu'écrits », « C'est bon ») ; aux questions de produit il répond « aucun de ces",
      "produits » (rien ne prouve qu'un modèle du référentiel soit celui du devis). Données vérifiées",
      "seulement : ce que verrait un artisan aujourd'hui.",
      "",
    ];
    for (const c of CASES) {
      const { arrival, taken, after, lines } = walkthrough(c);
      const sent = groupIdenticalLines(
        after.items
          .filter((i) => i.kind === "line")
          .map((i) => {
            const l = lines.find((x) => x.id === i.id)!;
            const work = i.assessment.criteria.some((k) => k.cause === "work_measure");
            return { designation: l.designation, quantity: l.quantity, unit: l.unit, reference: null, section: l.section, ...(work ? { basis: "work" as const } : {}) };
          }),
      );
      out.push(
        `## ${c.id}`,
        "",
        `**À l'arrivée** : ${counts(arrival)}`,
        "",
        `**Décisions à prendre : ${arrival.decisions.length}**`,
        "",
        ...arrival.decisions.map((d) => `- ${d.state === "missing" ? "?" : "⚠"} **${d.title.slice(0, 60)}** — ${d.text}${d.lineIds.length > 1 ? ` _(${d.lineIds.length} lignes en une fois)_` : ""}`),
        ...(arrival.decisions.length === 0 ? ["- aucune"] : []),
        "",
        ...(arrival.measures ? [`Information (pas une décision) : ${arrival.measures.text}`, ""] : []),
        `**Après ${taken.length} réponse${taken.length > 1 ? "s" : ""}** : ${counts(after)}`,
        "",
        `**Liste envoyée aux fournisseurs : ${sent.length} lignes** (${after.items.filter((i) => i.kind === "line").length} lignes du devis regroupées)`,
        "",
        ...sent
          .slice(0, 12)
          .map(
            (s) =>
              `- ${s.designation.slice(0, 70)} : ${s.basis === "work" ? `pour ${s.quantity ?? "?"} ${s.unit ?? ""} (quantité à calculer)` : `${s.quantity ?? "?"} ${s.unit ?? ""}`}${s.mergedFrom > 1 ? ` _(${s.mergedFrom} lignes)_` : ""}`,
          ),
        ...(sent.length > 12 ? [`- … et ${sent.length - 12} autres`] : []),
        "",
      );
    }
    await expect(out.join("\n")).toMatchFileSnapshot("../../../docs/vue-artisan-vrais-devis.md");
  });

  it("Piscine : les 37 lignes qui dépendent de la même information font UNE décision", () => {
    const v = view(toLines(PISCINE_LINES), "other");
    const big = v.decisions.filter((d) => d.lineIds.length > 1);
    expect(big).toHaveLength(1);
    expect(big[0]).toMatchObject({ key: "group:unknown", primary: { action: "pieces", label: "Oui, tels qu'écrits" } });
    expect(big[0]!.lineIds).toHaveLength(37);
    // Le feutre « au m² », les rails en « barre de 3 ML » gardent leur unité : seules les lignes sans unité passent à la pièce.
    expect(big[0]!.pieceLineIds).toHaveLength(32);
    expect(big[0]!.text).toBe("37 articles que BatiClair ne connaît pas encore, dont 32 sans unité. Les demander aux fournisseurs tels qu'écrits, à la pièce quand l'unité manque ?");
    // Jamais une alerte par ligne pour la même raison.
    expect(v.decisions.filter((d) => d.key.startsWith("line:")).length).toBeLessThan(5);
  });

  it("une seule réponse règle toutes les lignes qui en dépendent", () => {
    const lines = toLines(PISCINE_LINES);
    const before = view(lines, "other");
    const group = before.decisions.find((d) => d.key === "group:unknown")!;
    const after = view(decide(lines, group), "other");
    expect(after.decisions).toEqual([]);
    expect(after.counts.verified).toBe(before.counts.verified + group.lineIds.length);
  });

  it("Morellec : deux pièces qui se suivent ne sont pas un « doublon » ; une copie dans la même pièce, si", () => {
    const v = view(toLines(MORELLEC_LINES), "electrical,plumbing");
    expect(v.decisions.filter((d) => d.key.startsWith("duplicate:"))).toEqual([]);
    const copy = toLines(MORELLEC_LINES);
    copy.splice(5, 0, { ...copy[4]!, id: "copie" });
    const w = view(copy, "electrical,plumbing");
    expect(w.decisions.find((d) => d.key.startsWith("duplicate:"))?.lineIds).toEqual([copy[4]!.id, "copie"]);
  });

  it("fermer une alerte ne rend rien ✓ : sans geste de l'artisan, l'écran reste le même", () => {
    const lines = toLines(PISCINE_LINES);
    expect(view(lines, "other")).toEqual(view(lines, "other"));
  });

  it("un ouvrage mesuré (?) ne devient jamais ✓, même confirmé par l'artisan", () => {
    const lines = toLines(LEZARDRIEUX_LINES).map((l) => ({ ...l, confirmed: true }));
    const v = view(lines, "drywall");
    const doublage = v.items.find((i) => i.id === "l001")!;
    expect(doublage.state).toBe("missing");
    expect(v.measures?.lineIds).toContain("l001");
  });

  it("aucune donnée non vérifiée ne devient établie : sur le devis couverture, aucun besoin provisoire, et chaque ✓ vient d'une règle validée", () => {
    const v = view(toLines(D2026_015_LINES), "roofing");
    for (const i of v.items.filter((x) => x.kind === "need")) expect(i.need!.provisional).toBe(false);
    const rules = new Map(ROOFING_REFERENTIAL.workItems.flatMap((w) => w.needs.map((n) => [n.id, n.verification.status] as const)));
    for (const i of v.items.filter((x) => x.kind === "need" && x.state === "verified")) expect(rules.get(i.need!.needId)).toBe("verified");
  });

  it("chaque ✓ explique son origine (« Voir le calcul »)", () => {
    for (const c of CASES) {
      const { after } = walkthrough(c);
      for (const i of after.items.filter((x) => x.state === "verified")) {
        const established = i.assessment.criteria.filter((k) => k.status === "established" && k.key !== "consistency" && k.key !== "packaging");
        expect(established.length).toBeGreaterThan(0);
        for (const k of established) expect([c.id, i.id, k.key, k.origin ?? "sans origine"]).not.toContain("sans origine");
      }
    }
  });
});

describe("une réponse recalcule tout ce qui en dépend (règles vérifiées)", () => {
  const verified = (ref: Referential): Referential => {
    const v = { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "test" } as const;
    const fix = <T extends { verification: unknown }>(x: T): T => ({ ...x, verification: v });
    return {
      ...ref,
      products: ref.products.map((p) => ({
        ...p,
        attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, f]) => [k, fix(f)])),
        sellingUnits: p.sellingUnits.map((s) => ({ ...s, contains: fix(s.contains) })),
      })),
      workItems: ref.workItems.map((w) => ({ ...w, constants: Object.fromEntries(Object.entries(w.constants).map(([k, f]) => [k, fix(f)])), needs: w.needs.map(fix) })),
    };
  };
  const REF = verified(ROOFING_REFERENTIAL);
  const lines = toLines(D2026_015_LINES);

  it("confirmer la tuile HP10 débloque tuiles ET liteaux ; la question n'est jamais reposée sous une autre forme", () => {
    const first = view(lines, "roofing", {}, REF);
    const tuile = first.decisions.find((d) => d.key === "engine:product:tuile")!;
    expect(tuile).toMatchObject({ title: "Tuiles", primary: { label: "Oui, c'est bien celui-ci" } });
    expect(first.decisions.filter((d) => d.question?.key === "product:tuile")).toHaveLength(1);

    const second = view(lines, "roofing", { "product:tuile": "edilians-hp10-huguenot" }, REF);
    expect(second.decisions.some((d) => d.key === "engine:product:tuile")).toBe(false);
    // Une seule question reste pour tuiles ET liteaux : le pureau, avec son effet sur la commande.
    const pureau = second.decisions.find((d) => d.key === "engine:param:pureau")!;
    expect(pureau).toMatchObject({ state: "missing", primary: { label: "Renseigner" } });
    expect(pureau.text).toMatch(/Cela change la commande : de 1 191 à 1 445 pièces selon la réponse\./);

    const third = view(lines, "roofing", { "product:tuile": "edilians-hp10-huguenot", "param:pureau": { value: "34.3", unit: "cm" } }, REF);
    const state = (id: string) => third.items.find((i) => i.kind === "need" && i.id === id)?.state;
    expect([state("tuiles"), state("liteaux")]).toEqual(["verified", "verified"]);
    expect(third.decisions.some((d) => d.key === "engine:param:pureau")).toBe(false);
  });

  it("un article que le devis donne déjà en quantité d'achat ne déclenche aucune question de calcul", () => {
    const given = toLines([{ ref: "a", designation: "Faîtière ronde à emboîtement rouge", quantity: "42", unit: "u", truth: "D" }]);
    const v = view(given, "roofing", {}, REF);
    expect(v.decisions).toEqual([]);
    expect(v.items.filter((i) => i.kind === "need")).toEqual([]);
  });

  it("« aucun de ces produits » arrête la question sans inventer de calcul", () => {
    const v = view(lines, "roofing", { "product:faitiere": null }, REF);
    expect(v.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    expect(v.items.some((i) => i.kind === "need" && i.id === "faitieres")).toBe(false);
  });

  it("« pas celui-ci » écarte le produit lu pour ce chantier et redemande", () => {
    const v = view(lines, "roofing", { "product:tuile": "" }, REF);
    expect(v.decisions.find((d) => d.question?.key === "product:tuile")).toMatchObject({ question: { kind: "choose_product" } });
  });
});
