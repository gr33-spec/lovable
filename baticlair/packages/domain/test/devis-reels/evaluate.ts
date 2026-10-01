import { ROOFING_REFERENTIAL, scoreQuote, tradeProfile, validateTakeoffLine, type LineValidation, type QuoteScore } from "../../src/index.js";
import { MATERIAL_TRUTHS, type BenchLine } from "./truth.js";

/**
 * ÉVALUATION d'un vrai devis contre sa vérité terrain, en deux niveaux
 * qui ne se confondent pas :
 *  1. « J'ai compris la ligne » : matériau ou main-d'œuvre, famille, et
 *     surtout mesure d'OUVRAGE (à convertir) ou quantité d'ACHAT.
 *  2. « Je sais quoi commander » : besoin identifié, puis quantité certaine.
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
  understood: number;
  needsIdentified: number;
  certain: number;
  questions: number;
  unknown: number;
  errors: number;
  score: QuoteScore;
}

const isCount = (v: LineValidation) => v.unit === "U";
const blocking = (v: LineValidation) => v.issues.some((i) => i.severity === "blocking");
const flagged = (v: LineValidation) => v.issues.some((i) => i.severity === "blocking" || i.severity === "to_verify");

export function evaluateQuote(id: string, lines: BenchLine[], trade: string, acceptDraft = false): Evaluation {
  const profile = tradeProfile(trade);
  const score = scoreQuote(lines, ROOFING_REFERENTIAL, profile, { acceptDraft });
  const evaluated = lines.map((line): EvaluatedLine => {
    const v = validateTakeoffLine({ id: line.ref, designation: line.designation, quantityRaw: line.quantity, unitRaw: line.unit, source: "client_quote" }, profile);
    const engine = score.lines.find((l) => l.ref === line.ref)!;
    const material = MATERIAL_TRUTHS.includes(line.truth);
    const errors: string[] = [];
    if (material && v.kind === "labor") errors.push("matériau pris pour de la main-d'œuvre");
    if (!material && v.kind === "material") errors.push(line.truth === "I" ? "information prise pour un matériau" : "main-d'œuvre prise pour un matériau");
    if (line.truth === "C" && v.kind === "material" && v.basis === "purchase" && !blocking(v)) errors.push("mesure d'ouvrage envoyée comme quantité d'achat");
    if (line.truth === "D" && v.kind === "material" && v.basis === "work") errors.push("quantité d'achat bloquée comme mesure d'ouvrage");
    // Le vocabulaire couverture ne doit rien reconnaître dans un devis d'un autre métier.
    const planned = score.plan.lines.find((l) => l.ref === line.ref)!;
    if (trade !== "roofing" && planned.status === "planned") errors.push("rattachée à un ouvrage de couverture");
    if (trade !== "roofing" && planned.status === "not_covered" && planned.family) errors.push(`vocabulaire couverture appliqué à tort (« ${planned.family} »)`);

    const basisOk = line.truth === "D" ? v.basis === "purchase" : line.truth === "C" ? v.basis === "work" : true;
    const understood = material ? v.kind === "material" && v.family !== null && basisOk : v.kind !== "material";
    const directOk = line.truth === "D" && v.kind === "material" && v.basis === "purchase" && v.quantity !== null && v.unit !== null && !blocking(v);
    const converted = line.truth === "C" && ["order", "need", "question"].includes(engine.outcome);
    const needIdentified = directOk || converted;
    const certain = (directOk && isCount(v) && !flagged(v)) || (line.truth === "C" && engine.outcome === "order");
    const unknown = material && !needIdentified;
    return { line, validation: v, engine, understood, needIdentified, certain, asks: material && flagged(v), unknown, errors };
  });
  const material = evaluated.filter((e) => MATERIAL_TRUTHS.includes(e.line.truth));
  const engineQuestions = score.asked.length + score.declined.length + score.unanswered.length;
  return {
    id,
    lines: evaluated,
    materialLines: material.length,
    understood: material.filter((e) => e.understood).length,
    needsIdentified: material.filter((e) => e.needIdentified).length,
    certain: material.filter((e) => e.certain).length,
    questions: evaluated.filter((e) => e.asks).length + engineQuestions,
    unknown: material.filter((e) => e.unknown).length,
    errors: evaluated.reduce((n, e) => n + e.errors.length, 0),
    score,
  };
}

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)} %`);

export function evaluationTable(evals: Evaluation[]): string {
  const rows = evals.map(
    (e) =>
      `| ${e.id} | ${e.materialLines} | ${e.understood} (${pct(e.understood, e.materialLines)}) | ${e.needsIdentified} (${pct(e.needsIdentified, e.materialLines)}) | ${e.certain} (${pct(e.certain, e.materialLines)}) | ${e.questions} | ${e.unknown} | ${e.errors} |`,
  );
  const sum = (k: keyof Pick<Evaluation, "materialLines" | "understood" | "needsIdentified" | "certain" | "questions" | "unknown" | "errors">) => evals.reduce((n, e) => n + e[k], 0);
  const m = sum("materialLines");
  return [
    "| Devis | Lignes matériaux | Correctement comprises | Besoins identifiés | Quantités certaines | Questions | Inconnus | Erreurs |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    `| **Total** | **${m}** | **${sum("understood")} (${pct(sum("understood"), m)})** | **${sum("needsIdentified")} (${pct(sum("needsIdentified"), m)})** | **${sum("certain")} (${pct(sum("certain"), m)})** | **${sum("questions")}** | **${sum("unknown")}** | **${sum("errors")}** |`,
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
