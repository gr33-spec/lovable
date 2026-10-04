import { slotCharacteristicsKey } from "./plan.js";
import { Decimal } from "../shared/decimal.js";
import type { NeedResult, Question, TraceLine, WorkItemResult } from "./engine.js";

/**
 * La liste d'achat telle que l'artisan la voit : une ligne = un nom court,
 * une quantité à commander, et l'un de trois états seulement.
 *  - « ready »    : BatiClair sait (quantité à commander, prouvée) ;
 *  - « question » : il manque UNE information, posée à part ;
 *  - « unknown »  : il ne sait pas encore, et dit pourquoi en une phrase.
 * Toute la complexité (formules, sources, intervalles) reste derrière
 * « Voir le calcul ».
 */
export interface PurchaseRow {
  needId: string;
  workItemId: string;
  /** « Tuiles HP10 », suivi des caractéristiques du devis (« rouge »). */
  label: string;
  state: "ready" | "question" | "unknown";
  /** « 1 306 pièces », « 349,85 ml » ; absent si BatiClair ne sait pas. */
  quantity?: string;
  /** Une seule précision : « ≈ 6 palettes », « conditionnement à confirmer », « pente sans effet ». */
  detail?: string;
  /** « À confirmer » : pas sur le devis, proposé seulement. */
  toConfirm: boolean;
  /** Calcul fait avec une donnée en brouillon (écran du validateur uniquement). */
  provisional: boolean;
  question?: Question;
  trace: TraceLine[];
}

/** « 1305.43 » → « 1 305,43 ». */
function fr(value: string): string {
  const [int, dec] = new Decimal(value).toFixed().split(".");
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? `,${dec}` : ""}`;
}

const UNIT_LABEL: Record<string, { one: string; many: string }> = {
  u: { one: "pièce", many: "pièces" },
  ml: { one: "ml", many: "ml" },
  m: { one: "m", many: "m" },
  m2: { one: "m²", many: "m²" },
};
const unitText = (count: string, unit: { one: string; many: string }) => `${fr(count)} ${new Decimal(count).equals(1) ? unit.one : unit.many}`;

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function row(workItemId: string, n: NeedResult, characteristics: string[], sameProductTwice: boolean): PurchaseRow {
  // Même produit pour deux emplacements (liteaux et contre-liteaux) : l'emplacement les distingue.
  const name = sameProductTwice && !norm(n.label).startsWith(norm(n.slotLabel)) ? `${n.slotLabel} (${n.label})` : n.label;
  // Une caractéristique déjà dans le nom (« 27×40 », « HP10 ») n'est pas répétée.
  const extra = characteristics.filter((c) => !norm(name).includes(norm(c)));
  const label = extra.length > 0 ? `${name} ${extra.join(" ")}` : name;
  const base = { needId: n.needId, workItemId, label, toConfirm: n.origin === "suggested", provisional: n.provisional, trace: n.trace };
  if (n.status === "question") return { ...base, state: "question", ...(n.question ? { question: n.question } : {}) };
  if (n.status === "unknown") return { ...base, state: "unknown", detail: n.reason ?? "Information manquante." };
  const needUnit = UNIT_LABEL[n.quantity?.unit ?? n.quantityRange?.unit ?? ""] ?? { one: n.quantity?.unit ?? "", many: n.quantity?.unit ?? "" };
  if (n.purchase) {
    const order = unitText(n.purchase.order.count, n.purchase.order.unit);
    const approx = n.purchase.approx[0];
    // Ordre de grandeur, sinon le besoin exact quand l'unité de commande est différente (« 88 longueurs » ← 349,85 ml).
    const detail = approx
      ? `≈ ${unitText(approx.count, approx.unit)}`
      : n.quantity && n.purchase.order.unit.many !== needUnit.many
        ? `${fr(n.quantity.value)} ${needUnit.many}`
        : n.quantityRange
          ? "donnée inconnue sans effet sur la commande"
          : undefined;
    return { ...base, state: "ready", quantity: order, ...(detail ? { detail } : {}) };
  }
  // Besoin certain, mais l'unité de vente n'est pas encore connue : on dit le besoin, et ce qui manque.
  const quantity = n.quantity ? `${fr(n.quantity.value)} ${needUnit.many}` : `${fr(n.quantityRange!.min)} à ${fr(n.quantityRange!.max)} ${needUnit.many}`;
  return { ...base, state: "ready", quantity, detail: "conditionnement à confirmer" };
}

/**
 * Lignes de la liste d'achat, dans l'ordre des ouvrages. Les
 * caractéristiques du devis (coloris…) sont ajoutées au nom, par emplacement :
 * elles ne doivent jamais se perdre entre le devis et le fournisseur.
 */
export function purchaseList(workItems: WorkItemResult[], characteristicsBySlot: Record<string, string[]> = {}): PurchaseRow[] {
  const needs = workItems.flatMap((w) => w.needs.map((n) => ({ w, n })));
  const twice = (n: NeedResult) => needs.filter((x) => x.n.label === n.label).length > 1;
  return needs.map(({ w, n }) => row(w.workItemId, n, characteristicsBySlot[slotCharacteristicsKey(w.workItemId, n.slot)] ?? [], twice(n)));
}
