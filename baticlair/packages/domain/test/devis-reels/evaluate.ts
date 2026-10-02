import { assessTakeoffLine, groupIdenticalLines, ROOFING_REFERENTIAL, trustCounts, scoreQuote, tradeProfile, validateTakeoff, type LineValidation, type QuoteScore } from "../../src/index.js";
import { MATERIAL_TRUTHS, type BenchLine } from "./truth.js";

/**
 * ÉVALUATION d'un vrai devis contre sa vérité terrain, en DEUX SCORES qui
 * ne se confondent jamais :
 *  A — Compréhension documentaire : BatiClair comprend-il ce qui est écrit ?
 *      (matériau ou main-d'œuvre, famille, mesure d'OUVRAGE ou quantité d'ACHAT)
 *  B — Quantitatif exact : la quantité finale à commander est-elle
 *      justifiable par une donnée du devis + une règle ou donnée sourcée et
 *      vérifiée ? « Ouvrage reconnu » ne compte JAMAIS pour B.
 * Les erreurs comptent ce qui partirait faux chez le fournisseur.
 */
export interface EvaluatedLine {
  line: BenchLine;
  validation: LineValidation;
  /** Issue du moteur de quantitatif (référentiel) pour cette ligne. */
  engine: QuoteScore["lines"][number];
  understood: boolean;
  needIdentified: boolean;
  certain: boolean;
  /** Une question posée à l'artisan sur cette ligne (doute signalé). */
  asks: boolean;
  unknown: boolean;
  errors: string[];
}

export interface Evaluation {
  id: string;
  lines: EvaluatedLine[];
  materialLines: number;
  /** Score A : lignes de matériaux correctement comprises. */
  understood: number;
  needsIdentified: number;
  /** Score B : lignes dont la quantité à commander est exacte et justifiée. */
  certain: number;
  /** Lignes non main-d'œuvre envoyées au fournisseur : telles quelles, puis regroupées. */
  sent: { before: number; after: number; withSection: number };
  /** Ce que verrait l'artisan sur la liste lue : ✓ vérifié, ⚠ à confirmer, ? information manquante. */
  trust: { verified: number; to_confirm: number; missing: number };
  questions: number;
  unknown: number;
  errors: number;
  /** Les questions telles que l'artisan les lirait (une par sujet). */
  questionTexts: string[];
  score: QuoteScore;
}

const isCount = (v: LineValidation) => v.unit === "U";
const blocking = (v: LineValidation) => v.issues.some((i) => i.severity === "blocking");
const flagged = (v: LineValidation) => v.issues.some((i) => i.severity === "blocking" || i.severity === "to_verify");

export function evaluateQuote(id: string, lines: BenchLine[], trade: string, acceptDraft = false): Evaluation {
  const profile = tradeProfile(trade);
  const score = scoreQuote(lines, ROOFING_REFERENTIAL, profile, { acceptDraft });
  // Lecture de tout le document (comme dans l'application) : les questions communes à plusieurs lignes comptent une fois.
  const takeoff = validateTakeoff(
    lines.map((l) => ({
      id: l.ref,
      designation: l.designation,
      quantityRaw: l.quantity,
      unitRaw: l.unit,
      source: "client_quote" as const,
      ...(l.section ? { section: l.section } : {}),
    })),
    profile,
  );
  const evaluated = lines.map((line, index): EvaluatedLine => {
    const v = takeoff.lines[index]!;
    const engine = score.lines.find((l) => l.ref === line.ref)!;
    const material = MATERIAL_TRUTHS.includes(line.truth);
    const errors: string[] = [];
    if (material && v.kind === "labor") errors.push("matériau pris pour de la main-d'œuvre");
    if (!material && v.kind === "material") errors.push(line.truth === "I" ? "information prise pour un matériau" : "main-d'œuvre prise pour un matériau");
    if (line.truth === "C" && v.kind === "material" && v.basis === "purchase" && !blocking(v)) errors.push("mesure d'ouvrage envoyée comme quantité d'achat");
    if ((line.truth === "D" || line.truth === "P") && v.kind === "material" && v.basis === "work") errors.push("quantité d'achat bloquée comme mesure d'ouvrage");
    // Le vocabulaire couverture ne doit rien reconnaître dans un devis d'un autre métier.
    const planned = score.plan.lines.find((l) => l.ref === line.ref)!;
    if (trade !== "roofing" && planned.status === "planned") errors.push("rattachée à un ouvrage de couverture");
    if (trade !== "roofing" && planned.status === "not_covered" && planned.family) errors.push(`vocabulaire couverture appliqué à tort (« ${planned.family} »)`);

    const basisOk = line.truth === "D" || line.truth === "P" ? v.basis === "purchase" : line.truth === "C" ? v.basis === "work" : true;
    const understood = material ? v.kind === "material" && v.family !== null && basisOk : v.kind !== "material";
    const directOk = (line.truth === "D" || line.truth === "P") && v.kind === "material" && v.basis === "purchase" && v.quantity !== null && v.unit !== null && !blocking(v);
    const converted = line.truth === "C" && ["order", "need", "question"].includes(engine.outcome);
    const needIdentified = directOk || converted;
    // « P » : l'article principal est juste, mais la commande n'est complète qu'avec ses accessoires.
    const certain = (directOk && line.truth === "D" && isCount(v) && !flagged(v)) || ((line.truth === "C" || line.truth === "P") && engine.outcome === "order");
    const unknown = material && !needIdentified;
    return { line, validation: v, engine, understood, needIdentified, certain, asks: material && flagged(v), unknown, errors };
  });
  const material = evaluated.filter((e) => MATERIAL_TRUTHS.includes(e.line.truth));
  // Ce qui part chez le fournisseur : tout sauf la main-d'œuvre (comme l'application), regroupé.
  const toSend = evaluated
    .filter((e) => e.validation.kind !== "labor")
    .map((e) => ({
      designation: e.line.designation,
      quantity: e.line.quantity,
      unit: e.line.unit,
      reference: null,
      ...(e.validation.basis === "work" ? { basis: "work" as const } : {}),
      ...(e.line.section ? { section: e.line.section } : {}),
    }));
  const grouped = groupIdenticalLines(toSend);
  const engineQuestions = score.asked.length + score.declined.length + score.unanswered.length;
  const documentQuestions = takeoff.issues.filter((i) => i.severity !== "info").length;
  return {
    id,
    lines: evaluated,
    materialLines: material.length,
    understood: material.filter((e) => e.understood).length,
    needsIdentified: material.filter((e) => e.needIdentified).length,
    certain: material.filter((e) => e.certain).length,
    sent: { before: toSend.length, after: grouped.length, withSection: grouped.filter((g) => g.section.length > 0).length },
    trust: trustCounts(takeoff.lines.map((l) => assessTakeoffLine(l, { documentIssues: takeoff.issues }))),
    questions: evaluated.filter((e) => e.asks).length + documentQuestions + engineQuestions,
    unknown: material.filter((e) => e.unknown).length,
    errors: evaluated.reduce((n, e) => n + e.errors.length, 0),
    questionTexts: [
      ...takeoff.issues.filter((i) => i.severity !== "info").map((i) => i.message),
      ...evaluated.filter((e) => e.asks).flatMap((e) => e.validation.issues.filter((i) => i.severity !== "info").map((i) => `« ${e.line.designation.slice(0, 50)} » : ${i.message}`)),
      ...[...score.asked, ...score.declined, ...score.unanswered].map((q) => q.text),
    ],
    score,
  };
}

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);

export function evaluationTable(evals: Evaluation[]): string {
  const rows = evals.map(
    (e) =>
      `| ${e.id} | ${e.materialLines} | **${pct(e.understood, e.materialLines)}** (${e.understood}) | **${pct(e.certain, e.materialLines)}** (${e.certain}) | ${e.needsIdentified} | ${e.questions} | ${e.unknown} | ${e.errors} | ${e.sent.before} → ${e.sent.after} |`,
  );
  const sum = (f: (e: Evaluation) => number) => evals.reduce((n, e) => n + f(e), 0);
  const m = sum((e) => e.materialLines);
  return [
    "| Devis | Lignes matériaux | A — Compréhension | B — Quantitatif exact | Besoins identifiés | Questions | Inconnus | Erreurs | Lignes envoyées (avant → après regroupement) |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    `| **Total** | **${m}** | **${pct(sum((e) => e.understood), m)}** (${sum((e) => e.understood)}) | **${pct(sum((e) => e.certain), m)}** (${sum((e) => e.certain)}) | ${sum((e) => e.needsIdentified)} | ${sum((e) => e.questions)} | ${sum((e) => e.unknown)} | ${sum((e) => e.errors)} | ${sum((e) => e.sent.before)} → ${sum((e) => e.sent.after)} |`,
  ].join("\n");
}

/** Erreurs regroupées par nature, avec un exemple : la liste des faiblesses. */
export function errorDigest(evals: Evaluation[]): string {
  const byKind = new Map<string, { count: number; example: string }>();
  for (const e of evals) {
    for (const l of e.lines) {
      for (const err of l.errors) {
        const kind = err.replace(/ \(« .* »\)$/, "");
        const before = byKind.get(kind);
        byKind.set(kind, { count: (before?.count ?? 0) + 1, example: before?.example ?? `${e.id} : « ${l.line.designation.slice(0, 70)} »` });
      }
    }
  }
  return [...byKind.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([k, v]) => `- ${k} : ${v.count} (ex. ${v.example})`)
    .join("\n");
}

const TRUTH_FR: Record<BenchLine["truth"], string> = {
  D: "achat direct",
  P: "article principal + accessoires",
  C: "ouvrage à convertir",
  X: "fourniture en vrac",
  L: "main-d'œuvre",
  LI: "main-d'œuvre + matériaux implicites",
  I: "information",
};

/** Détail ligne à ligne : ce que dit la vérité, ce qu'a fait BatiClair. */
export function evaluationDetail(e: Evaluation): string {
  const rows = e.lines.map((l) => {
    const v = l.validation;
    const said = v.kind === "labor" ? "main-d'œuvre" : v.kind === "material" ? `matériau${v.family ? ` (${v.family})` : ""}, ${v.basis === "work" ? "ouvrage" : "achat"}` : "non reconnu";
    const level = !MATERIAL_TRUTHS.includes(l.line.truth) ? (l.understood ? "ok" : "—") : l.certain ? "quantité certaine" : l.needIdentified ? "besoin identifié" : l.understood ? "compris" : "—";
    const designation = l.line.designation.replace(/\|/g, "/").slice(0, 80);
    return `| ${l.line.ref} | ${designation} | ${l.line.quantity ?? ""} ${l.line.unit ?? ""} | ${TRUTH_FR[l.line.truth]} | ${said} | ${level} | ${l.errors.join(" ; ")} |`;
  });
  return [
    `<details><summary>${e.id} — détail ligne à ligne</summary>`,
    "",
    "| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "</details>",
  ].join("\n");
}

/**
 * Ce qui empêche le score B de monter : les lignes d'OUVRAGE (à convertir,
 * ou article principal + accessoires) dont la quantité à commander n'est pas
 * encore justifiable, regroupées par famille lue. C'est la liste des
 * décompositions à construire (avec des sources), par ordre d'impact.
 */
export function decompositionNeeds(evals: Evaluation[]): string {
  const byFamily = new Map<string, { lines: number; devis: Set<string>; example: string }>();
  for (const e of evals) {
    for (const l of e.lines) {
      if (!(l.line.truth === "C" || l.line.truth === "P") || l.certain) continue;
      const family = l.validation.familyLabel ?? "Non reconnu";
      const entry = byFamily.get(family) ?? { lines: 0, devis: new Set<string>(), example: l.line.designation.slice(0, 60) };
      entry.lines++;
      entry.devis.add(e.id.split(" — ")[0]!);
      byFamily.set(family, entry);
    }
  }
  return [
    "| Famille lue | Lignes bloquées | Devis | Exemple |",
    "|---|---|---|---|",
    ...[...byFamily.entries()]
      .sort((a, b) => b[1].lines - a[1].lines)
      .map(([family, v]) => `| ${family} | ${v.lines} | ${[...v.devis].join(", ")} | ${v.example.replace(/\|/g, "/")} |`),
  ].join("\n");
}

/** « Votre liste est prête — ✓ · ⚠ · ? » sur chaque vrai devis, avant toute réponse de l'artisan. */
export function trustTable(evals: Evaluation[]): string {
  return [
    "| Devis | ✓ Vérifié | ⚠ À confirmer | ? Information manquante |",
    "|---|---|---|---|",
    ...evals.map((e) => `| ${e.id} | ${e.trust.verified} | ${e.trust.to_confirm} | ${e.trust.missing} |`),
  ].join("\n");
}
