import { RATIO, supplierTest, type EngineAnswer, type PurchaseView } from "../../src/index.js";
import { colours } from "./read-trade.js";
import type { QuoteLineInput } from "./read-quote.js";

/**
 * LE COMPTE RENDU D'UN PAQUET DU LOT B : pour chaque métier, son devis de test, ce que l'écran montre à l'ouverture
 * (vert, orange, gris, les questions du comptoir), puis le PDF que lit le vendeur une fois les questions répondues
 * (premier bouton) et chaque « C'est bon » donné. Le tout en texte : le fichier fait le test (toMatchFileSnapshot).
 */
export type Run = (answers: Record<string, EngineAnswer>) => PurchaseView;

/** Répond à tout comme un artisan pressé : le premier bouton de chaque question, « C'est bon » sur chaque orange. */
export function answerAll(run: Run): {
  first: PurchaseView;
  last: PurchaseView;
  answers: Record<string, EngineAnswer>;
} {
  const answers: Record<string, EngineAnswer> = {};
  const first = run(answers);
  let view = first;
  for (let round = 0; round < 8 && view.questions.length > 0; round++) {
    for (const d of view.questions) {
      if (d.key.startsWith(RATIO)) answers[d.key] = "ok";
      else if (d.question?.options?.length) {
        const q = d.question;
        const value = q.options![0]!.value;
        answers[q.key] = q.kind === "param" ? { value, unit: q.unit ?? "u" } : value;
      }
    }
    view = run(answers);
  }
  return { first, last: view, answers };
}

const cell = (s: string | null | undefined) => (s ?? "").replace(/\|/g, "/");

/** Le texte d'un écran : couleurs, questions, lignes orange et grises. */
export function screenReport(v: PurchaseView): string[] {
  const c = colours(v);
  const rows = v.screen.groups.flatMap((g) => g.rows);
  const item = (key?: string) => v.toBuy.find((b) => b.key === key);
  const n = (k: number, one: string, many: string) => `${k} ${k > 1 ? many : one}`;
  const out = [`**À l'ouverture : ${n(c.vert, "verte", "vertes")} · ${c.orange} orange · ${n(c.gris, "grise", "grises")}.**`, ""];
  for (const w of v.warnings) out.push(`> Avertissement : ${w}`, "");
  const asked = v.questions.filter((d) => !d.key.startsWith(RATIO));
  out.push(asked.length ? "Questions du comptoir :" : "Questions du comptoir : aucune.");
  for (const d of asked)
    out.push(`- ${d.question?.text ?? d.text}${d.question?.options?.length ? ` (${d.question.options.map((o) => o.label).join(" / ")})` : ""}`);
  out.push("");
  const orange = rows.filter((r) => r.status === "check");
  if (orange.length) {
    out.push("| Ligne orange | Chiffre | Sous-ligne |", "| --- | --- | --- |");
    for (const r of orange) {
      const b = item(r.itemKey);
      out.push(
        `| ${cell(b?.label ?? r.pending?.label)} | ${cell(b?.quantity ?? r.pending?.quantity ?? "—")} | ${cell(r.reason ?? (r.pending || r.decisionKey ? "attend une réponse à une question" : "À vérifier"))} |`,
      );
    }
    out.push("");
  }
  const grey = v.toQuote;
  if (grey.length) {
    out.push("Lignes grises (le fournisseur chiffre) :");
    for (const q of grey) out.push(`- ${q.label} · ${q.measure} — ${q.reason}`);
    out.push("");
  }
  return out;
}

/** « Fournitures à chiffrer » du PDF, telles que le vendeur les lit, avec son verdict ligne à ligne (§40). */
export function pdfReport(v: PurchaseView): string[] {
  const out = [
    "Le PDF lu par le vendeur (après les réponses et les « C'est bon ») :",
    "",
    "| Désignation | Quantité | Précision | Le vendeur |",
    "| --- | --- | --- | --- |",
  ];
  for (const b of v.toBuy) {
    const refus = supplierTest(b.label, b.order?.unit ?? null);
    out.push(
      `| ${cell(b.label)} | ${cell(b.quantity ?? "—")}${b.approx ? ` (${cell(b.approx)})` : ""} | ${cell(b.precision)} | ${refus ? `rappelle : ${cell(refus)}` : "chiffrable"} |`,
    );
  }
  if (v.toQuote.length) {
    out.push("", "À préciser avec vous :");
    for (const q of v.toQuote) out.push(`- ${q.label} · ${q.measure}`);
  }
  out.push("");
  return out;
}

export function benchReport(bench: readonly QuoteLineInput[]): string[] {
  return [
    "Devis de test :",
    "",
    "| Ligne | Désignation | Quantité |",
    "| --- | --- | --- |",
    ...bench.map((l) => `| ${l.ref} | ${cell(l.designation)} | ${l.quantity} ${l.unit} |`),
    "",
  ];
}
