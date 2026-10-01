import type { TradeProfile } from "../trades/trade-profile.js";
import { computeChantier, type CompanyPreferences, type NeedResult, type Question, type WorkItemResult } from "./engine.js";
import type { Referential } from "./model.js";
import { planQuote, type QuoteLine, type QuotePlan } from "./plan.js";
import { purchaseList, type PurchaseRow } from "./purchase-list.js";

/**
 * LA MESURE DE RÉUSSITE : sur un vrai devis, combien de lignes BatiClair
 * transforme-t-il en liste d'achat, et avec combien de questions ?
 *
 * Le devis passe par le même chemin que dans l'application (planQuote →
 * moteur). Les réponses de l'artisan sont jouées une par une, dans l'ordre
 * où BatiClair les pose ; une question sans réponse arrête la partie.
 */
export type LineOutcome =
  /** Toutes ses quantités à commander sont connues. */
  | "order"
  /** Besoins connus (ml, m²…), conversion en unités de vente encore à confirmer. */
  | "need"
  /** Bloquée par une question restée sans réponse. */
  | "question"
  /** BatiClair ne sait pas (donnée, règle ou produit à documenter). */
  | "unknown"
  /** Ouvrage que BatiClair ne couvre pas encore. */
  | "not_covered"
  /** Main-d'œuvre, location : rien à acheter. */
  | "not_material";

/**
 * Réponse de l'artisan : un produit (identifiant), une valeur, ou `null`
 * quand aucune proposition ne convient (« ce n'est pas ce modèle »).
 */
export type Answer = string | { value: string; unit: string } | null;

export interface QuoteScore {
  lines: { ref: string; outcome: LineOutcome; needs: string[]; reason?: string }[];
  /** Lignes de matériaux (hors main-d'œuvre). */
  materialLines: number;
  counts: Record<LineOutcome, number>;
  /** Questions posées et répondues, dans l'ordre. */
  asked: Question[];
  /** Questions où aucune proposition ne convenait (produit absent du référentiel). */
  declined: Question[];
  /** Questions restées sans réponse connue. */
  unanswered: Question[];
  conflicts: string[];
  plan: QuotePlan;
  workItems: WorkItemResult[];
  rows: PurchaseRow[];
}

const RANK: Record<"order" | "need" | "question" | "unknown", number> = { order: 0, need: 1, question: 2, unknown: 3 };

function needOutcome(n: NeedResult): keyof typeof RANK {
  if (n.status === "unknown") return "unknown";
  if (n.status === "question") return "question";
  return n.purchase ? "order" : "need";
}

export function scoreQuote(
  lines: QuoteLine[],
  ref: Referential,
  profile: TradeProfile,
  options: { answers?: Record<string, Answer>; preferences?: CompanyPreferences; acceptDraft?: boolean } = {},
): QuoteScore {
  const plan = planQuote(lines, ref, profile, options.preferences);
  // Copie : les réponses de l'artisan s'ajoutent sans toucher à la lecture du devis.
  const inputs = plan.inputs.map((i) => ({ ...i, params: { ...i.params }, products: { ...i.products }, mentioned: [...i.mentioned] }));
  const engine = { acceptDraft: options.acceptDraft ?? false };
  const asked: Question[] = [];
  const declined: Question[] = [];
  const unanswered: Question[] = [];
  const settled = new Set<string>();
  let result = computeChantier(ref, inputs, engine);
  for (let turn = 0; turn < 50; turn++) {
    // Même choix que l'application : la question qui débloque le plus de besoins demandés par le devis,
    // en sautant celles qui n'ont pas eu de réponse (l'artisan passe à la suivante).
    const open = result.workItems.flatMap((w) => w.needs.filter((n) => n.question && n.origin !== "suggested" && !settled.has(n.question.key)).map((n) => n.question!));
    const count = (key: string) => open.filter((q) => q.key === key).length;
    const q = open.reduce<Question | null>((best, x) => (!best || count(x.key) > count(best.key) ? x : best), null);
    if (!q) break;
    settled.add(q.key);
    const answer = options.answers?.[q.key];
    if (answer === undefined) {
      unanswered.push(q);
      continue;
    }
    if (answer === null) {
      declined.push(q);
      continue;
    }
    asked.push(q);
    const [kind, name] = q.key.split(":") as [string, string];
    for (const input of inputs) {
      const work = ref.workItems.find((w) => w.id === input.workItemId)!;
      if (kind === "product" && typeof answer === "string" && work.slots.some((s) => s.key === name)) {
        input.products[name] = { productId: answer, origin: "artisan" };
      }
      if (kind === "param" && typeof answer !== "string" && work.params.some((p) => p.key === name)) {
        input.params[name] = { ...answer, origin: "artisan" };
      }
    }
    result = computeChantier(ref, inputs, engine);
  }

  const counts: Record<LineOutcome, number> = { order: 0, need: 0, question: 0, unknown: 0, not_covered: 0, not_material: 0 };
  const scored = plan.lines.map((l) => {
    if (l.status === "not_material") return { ref: l.ref, outcome: "not_material" as const, needs: [] };
    if (l.status === "not_covered") return { ref: l.ref, outcome: "not_covered" as const, needs: [], reason: l.reason };
    const slots = [l.slot, ...l.mentions];
    const needs = result.workItems.find((w) => w.workItemId === l.workItemId)!.needs.filter((n) => slots.includes(n.slot));
    const worst = needs.reduce<keyof typeof RANK>((acc, n) => (RANK[needOutcome(n)] > RANK[acc] ? needOutcome(n) : acc), "order");
    const reason = needs.find((n) => needOutcome(n) === worst && n.reason)?.reason;
    return { ref: l.ref, outcome: needs.length === 0 ? ("unknown" as const) : worst, needs: needs.map((n) => n.needId), ...(reason ? { reason } : {}) };
  });
  scored.forEach((s) => counts[s.outcome]++);
  return {
    lines: scored,
    materialLines: scored.filter((s) => s.outcome !== "not_material").length,
    counts,
    asked,
    declined,
    unanswered,
    conflicts: plan.conflicts,
    plan,
    workItems: result.workItems,
    rows: purchaseList(result.workItems, plan.characteristicsBySlot),
  };
}
