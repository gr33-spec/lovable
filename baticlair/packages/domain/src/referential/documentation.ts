import { baseOf } from "./model.js";
import type { MissingData, Question, WorkItemResult } from "./engine.js";
import type { Referential } from "./model.js";
import type { QuotePlan } from "./plan.js";

/**
 * ENRICHISSEMENT PROGRESSIF : un produit rencontré sur un vrai devis →
 * la documentation précise qu'il faut → données vérifiées → tests →
 * réutilisation sur les chantiers suivants.
 *
 * Cette fonction fait la première étape : à partir d'un devis réel, la
 * liste EXACTE de ce qui manque, rangée par nature, avec la source idéale.
 * Rien n'est rempli ici : c'est une liste de courses documentaire.
 */
export interface DocumentationNeed {
  kind: MissingData["kind"] | "work_item";
  /** « Crochets — Espacement maximal », « Tuile chatière — règle de calcul ». */
  title: string;
  /** Produit concerné, s'il est identifié (« Liteaux 27×40 »). */
  product?: string;
  /** Source déjà déclarée, encore à vérifier (titre). */
  pendingSource?: string;
  /** Où le trouver. */
  idealSource: string;
  /** Lignes du devis concernées. */
  lines: string[];
}

const IDEAL_SOURCE: Record<DocumentationNeed["kind"], string> = {
  product_data: "Fiche technique ou guide de pose du fabricant (page exacte).",
  packaging: "Fiche article du fabricant ou du négoce (unité vendue, contenu).",
  product: "Référence exacte du produit (devis, artisan), puis sa fiche technique.",
  rule: "Notice de pose du fabricant ou DTU ; à défaut, règle de pratique écrite et validée.",
  constant: "Notice de pose du fabricant ou DTU (valeur et condition d'emploi).",
  work_item: "Exemples réels de cet ouvrage + documentation des produits utilisés.",
};

export function documentationNeeds(ref: Referential, plan: QuotePlan, workItems: WorkItemResult[], declined: Question[] = []): DocumentationNeed[] {
  const linesBySlot = new Map<string, string[]>();
  for (const l of plan.lines) {
    if (l.status !== "planned") continue;
    for (const s of [l.slot, ...l.mentions]) {
      const key = `${l.workItemId}/${s}`;
      linesBySlot.set(key, [...(linesBySlot.get(key) ?? []), l.ref]);
    }
  }
  const out = new Map<string, DocumentationNeed>();
  const add = (key: string, need: DocumentationNeed) => {
    const before = out.get(key);
    out.set(key, before ? { ...before, lines: [...new Set([...before.lines, ...need.lines])] } : need);
  };

  for (const w of workItems) {
    const work = ref.workItems.find((x) => x.id === baseOf(w.workItemId))!;
    for (const n of w.needs) {
      // Un besoin seulement suggéré n'est pas demandé par le devis : il ne commande pas la documentation.
      if (!n.missing || n.origin === "suggested") continue;
      const m = n.missing;
      const slot = work.slots.find((s) => s.key === m.slot);
      const product = m.productId ? ref.products.find((p) => p.id === m.productId) : undefined;
      const subject = product?.shortLabel ?? slot?.label ?? m.slot;
      const source = m.sourceId ? ref.sources.find((s) => s.id === m.sourceId)?.title : undefined;
      const lines = linesBySlot.get(`${w.workItemId}/${m.slot}`) ?? [];
      const title = m.kind === "rule" ? `${subject} — règle de calcul` : m.kind === "product" ? `${subject} — produit à identifier` : `${subject} — ${m.label}`;
      add(`${m.kind}|${m.productId ?? m.family}|${m.attribute ?? (m.kind === "rule" ? n.needId : "")}`, {
        kind: m.kind,
        title,
        ...(product ? { product: product.shortLabel } : {}),
        ...(source ? { pendingSource: source } : {}),
        idealSource: IDEAL_SOURCE[m.kind],
        lines,
      });
    }
  }
  // « Ce n'est aucun de ces modèles » : le produit du devis n'est pas encore au référentiel.
  for (const q of declined) {
    const [kind, slotKey] = q.key.split(":") as [string, string];
    if (kind !== "product") continue;
    const w = workItems.find((x) => ref.workItems.find((y) => y.id === baseOf(x.workItemId))?.slots.some((s) => s.key === slotKey));
    const slot = w ? ref.workItems.find((y) => y.id === baseOf(w.workItemId))!.slots.find((s) => s.key === slotKey)! : undefined;
    add(`product|${slotKey}`, {
      kind: "product",
      title: `${slot?.label ?? slotKey} — modèle du devis absent du référentiel`,
      idealSource: IDEAL_SOURCE.product,
      lines: w ? (linesBySlot.get(`${w.workItemId}/${slotKey}`) ?? []) : [],
    });
  }
  for (const l of plan.lines) {
    if (l.status !== "not_covered") continue;
    const label = l.family ? (ref.families.find((f) => f.code === l.family)?.label ?? l.family) : "Ouvrage non reconnu";
    add(`work_item|${l.family ?? l.ref}`, { kind: "work_item", title: `${label} — ouvrage à couvrir`, idealSource: IDEAL_SOURCE.work_item, lines: [l.ref] });
  }
  return [...out.values()];
}
