import { Decimal } from "../shared/decimal.js";
import type { Assumption, NeedResult, Question } from "../referential/engine.js";
import type { LineRole } from "../referential/line-roles.js";
import type { Referential } from "../referential/model.js";
import type { QuotePlan } from "../referential/plan.js";
import type { TakeoffValidation } from "../takeoff/validation.js";
import type { ArtisanView, Decision, OuvrageLevels } from "./artisan-view.js";

/**
 * LA LISTE D'ACHATS : ce que l'artisan voit, et rien d'autre.
 *
 *  - « À acheter » : un article, une quantité dans son unité de commande,
 *    regroupé sur tout le chantier (les liteaux du lattage et du
 *    contre-lattage font UNE ligne) ;
 *  - « À faire chiffrer » : ce que le devis décrit et que BatiClair ne sait
 *    pas encore compter (jouées, entourages…) : le fournisseur chiffre pour
 *    la mesure du devis ;
 *  - « Hypothèses » : les valeurs par défaut utilisées (pente, zone…), une
 *    ligne, modifiables d'un geste ;
 *  - « Questions » : seulement ce que rien ne permet de calculer et qui
 *    change la commande.
 * Les mesures du devis (« 200 m² ») ne sont jamais présentées comme des
 * quantités d'articles : elles servent au calcul, puis à la phrase « J'ai compris ».
 */
export interface PurchaseItem {
  /** Stable : produit, ou emplacement d'ouvrage, ou ligne du devis. */
  key: string;
  label: string;
  /** « 11 230 pièces », « 2 471 ml », « 2 rouleaux » ; null si la quantité n'est pas établie. */
  quantity: string | null;
  /** La même quantité, brute, pour la demande de prix : nombre et unité de commande (« 1488 », « pièces »). */
  order: { count: string; unit: string } | null;
  /** Ordre de grandeur (« ≈ 50 bottes de 50 ml »), ou le besoin dans son unité quand l'unité de commande diffère (« 128,57 m² »). */
  approx: string | null;
  /** « computed » : calculé par BatiClair ; « direct » : quantité écrite telle quelle dans le devis. */
  kind: "computed" | "direct";
  /** Besoins réunis dans cette ligne (« voir le calcul »), et lignes du devis dont elle provient. */
  needIds: string[];
  lineIds: string[];
  /** Un doute sur une ligne directe (unité, lecture) : à confirmer avant d'envoyer. */
  state: "ready" | "to_confirm";
  /** Hypothèses dont cette ligne dépend. */
  assumptionKeys: string[];
}

export interface ToQuoteItem {
  key: string;
  label: string;
  /** La mesure du devis (« 6 unités », « 24 m »). */
  measure: string;
  reason: string;
  lineIds: string[];
}

/** Les articles d'un même ouvrage, pour la carte du quantitatif (« Couverture ardoises · 200 m² »). */
export interface PurchaseGroup {
  /** L'ouvrage du référentiel, ou « other » (articles écrits tels quels dans le devis, hors ouvrage connu). */
  key: string;
  label: string;
  /** La mesure du devis (« 200 m² », « 17 m ») ; null si l'ouvrage n'en a pas. */
  measure: string | null;
  /** Clés des articles de « À acheter », dans leur ordre. */
  itemKeys: string[];
}

export interface PurchaseView {
  /** « Couverture en ardoises au crochet sur liteaux : 200 m² », « 6 jouées de lucarnes »… */
  understood: string[];
  toBuy: PurchaseItem[];
  /** « À acheter » rangé par ouvrage : chaque article dans un seul groupe. */
  groups: PurchaseGroup[];
  toQuote: ToQuoteItem[];
  assumptions: Assumption[];
  /** Ce qui attend l'artisan (une phrase, des boutons). */
  questions: Decision[];
  /** Rien de bloquant : la liste peut partir aux fournisseurs. */
  canValidate: boolean;
}

/** « 1305.43 » → « 1 305,43 ». */
const fr = (value: string | Decimal) => {
  const [int, dec] = new Decimal(value).toFixed().split(".");
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? `,${dec}` : ""}`;
};
const UNIT_LABEL: Record<string, { one: string; many: string }> = {
  u: { one: "pièce", many: "pièces" },
  ml: { one: "ml", many: "ml" },
  m: { one: "m", many: "m" },
  m2: { one: "m²", many: "m²" },
};
/** Unités telles qu'écrites dans les devis (« u », « rlx », « paquet ») → leur nom en français, au singulier et au pluriel. */
const WRITTEN_UNITS: [RegExp, { one: string; many: string }][] = [
  [/^(u|un|unit[eé]s?|pces?|pcs?|pi[eè]ces?|ens|nb|nbre)$/, { one: "pièce", many: "pièces" }],
  [/^(rouleaux?|rlx?)$/, { one: "rouleau", many: "rouleaux" }],
  [/^(paquets?|pqts?|pq)$/, { one: "paquet", many: "paquets" }],
  [/^(bottes?)$/, { one: "botte", many: "bottes" }],
  [/^(cartons?|ctn)$/, { one: "carton", many: "cartons" }],
  [/^(sacs?)$/, { one: "sac", many: "sacs" }],
  [/^(palettes?|pal)$/, { one: "palette", many: "palettes" }],
  [/^(bo[iî]tes?|bte)$/, { one: "boîte", many: "boîtes" }],
  [/^(seaux?)$/, { one: "seau", many: "seaux" }],
  [/^(m2|m²)$/, { one: "m²", many: "m²" }],
  [/^(ml|m)$/, { one: "ml", many: "ml" }],
];
/** « 42 » « u » → « 42 pièces » ; une unité inconnue reste telle qu'écrite. */
function writtenQuantity(quantity: string, unit: string | null): { text: string; unit: string } {
  const raw = (unit ?? "").trim();
  const known = WRITTEN_UNITS.find(([re]) => re.test(raw.toLowerCase()));
  if (!known) return { text: [quantity, raw].filter(Boolean).join(" "), unit: raw };
  let many = true;
  try {
    many = new Decimal(quantity.replace(/\s/g, "").replace(",", ".")).greaterThanOrEqualTo(2);
  } catch {
    // Quantité illisible : le pluriel par défaut.
  }
  const label = many ? known[1].many : known[1].one;
  return { text: `${quantity} ${label}`, unit: known[1].many };
}
const unitText = (count: Decimal, unit: { one: string; many: string }) => `${fr(count)} ${count.equals(1) ? unit.one : unit.many}`;
const named = (n: NeedResult) => n.trace.some((t) => t.label === "Produit");

type OwnedNeed = NeedResult & { workItemId?: string };

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Matières et coloris qui changent l'article chez le fournisseur ; un adjectif de pose (« respirant ») n'en est pas un. */
const MATERIAL_WORDS = new Set(["pvc", "zinc", "cuivre", "inox", "alu", "aluminium", "galva", "acier", "sapin", "bois", "rouge", "sable", "brun", "noir", "gris", "anthracite", "ocre", "naturel", "naturelle"]);
/** Une caractéristique digne de suivre l'article : un chiffre (Ø80, 25), un trait d'union (demi-ronde), ou une matière. */
function keepCharacteristic(c: string): boolean {
  const n = norm(c);
  // « 2×10 m », « 4 m » : une quantité ou une dimension d'ouvrage, pas une caractéristique de l'article.
  if (/\d\s*[×x*]\s*\d/.test(n) || /^\d+(?:[.,]\d+)?\s*(?:m|ml|m2|cm|mm)$/.test(n)) return false;
  return /\d/.test(n) || n.includes("-") || n.split(" ").some((w) => MATERIAL_WORDS.has(w));
}

/** Regroupe les besoins d'un même article (même produit) sur tout le chantier. */
function aggregate(needs: readonly OwnedNeed[], ouvrages: readonly OuvrageLevels[], characteristicsBySlot: Record<string, string[]>): PurchaseItem[] {
  const groups = new Map<string, OwnedNeed[]>();
  for (const n of needs) {
    if (n.status !== "calculated" || n.origin === "suggested") continue;
    // Un produit nommé réunit ses besoins ; un emplacement sans produit reste à part (on ne mélange pas deux inconnus).
    const key = named(n) ? `product:${n.label}` : `${n.workItemId ?? "?"}/${n.slot}`;
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  const owner = (n: OwnedNeed) => ouvrages.filter((o) => o.needs.some((x) => x.needId === n.needId)).map((o) => o.lineId);
  const items: PurchaseItem[] = [];
  for (const [key, group] of groups) {
    const first = group[0]!;
    const orders = group.map((n) => n.purchase?.order ?? null);
    const sameOrderUnit = orders.every((o) => o && o.unit.many === orders[0]!.unit.many);
    const quantities = group.map((n) => n.quantity ?? null);
    const sameNeedUnit = quantities.every((q) => q && q.unit === quantities[0]!.unit);
    let quantity: string | null = null;
    let approx: string | null = null;
    let order: PurchaseItem["order"] = null;
    if (sameOrderUnit && orders[0]) {
      const count = orders.reduce((sum, o) => sum.plus(o!.count), new Decimal(0));
      quantity = unitText(count, orders[0].unit);
      order = { count: count.toFixed(), unit: count.equals(1) ? orders[0].unit.one : orders[0].unit.many };
      const approxUnits = group.map((n) => n.purchase?.approx[0] ?? null);
      if (approxUnits.every((a) => a && a.unit.many === approxUnits[0]!.unit.many)) {
        approx = `≈ ${unitText(approxUnits.reduce((sum, a) => sum.plus(a!.count), new Decimal(0)), approxUnits[0]!.unit)}`;
      } else if (sameNeedUnit && quantities[0] && orders[0].unit.many !== (UNIT_LABEL[quantities[0].unit]?.many ?? quantities[0].unit)) {
        const need = quantities.reduce((sum, q) => sum.plus(q!.value), new Decimal(0));
        approx = unitText(need, UNIT_LABEL[quantities[0].unit] ?? { one: quantities[0].unit, many: quantities[0].unit });
      }
    } else if (sameNeedUnit && quantities[0]) {
      // Conditionnement pas encore connu : le besoin dans son unité, le fournisseur convertit.
      const need = quantities.reduce((sum, q) => sum.plus(q!.value), new Decimal(0));
      const unit = UNIT_LABEL[quantities[0].unit] ?? { one: quantities[0].unit, many: quantities[0].unit };
      quantity = unitText(need, unit);
      order = { count: need.toDecimalPlaces(2).toFixed(), unit: unit.many };
    }
    // Les caractéristiques du devis (coloris, matière, diamètre) suivent l'article jusqu'au fournisseur.
    const extras = [...new Set(group.flatMap((n) => characteristicsBySlot[n.slot] ?? []))].filter((c) => keepCharacteristic(c) && !norm(first.label).includes(norm(c)));
    items.push({
      key,
      label: extras.length > 0 ? `${first.label} ${extras.join(" ")}` : first.label,
      quantity,
      order,
      approx,
      kind: "computed",
      needIds: group.map((n) => n.needId),
      lineIds: [...new Set(group.flatMap(owner))],
      state: "ready",
      assumptionKeys: [...new Set(group.flatMap((n) => n.assumptions.map((a) => a.key)))],
    });
  }
  return items;
}

const shortWork = (label: string) => label.replace(/\s*\(.*\)$/, "");

/** Range chaque article sous l'ouvrage d'où il vient (le premier, s'il sert à plusieurs). */
function groupsOf(toBuy: readonly PurchaseItem[], needs: readonly OwnedNeed[], view: ArtisanView, plan: QuotePlan, ref: Referential): PurchaseGroup[] {
  const groups: PurchaseGroup[] = [];
  const workOfLine = (lineId: string) => {
    const planned = plan.lines.find((l) => l.ref === lineId);
    return planned?.status === "planned" ? planned.workItemId : undefined;
  };
  const measureOf = (workId: string) => {
    for (const o of view.ouvrages) {
      if (o.role !== "measure" || workOfLine(o.lineId) !== workId) continue;
      const m = [o.read.quantity, o.read.unit].filter(Boolean).join(" ");
      if (m) return m;
    }
    return null;
  };
  for (const item of toBuy) {
    const workId = needs.find((n) => item.needIds.includes(n.needId))?.workItemId ?? (item.kind === "direct" ? workOfLine(item.lineIds[0] ?? "") : undefined);
    const work = workId ? ref.workItems.find((w) => w.id === workId) : undefined;
    const key = work?.id ?? "other";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: work ? shortWork(work.label) : "Autres articles du devis", measure: work ? measureOf(work.id) : null, itemKeys: [] };
      groups.push(group);
    }
    group.itemKeys.push(item.key);
  }
  // Les articles hors ouvrage connu ferment la carte.
  return [...groups.filter((g) => g.key !== "other"), ...groups.filter((g) => g.key === "other")];
}

/** La phrase « J'ai compris » : chaque ouvrage avec sa mesure telle qu'écrite, puis les ouvrages comptés. */
function understood(view: ArtisanView, plan: QuotePlan, ref: Referential): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const o of view.ouvrages) {
    if (o.role !== "measure") continue;
    const planned = plan.lines.find((l) => l.ref === o.lineId);
    const measure = [o.read.quantity, o.read.unit].filter(Boolean).join(" ") || "mesure à préciser";
    if (planned?.status === "planned") {
      // Une mesure par ouvrage, celle de sa première ligne ; le nom court de l'ouvrage, sans sa parenthèse.
      const work = ref.workItems.find((w) => w.id === planned.workItemId)!;
      if (seen.has(work.id)) continue;
      seen.add(work.id);
      out.push(`${work.label.replace(/\s*\(.*\)$/, "")} : ${measure}`);
    } else {
      out.push(`${o.designation} : ${measure}`);
    }
  }
  return out;
}

export function purchaseView(
  view: ArtisanView,
  engine: { needs: readonly OwnedNeed[]; questions: readonly Question[]; declined?: readonly string[] },
  link: { plan: QuotePlan; roles: ReadonlyMap<string, LineRole>; ref: Referential; validation: TakeoffValidation },
): PurchaseView {
  const toBuy = aggregate(
    engine.needs.filter((n) => !(n.question && engine.declined?.includes(n.question.key))),
    view.ouvrages,
    link.plan.characteristicsBySlot,
  );
  // Quantités écrites telles quelles dans le devis (chatières, sortie de toit) : à acheter, sans calcul.
  // Une ligne sans unité ou sans quantité y figure aussi, à confirmer : elle ne disparaît jamais en silence.
  for (const o of view.ouvrages) {
    const v = link.validation.lines.find((x) => x.lineId === o.lineId);
    const item = view.items.find((i) => i.kind === "line" && i.id === o.lineId);
    // Une ligne sans unité reste « indéterminée » jusqu'à ce que l'artisan la garde telle quelle (« C'est bon ») : alors elle part.
    const kept = o.role !== "undetermined" || item?.state === "verified";
    if (!v || v.kind === "labor" || v.basis !== "purchase" || !kept || o.needs.length > 0) continue;
    const written = o.read.quantity ? writtenQuantity(o.read.quantity, o.read.unit) : null;
    toBuy.push({
      key: `line:${o.lineId}`,
      label: o.designation,
      quantity: written?.text ?? null,
      order: o.read.quantity ? { count: o.read.quantity, unit: written!.unit } : null,
      approx: null,
      kind: "direct",
      needIds: [],
      lineIds: [o.lineId],
      state: item?.state === "verified" ? "ready" : "to_confirm",
      assumptionKeys: [],
    });
  }
  const toQuote: ToQuoteItem[] = [];
  // « Aucun de ces modèles » sur une pièce : BatiClair n'invente rien, le fournisseur chiffre pour la mesure du devis.
  for (const n of engine.needs) {
    if (!(n.question && engine.declined?.includes(n.question.key)) || n.origin === "suggested") continue;
    const planned = link.plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned" && l.workItemId === n.workItemId);
    const owner = planned.find((l) => l.slot === n.slot) ?? planned.find((l) => l.mentions.includes(n.slot)) ?? planned[0];
    const o = owner ? view.ouvrages.find((x) => x.lineId === owner.ref) : undefined;
    const measure = o ? [o.read.quantity, o.read.unit].filter(Boolean).join(" ") : "";
    toQuote.push({ key: `need:${n.needId}`, label: o ? `${n.slotLabel} (${o.designation})` : n.slotLabel, measure, reason: "Aucun modèle choisi : le fournisseur propose et chiffre.", lineIds: o ? [o.lineId] : [] });
  }
  for (const o of view.ouvrages) {
    const measure = [o.read.quantity, o.read.unit].filter(Boolean).join(" ");
    // Une ambiguïté encore ouverte (« 6 : ardoises ou jouées ? ») est une question, pas un article à faire chiffrer.
    if (link.roles.get(o.lineId) === "undetermined") continue;
    if (o.pending) {
      toQuote.push({ key: `line:${o.lineId}`, label: o.designation, measure, reason: o.pending, lineIds: [o.lineId] });
      continue;
    }
    // Un composant cité sans règle, ou un besoin que BatiClair ne sait pas établir : le fournisseur chiffre pour la mesure.
    // (Un besoin qui attend une réponse est une question, pas un article à faire chiffrer.)
    for (const n of o.needs) {
      if (n.need || n.needRange || n.state === "to_confirm") continue;
      if (toBuy.some((b) => b.needIds.includes(n.needId))) continue;
      const computed = engine.needs.find((x) => x.needId === n.needId);
      if (computed?.status === "question" && computed.question && !engine.declined?.includes(computed.question.key)) continue;
      toQuote.push({ key: `need:${n.needId}`, label: `${n.label} (${o.designation})`, measure, reason: n.missing ?? "À faire chiffrer.", lineIds: [o.lineId] });
    }
  }
  // Les hypothèses dites à l'artisan : les données (pente, zone, pureau…), et un produit par défaut seulement
  // quand il existe un vrai choix du même genre (liteaux 18×40 ou 27×40). Une pièce « modèle à préciser »
  // que le fournisseur remplacera par sa marque n'en est pas une.
  const assumptions: Assumption[] = [];
  for (const n of engine.needs) {
    const work = link.ref.workItems.find((w) => w.id === n.workItemId);
    for (const a of n.assumptions) {
      if (assumptions.some((x) => x.key === a.key)) continue;
      // Un produit par défaut sans vraie alternative n'est pas une hypothèse ; un conseil de format (choix explicites) en est une.
      if (a.key.startsWith("product:") && !a.choices?.length) {
        const family = work?.slots.find((s) => s.key === a.key.slice("product:".length))?.family;
        if (link.ref.products.filter((p) => p.family === family && p.generic).length < 2) continue;
      }
      assumptions.push(a);
    }
  }
  // Les questions : celles de l'écran (lignes douteuses, ambiguïtés, calcul), jamais une information.
  const questions = view.decisions;
  const canValidate = questions.every((q) => q.lineIds.length === 0) && toBuy.every((b) => b.state === "ready");
  const groups = groupsOf(toBuy, engine.needs, view, link.plan, link.ref);
  return { understood: understood(view, link.plan, link.ref), toBuy, groups, toQuote, assumptions, questions, canValidate };
}
