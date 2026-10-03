import { describe, expect, it } from "vitest";
import { documentationNeeds, groupIdenticalLines, ROOFING_REFERENTIAL, scoreQuote, tradeProfile, type LineOutcome, type QuoteScore } from "../src/index.js";
import { D2026_011_LINES } from "./devis-reels/d2026-011.js";
import { D2026_015_LINES } from "./devis-reels/d2026-015.js";
import { MORELLEC_LINES } from "./devis-reels/electricite-plomberie-morellec.js";
import { decompositionNeeds, errorDigest, evaluateQuote, evaluationDetail, evaluationTable, trustTable } from "./devis-reels/evaluate.js";
import { REAL_QUOTES, type RealQuoteCase } from "./devis-reels/index.js";
import { PISCINE_LINES } from "./devis-reels/piscine.js";
import { LEZARDRIEUX_LINES } from "./devis-reels/platrerie-lezardrieux.js";

/**
 * BANC D'ESSAI « VRAIS DEVIS » — la mesure de réussite de BatiClair :
 * sur des devis rédigés par des entreprises différentes, combien de lignes
 * deviennent une liste d'achat, et avec combien de questions ?
 *
 * Le tableau est recalculé à chaque passage et comparé au fichier
 * docs/banc-devis-reels-score.md : toute évolution (règle validée, donnée
 * documentée, nouveau devis) le fait bouger explicitement
 * (`pnpm --filter @baticlair/domain test -- -u` pour l'accepter).
 */
const run = (c: RealQuoteCase, acceptDraft: boolean) =>
  scoreQuote(c.lines, ROOFING_REFERENTIAL, tradeProfile(c.trade), { answers: c.answers, acceptDraft, ...(c.preferences ? { preferences: c.preferences } : {}) });

const questions = (s: QuoteScore) => s.asked.length + s.declined.length + s.unanswered.length;

const OUTCOME_FR: Record<LineOutcome, string> = {
  order: "commande connue",
  need: "besoin connu, conditionnement à confirmer",
  question: "attend une réponse",
  unknown: "ne sait pas encore",
  not_covered: "ouvrage pas encore couvert",
  not_material: "hors achat",
};

function table(title: string, acceptDraft: boolean): string {
  const head = [
    `### ${title}`,
    "",
    "| Devis | Lignes matériaux | Commande connue | Besoin connu (conditionnement à confirmer) | Attend une réponse | Ne sait pas encore | Ouvrage pas encore couvert | Questions |",
    "|---|---|---|---|---|---|---|---|",
  ];
  const rows = REAL_QUOTES.map((c) => {
    const s = run(c, acceptDraft);
    const k = s.counts;
    return `| ${c.id} | ${s.materialLines} | ${k.order} | ${k.need} | ${k.question} | ${k.unknown} | ${k.not_covered} | ${questions(s)} |`;
  });
  return [...head, ...rows].join("\n");
}

function detail(c: RealQuoteCase): string {
  const today = run(c, false);
  const validated = run(c, true);
  const out = [`### ${c.id}`, "", `Origine : ${c.origin}`, "", "| Ligne | Aujourd'hui | Si les règles en attente étaient validées |", "|---|---|---|"];
  for (const l of today.lines) {
    const v = validated.lines.find((x) => x.ref === l.ref)!;
    out.push(`| ${l.ref} | ${OUTCOME_FR[l.outcome]} | ${OUTCOME_FR[v.outcome]}${v.reason ? ` — ${v.reason}` : ""} |`);
  }
  const q = (s: QuoteScore) => [
    ...s.asked.map((x) => `- posée : « ${x.text} »${c.answersWhy[x.key] ? ` — ${c.answersWhy[x.key]}` : ""}`),
    ...s.declined.map((x) => `- aucune proposition ne convient : « ${x.text} »${c.answersWhy[x.key] ? ` — ${c.answersWhy[x.key]}` : ""}`),
    ...s.unanswered.map((x) => `- sans réponse connue : « ${x.text} »${x.impact ? ` (${x.impact})` : ""}`),
  ];
  out.push("", "Questions (règles validées) :", "", ...q(validated));
  out.push("", "À documenter pour aller plus loin (règles validées) :", "");
  for (const d of documentationNeeds(ROOFING_REFERENTIAL, validated.plan, validated.workItems, validated.declined)) {
    out.push(`- ${d.title} (${d.lines.join(", ")}) — ${d.idealSource}`);
  }
  out.push("", "À documenter aujourd'hui (règles en attente) :", "");
  for (const d of documentationNeeds(ROOFING_REFERENTIAL, today.plan, today.workItems, today.declined).filter((d) => d.kind === "rule")) {
    out.push(`- ${d.title} (${d.lines.join(", ")})${d.pendingSource ? ` — en attente : ${d.pendingSource}` : ""}`);
  }
  return out.join("\n");
}

describe("banc d'essai : vrais devis", () => {
  it("le tableau de score est à jour (docs/banc-devis-reels-score.md)", async () => {
    const report = [
      "# Banc d'essai — vrais devis : tableau de score",
      "",
      "Fichier GÉNÉRÉ par `packages/domain/test/banc-devis-reels.test.ts` : ne pas modifier à la main.",
      `Référentiel : ${ROOFING_REFERENTIAL.version}.`,
      "",
      "Une ligne « commande connue » a toutes ses quantités à commander ; « besoin connu » a ses quantités",
      "(ml, m², pièces) mais pas encore l'unité de vente vérifiée. Les questions comptent celles qui sont",
      "posées, celles où aucune proposition ne convient et celles restées sans réponse connue.",
      "",
      table("Aujourd'hui, pour un artisan (données vérifiées seulement)", false),
      "",
      table("Si les règles en attente étaient validées (écran du validateur)", true),
      "",
      "## Détail par devis",
      "",
      ...REAL_QUOTES.map(detail),
      "",
    ].join("\n");
    await expect(report).toMatchFileSnapshot("../../../docs/banc-devis-reels-score.md");
  });

  for (const c of REAL_QUOTES) {
    describe(c.id, () => {
      it("aucune quantité sans donnée vérifiée pour un artisan", () => {
        const s = run(c, false);
        for (const n of s.workItems.flatMap((w) => w.needs)) {
          expect(n.provisional).toBe(false);
          if (n.status === "calculated") expect(n.trace.every((t) => t.verified)).toBe(true);
        }
        for (const r of s.rows) expect(r.provisional).toBe(false);
      });

      it("chaque ligne a une issue, et une raison quand BatiClair ne sait pas", () => {
        for (const acceptDraft of [false, true]) {
          const s = run(c, acceptDraft);
          expect(s.lines.map((l) => l.ref)).toEqual(c.lines.map((l) => l.ref));
          for (const l of s.lines) if (l.outcome === "unknown" || l.outcome === "not_covered") expect(l.reason).toBeTruthy();
        }
      });

      it("une question n'est jamais posée deux fois", () => {
        const s = run(c, true);
        const keys = [...s.asked, ...s.declined, ...s.unanswered].map((q) => q.key);
        expect(new Set(keys).size).toBe(keys.length);
      });
    });
  }
});

describe("banc d'essai : le pont devis → moteur retrouve la lecture faite à la main (D-2026-015)", () => {
  const s = run(REAL_QUOTES.find((c) => c.id === "D-2026-015")!, true);
  const input = (id: string) => s.plan.inputs.find((i) => i.workItemId === id)!;

  it("rattache chaque ligne à son ouvrage et à son emplacement", () => {
    expect(s.plan.lines.map((l) => (l.status === "planned" ? [l.ref, l.workItemId, l.slot, l.mentions] : [l.ref, l.status]))).toEqual([
      ["ligne 1", "couverture-tuiles-emboitement", "ecran", []],
      ["ligne 2", "couverture-tuiles-emboitement", "contre_liteau", []],
      ["ligne 3", "couverture-tuiles-emboitement", "liteau", ["tuile"]],
      ["ligne 4", "couverture-tuiles-emboitement", "tuile", []],
      // Les rives (tuiles de rive) appartiennent à la couverture ; « pour la finition des rives » cite la tuile posée.
      ["ligne 5", "couverture-tuiles-emboitement", "rive", ["tuile"]],
      ["ligne 6", "faitage", "faitiere", ["closoir", "fixation_faitiere"]],
      ["ligne 7", "gouttiere", "profil", ["crochet", "naissance"]],
      ["ligne 8", "descente", "tube", ["coude", "collier"]],
      ["ligne 9", "not_covered"],
      ["ligne 10", "not_covered"],
    ]);
  });

  it("lit les données écrites, avec leur preuve, et rien d'autre", () => {
    expect(input("couverture-tuiles-emboitement").params).toEqual({
      surface: { value: "120", unit: "m2", origin: "devis", evidence: "Devis, ligne 1, Devis, ligne 2, Devis, ligne 3, Devis, ligne 4" },
      entraxe_supports: { value: "90", unit: "cm", origin: "devis", evidence: "Devis, ligne 1 (« entraxe »)" },
      longueur_rives: { value: "24", unit: "m", origin: "devis", evidence: "Devis, ligne 5" },
    });
    expect(input("descente").params).toEqual({
      nb_descentes: { value: "2", unit: "u", origin: "devis", evidence: "Devis, ligne 8" },
      hauteur_descente: { value: "4", unit: "m", origin: "devis", evidence: "Devis, ligne 8 (« hauteur »)" },
    });
    // « 2 jeux de coudes » n'est pas un nombre de coudes par descente : rien n'est lu.
    expect(input("descente").params.coudes_par_descente).toBeUndefined();
    // « pureau adapté » : pas de valeur écrite, rien n'est lu.
    expect(input("couverture-tuiles-emboitement").params.pureau).toBeUndefined();
  });

  it("produits : le liteau 27×40 est écrit, la tuile HP10 se fait confirmer, la faîtière ventilée reste inconnue", () => {
    expect(s.plan.inputs[0]!.products).toEqual({
      contre_liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
      liteau: { productId: "liteau-sapin-27x40", origin: "devis" },
      tuile: { productId: "edilians-hp10-huguenot", origin: "alias" },
    });
    expect(input("faitage").products).toEqual({});
  });

  it("noms d'achat : caractéristiques du produit gardées, sans doublon ni donnée de chantier", () => {
    const label = (id: string) => s.rows.find((r) => r.needId === id)!.label;
    expect(label("tuiles")).toBe("Tuiles HP10 terre cuite rouge grand moule");
    expect(label("liteaux")).toBe("Liteaux 27×40");
    expect(label("contre-liteaux")).toBe("Contre-liteaux (Liteaux 27×40)");
    expect(label("tubes")).toBe("Tubes de descente Ø80 PVC sable");
  });
});

/**
 * Les 4 devis du 2026-10-01 (électricité-plomberie, plâtrerie, piscine,
 * salle de bain), notés contre leur vérité terrain. Le score « avant » est
 * gelé (docs/banc-4-devis-avant*.md) ; celui-ci est recalculé à chaque passage.
 */
/** Scores enregistrés à chaque étape (A = lignes comprises, B = quantités exactes) : ils ne doivent jamais baisser. */
const STEPS: { name: string; scores: Record<string, { a: number; b: number; errors: number }> }[] = [
  {
    name: "1. Règles générales de lecture (2026-10-01)",
    scores: {
      Morellec: { a: 122, b: 19, errors: 12 },
      Lézardrieux: { a: 18, b: 1, errors: 0 },
      Piscine: { a: 0, b: 0, errors: 0 },
      "D-2026-011": { a: 15, b: 9, errors: 0 },
      "D-2026-015": { a: 9, b: 2, errors: 1 },
    },
  },
  {
    // Une mesure d'ouvrage n'est plus jamais une quantité d'achat : « 2 descentes » n'est plus 2 articles.
    name: "2. Socle en trois niveaux : lu → il faut → à commander (2026-10-02)",
    scores: {
      Morellec: { a: 122, b: 19, errors: 12 },
      Lézardrieux: { a: 18, b: 1, errors: 0 },
      Piscine: { a: 0, b: 0, errors: 0 },
      "D-2026-011": { a: 15, b: 9, errors: 0 },
      "D-2026-015": { a: 9, b: 2, errors: 0 },
    },
  },
  {
    // Les 10 règles de couverture validées par le fondateur : besoins identifiés 2 → 7 sur D-2026-015.
    // B (lecture seule, avant réponse) ne bouge pas : tuiles et liteaux attendent le pureau, qui n'est pas écrit.
    name: "3. Règles de couverture validées par le fondateur (2026-10-02)",
    scores: {
      Morellec: { a: 122, b: 19, errors: 12 },
      Lézardrieux: { a: 18, b: 1, errors: 0 },
      Piscine: { a: 0, b: 0, errors: 0 },
      "D-2026-011": { a: 15, b: 9, errors: 0 },
      "D-2026-015": { a: 9, b: 2, errors: 0 },
    },
  },
  {
    // Référentiel du fondateur : hypothèses par défaut (pente, zone, rampant, entraxe), tableau de recouvrement,
    // pertes, pièces par défaut. Plus de question sur le pureau : 7 lignes sur 10 ont leur commande, 1 question (le modèle lu).
    name: "4. Liste d'achats : hypothèses par défaut, pertes, pièces par défaut (2026-10-03)",
    scores: {
      Morellec: { a: 122, b: 19, errors: 12 },
      Lézardrieux: { a: 18, b: 1, errors: 0 },
      Piscine: { a: 0, b: 0, errors: 0 },
      "D-2026-011": { a: 15, b: 9, errors: 0 },
      "D-2026-015": { a: 9, b: 7, errors: 0 },
    },
  },
];

describe("banc d'essai : 4 devis de métiers différents (score « après »)", () => {
  const cases = [
    ["Morellec — électricité + plomberie (scanné)", MORELLEC_LINES, "electrical,plumbing"],
    ["Lézardrieux — plâtrerie, isolation", LEZARDRIEUX_LINES, "drywall"],
    ["Piscine", PISCINE_LINES, "other"],
    ["D-2026-011 — salle de bain", D2026_011_LINES, "plumbing,tiling,electrical,painting"],
  ] as const;
  const evals = cases.map(([id, lines, trade]) => evaluateQuote(id, lines, trade));
  const reference = evaluateQuote("D-2026-015 — couverture (référence)", D2026_015_LINES, "roofing");

  it("le score est à jour (docs/banc-4-devis-score.md)", async () => {
    const report = [
      "# Banc d'essai — 4 devis de métiers différents : score ACTUEL",
      "",
      "Fichier GÉNÉRÉ par `packages/domain/test/banc-devis-reels.test.ts` : ne pas modifier à la main.",
      "Points de départ gelés : `banc-4-devis-avant.md` (passage à l'aveugle) et",
      "`banc-4-devis-avant-grille-corrigee.md` (même code, grille de ce fichier).",
      "",
      "Deux scores, toujours séparés :",
      "- **A — Compréhension documentaire** : la ligne est bien lue (matériau ou main-d'œuvre, famille,",
      "  mesure d'ouvrage ou quantité d'achat).",
      "- **B — Quantitatif exact** : la quantité à commander est justifiée par le devis + une règle ou",
      "  une donnée sourcée et vérifiée. « Ouvrage reconnu » ne compte jamais pour B.",
      "",
      "« Besoin identifié » : BatiClair sait quel article commander, sans forcément sa quantité exacte.",
      "« Lignes envoyées » : lignes qui partent au fournisseur, puis après regroupement des articles",
      "identiques (un lieu différent ne change pas l'article ; une marque ou un lot différent, si).",
      "",
      evaluationTable(evals),
      "",
      "Référence couverture :",
      "",
      evaluationTable([reference]),
      "",
      "## Ce que verrait l'artisan (lecture seule, avant toute réponse)",
      "",
      "✓ : assez d'éléments établis pour produire la ligne sans lui. ⚠ : un doute qui change la commande,",
      "tranché en un geste. ? : une donnée indispensable manque (dont les mesures d'ouvrage, que BatiClair",
      "ne sait pas encore convertir : elles partent au fournisseur comme mesure, jamais comme achat).",
      "",
      trustTable([...evals, reference]),
      "",
      "## Non-régression",
      "",
      "Chaque devis doit garder au moins ses scores A et B de l'étape précédente, sans erreur de plus",
      "(test « aucun devis ne régresse »). Étapes enregistrées :",
      "",
      "| Étape | Devis | A | B | Erreurs |",
      "|---|---|---|---|---|",
      ...STEPS.flatMap((step) => Object.entries(step.scores).map(([id, v]) => `| ${step.name} | ${id} | ${v.a} | ${v.b} | ${v.errors} |`)),
      "",
      "## Ce qu'il faudrait savoir décomposer (score B)",
      "",
      decompositionNeeds([...evals, reference]),
      "",
      "## Erreurs restantes",
      "",
      errorDigest([...evals, reference]) || "Aucune.",
      "",
      "## Questions posées à l'artisan",
      "",
      ...[...evals, reference].flatMap((e) => [`### ${e.id}`, "", ...(e.questionTexts.length ? e.questionTexts.map((q) => `- ${q}`) : ["- aucune"]), ""]),
      "## Détail",
      "",
      ...[...evals, reference].map(evaluationDetail),
      "",
    ].join("\n");
    await expect(report).toMatchFileSnapshot("../../../docs/banc-4-devis-score.md");
  });

  it("aucun devis ne régresse : A et B au moins égaux, erreurs au plus égales, à chaque étape enregistrée", () => {
    for (const e of [...evals, reference]) {
      const key = e.id.split(" — ")[0]!;
      for (const step of STEPS) {
        const before = step.scores[key];
        if (!before) continue;
        expect({ step: step.name, devis: key, a: e.understood >= before.a, b: e.certain >= before.b, errors: e.errors <= before.errors }).toEqual({
          step: step.name,
          devis: key,
          a: true,
          b: true,
          errors: true,
        });
      }
    }
  });

  it("aucune ligne de main-d'œuvre ou d'information n'est envoyée comme matériau", () => {
    for (const e of [...evals, reference]) {
      expect(e.lines.filter((l) => l.errors.some((x) => x.includes("prise pour un matériau"))).map((l) => l.line.designation)).toEqual([]);
    }
  });

  it("Morellec : les prises de tous les logements partent en une ligne, avec la marque écrite en titre", () => {
    const sent = groupIdenticalLines(
      MORELLEC_LINES.map((l) => ({ designation: l.designation, quantity: l.quantity, unit: l.unit, reference: null, section: l.section ?? [] })),
    );
    const prises = sent.filter((l) => l.designation === "PRISE DE COURANT 16A+T");
    expect(prises).toEqual([
      expect.objectContaining({ quantity: "59", mergedFrom: 19, section: ["DEVIS ELECTRICITE", "APPAREILLAGE HAGER ESSENSYA"] }),
    ]);
    // Un tableau par logement + les communs : même article sous les mêmes titres (hors lieux) → 5 tableaux.
    expect(sent.filter((l) => l.designation.startsWith("TABLEAU GENERAL")).map((l) => [l.quantity, l.mergedFrom])).toEqual([["5", 5]]);
  });

  it("Lézardrieux : la même plus-value sous quatre ouvrages différents reste quatre lignes", () => {
    const sent = groupIdenticalLines(
      LEZARDRIEUX_LINES.map((l) => ({ designation: l.designation, quantity: l.quantity, unit: l.unit, reference: null, section: l.section ?? [] })),
    );
    expect(sent.filter((l) => l.designation.startsWith("Plus value PPM")).map((l) => l.section)).toEqual([
      ["Doublage isolant"],
      ["BA13 collée"],
      ["Cloison SAD"],
      ["Cloison 72/48"],
    ]);
  });

  it("le vocabulaire couverture ne s'applique jamais à un autre métier", () => {
    for (const e of evals) expect(e.lines.filter((l) => l.errors.some((x) => x.includes("couverture"))).map((l) => l.line.designation)).toEqual([]);
  });
});
