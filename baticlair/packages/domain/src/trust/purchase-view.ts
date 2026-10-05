import { Decimal } from "../shared/decimal.js";
import { DEVIS_MARK, withoutDevisMark, type Assumption, type NeedResult, type Question, type RuleToConfirm } from "../referential/engine.js";
import type { LineRole } from "../referential/line-roles.js";
import type { Referential } from "../referential/model.js";
import { slotCharacteristicsKey, type QuotePlan } from "../referential/plan.js";
import type { TakeoffValidation } from "../takeoff/validation.js";
import type { ArtisanView, Decision, OuvrageLevels } from "./artisan-view.js";
import { withoutLabour } from "./marchandise.js";

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
  /**
   * Ordre de grandeur (« ≈ 50 bottes de 50 ml »), ou le besoin dans son unité quand l'unité de commande diffère
   * (« 128,57 m² ») ; une longueur dit ce qu'elle couvre (« 13 ml à couvrir », §45.3) : jamais « soit 13 ml »,
   * 4 longueurs de 4 m font 16 ml achetés (§45.5).
   */
  approx: string | null;
  /** Colonne « précision » de la demande de devis (§45.3) : l'usage, la position ; absent si rien d'utile au comptoir. */
  precision?: string;
  /** Consommable (famille marquée telle) : en fin de « Fournitures à chiffrer » (§45.3). */
  consumable?: boolean;
  /** « computed » : calculé par BatiClair ; « direct » : quantité écrite telle quelle dans le devis. */
  kind: "computed" | "direct";
  /** Besoins réunis dans cette ligne (« voir le calcul »), et lignes du devis dont elle provient. */
  needIds: string[];
  lineIds: string[];
  /** Un doute sur une ligne directe (unité, lecture) : à confirmer avant d'envoyer. */
  state: "ready" | "to_confirm";
  /** Hypothèses dont cette ligne dépend. */
  assumptionKeys: string[];
  /** Ce que l'artisan a réécrit lui-même sur cette ligne (§41.4, §45.9) : le libellé, la quantité, la précision. */
  edited?: ("label" | "quantity" | "precision")[];
  /** §47.1 : les règles « à vérifier » dont dépend la quantité (toutes, validées comprises ; le tri se fait à l'écran). */
  rules?: RuleToConfirm[];
  /** §47.3 : les règles encore à confirmer sur ce chantier : la ligne est orange, « Quantité à confirmer : … ». */
  toConfirm?: RuleToConfirm[];
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
  /**
   * §45.8 « On ajoute ? » : les consommables que le devis ne cite pas, avec une quantité déjà proposée (Oui / Non d'un
   * tap, quantité modifiable). Jamais plus de huit ; vide = le bloc n'apparaît pas. Un « Oui » les fait passer en fin
   * de « Fournitures à chiffrer » (groupe consommables) ; un « Non » les fait disparaître.
   */
  suggestions: PurchaseItem[];
  /** Rien de bloquant : la liste peut partir aux fournisseurs. */
  canValidate: boolean;
  /** L'écran unique « la liste des fournitures » (retour du fondateur, 2026-10-04). */
  screen: SupplyScreen;
}

/**
 * UNE LIGNE DE LA LISTE DES FOURNITURES, avec son point de couleur (retour du fondateur, 2026-10-04, « un enfant de
 * 10 ans s'en sort ») : vert = sûr, rien à faire ; orange = à vérifier, un tap ouvre SA question ; gris = à préciser
 * avec le fournisseur, la ligne part telle quelle. Les textes viennent de l'article (« toBuy ») ou de la ligne à
 * préciser (« toQuote ») désignés par leur clé ; une ligne qui attend une réponse porte son propre nom.
 */
export interface ScreenRow {
  key: string;
  status: "ok" | "check" | "supplier";
  /** Article de « toBuy » (vert, ou orange quand la ligne reprise du devis est à confirmer). */
  itemKey?: string;
  /** Ligne de « toQuote » (gris). */
  quoteKey?: string;
  /** Ce qui attend une réponse avant d'être calculé (« Zinc en bobine ou bacs joint debout »). */
  pending?: { label: string; quantity: string | null };
  /** La décision (clé de « questions ») qu'un tap ouvre ; une réponse fait passer la ligne au vert. */
  decisionKey?: string;
  /** La raison d'une ligne orange, en une ligne (« Quantité à confirmer : colle 4 kg/m² ») ; sinon « À vérifier ». */
  reason?: string;
  /** Lignes du devis d'où vient la ligne (le croquis, le devis lu). */
  lineIds: string[];
}

export interface ScreenGroup {
  /** L'ouvrage (« couverture-zinc-joint-debout »), « other » ou « consommables ». */
  key: string;
  label: string;
  measure: string | null;
  kind: "principal" | "singulier" | "evacuation" | "autres" | "consommables";
  rows: ScreenRow[];
}

export interface SupplyScreen {
  /** Ordre : ouvrage principal, points singuliers, évacuation, autres articles du devis, consommables (§45.8). */
  groups: ScreenGroup[];
  /** « 11 fournitures · 2 à vérifier ». */
  total: number;
  toCheck: number;
}

const KIND_ORDER: ScreenGroup["kind"][] = ["principal", "singulier", "evacuation", "autres", "consommables"];

/** La liste des fournitures, ligne par ligne, chacune avec sa couleur et, si elle est orange, sa question. */
function supplyScreen(
  toBuy: readonly PurchaseItem[],
  toQuote: readonly ToQuoteItem[],
  decisions: readonly Decision[],
  engine: { needs: readonly OwnedNeed[]; declined?: readonly string[] },
  view: ArtisanView,
  plan: QuotePlan,
  ref: Referential,
): SupplyScreen {
  const groups = new Map<string, ScreenGroup>();
  const workOfLine = (lineId: string | undefined) => {
    const planned = lineId ? plan.lines.find((l) => l.ref === lineId) : undefined;
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
  const groupOf = (workId: string | undefined, consumable = false): ScreenGroup => {
    const work = workId ? ref.workItems.find((w) => w.id === workId) : undefined;
    const key = consumable ? "consommables" : (work?.id ?? "other");
    let g = groups.get(key);
    if (!g) {
      g = consumable
        ? { key, label: "Consommables", measure: null, kind: "consommables", rows: [] }
        : work
          ? { key, label: shortWork(work.label), measure: measureOf(work.id), kind: work.section ?? "singulier", rows: [] }
          : { key, label: "Autres articles du devis", measure: null, kind: "autres", rows: [] };
      groups.set(key, g);
    }
    return g;
  };
  const decisionFor = (lineIds: readonly string[]) => decisions.find((d) => d.lineIds.some((id) => lineIds.includes(id)));
  const used = new Set<string>();

  for (const item of toBuy) {
    const workId = engine.needs.find((n) => item.needIds.includes(n.needId))?.workItemId ?? (item.kind === "direct" ? workOfLine(item.lineIds[0]) : undefined);
    // La précision que le fournisseur ne peut pas deviner (diamètre d'une sortie de toit) : la ligne reste orange.
    const precise = decisions.find((d) => d.key === `${PRECISE}${item.lineIds[0]}`);
    const check = item.state === "to_confirm" || precise !== undefined;
    const decision = item.state === "to_confirm" ? (decisionFor(item.lineIds) ?? precise) : precise;
    if (decision) used.add(decision.key);
    if (precise) used.add(precise.key);
    groupOf(workId, item.consumable === true).rows.push({
      key: `item:${item.key}`,
      status: check ? "check" : "ok",
      itemKey: item.key,
      ...(decision ? { decisionKey: decision.key } : {}),
      lineIds: item.lineIds,
    });
  }
  // Ce qui attend une réponse : une ligne orange par ouvrage et par question (« bobine ou bacs » : une ligne, une question).
  const waiting = new Map<string, { workId: string | undefined; questionKey: string; labels: string[]; lineIds: string[] }>();
  for (const n of engine.needs) {
    if (n.status !== "question" || !n.question || n.origin === "suggested" || engine.declined?.includes(n.question.key)) continue;
    const id = `${n.workItemId ?? "?"}|${n.question.key}`;
    const w = waiting.get(id) ?? { workId: n.workItemId, questionKey: n.question.key, labels: [], lineIds: [] };
    if (!w.labels.includes(n.label)) w.labels.push(n.label);
    for (const o of view.ouvrages) if (o.needs.some((x) => x.needId === n.needId) && !w.lineIds.includes(o.lineId)) w.lineIds.push(o.lineId);
    waiting.set(id, w);
  }
  for (const [id, w] of waiting) {
    const decision = decisions.find((d) => d.question?.key === w.questionKey || d.key === `engine:${w.questionKey}`);
    if (decision) used.add(decision.key);
    groupOf(w.workId).rows.push({
      key: `pending:${id}`,
      status: "check",
      pending: { label: w.labels.length > 2 ? `${w.labels.slice(0, 2).join(", ")}…` : w.labels.join(" ou "), quantity: null },
      ...(decision ? { decisionKey: decision.key } : {}),
      lineIds: w.lineIds,
    });
  }
  for (const q of toQuote) {
    // Un article inconnu à confirmer reste orange tant que l'artisan ne l'a pas vu ; ensuite il part tel quel (gris).
    const decision = decisionFor(q.lineIds);
    if (decision) used.add(decision.key);
    groupOf(workOfLine(q.lineIds[0])).rows.push({
      key: `quote:${q.key}`,
      status: decision ? "check" : "supplier",
      quoteKey: q.key,
      ...(decision ? { decisionKey: decision.key } : {}),
      lineIds: q.lineIds,
    });
  }
  // Une question découverte d'avance (le développé, qui suit « je façonne ») : rangée sous l'ouvrage qui la pose.
  const plannedWorks = [...new Set(plan.lines.flatMap((l) => (l.status === "planned" ? [l.workItemId] : [])))];
  const workOfQuestion = (d: Decision) => {
    const param = d.question?.key.startsWith("param:") ? d.question.key.slice("param:".length) : null;
    return param ? plannedWorks.find((id) => ref.workItems.find((w) => w.id === id)?.params.some((p) => p.key === param)) : undefined;
  };
  // Une décision qu'aucune ligne ne porte encore (ambiguïté d'une mesure, article sans unité) : sa propre ligne orange.
  for (const d of decisions) {
    if (used.has(d.key)) continue;
    const line = view.ouvrages.find((o) => d.lineIds.includes(o.lineId));
    const quantity = line ? [line.read.quantity, line.read.unit].filter(Boolean).join(" ") || null : null;
    const workId = workOfLine(d.lineIds[0]) ?? workOfQuestion(d);
    // Une question découverte d'avance pour un ouvrage déjà orange attend son tour : elle viendra après la réponse en cours.
    if (d.key.startsWith("engine:") && d.lineIds.length === 0 && workId && groups.get(workId)?.rows.some((r) => r.status === "check")) continue;
    groupOf(workId).rows.push({ key: `decision:${d.key}`, status: "check", pending: { label: d.title, quantity }, decisionKey: d.key, lineIds: d.lineIds });
  }
  const ordered = [...groups.values()].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const rows = ordered.flatMap((g) => g.rows);
  return { groups: ordered, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
}

/** §45.8 : jamais plus de huit suggestions. */
export const MAX_SUGGESTIONS = 8;

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
  kg: { one: "kg", many: "kg" },
  l: { one: "L", many: "L" },
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
const MATERIAL_WORDS = new Set(["pvc", "zinc", "cuivre", "inox", "alu", "aluminium", "galva", "acier", "sapin", "bois", "rouge", "sable", "brun", "noir", "gris", "anthracite", "ocre", "naturel", "naturelle", "traite", "traitee", "traites", "traitees"]);
/** Les vraies matières (pas les coloris) : un article n'en porte jamais deux (« Voliges sapin … zinc » est faux). */
const MATERIALS_ONLY = new Set(["pvc", "zinc", "cuivre", "inox", "alu", "aluminium", "galva", "galvanise", "acier", "sapin", "bois", "douglas", "chene", "beton", "terre cuite"]);
const materialsIn = (text: string): string[] => {
  const n = ` ${norm(text).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  return [...MATERIALS_ONLY].filter((m) => n.includes(` ${m} `));
};

/** Une caractéristique digne de suivre l'article : un chiffre (Ø80, 25), un trait d'union (demi-ronde), ou une matière. */
function keepCharacteristic(c: string): boolean {
  const n = norm(c);
  // Une section en mm (« 18×200 mm » de la volige, « 27×40 mm » du liteau) : l'article au comptoir.
  if (/^\d+\s*[×x*]\s*\d+\s*mm$/.test(n)) return true;
  // « 2×10 m », « 4 m » : une quantité ou une dimension d'ouvrage, pas une caractéristique de l'article.
  if (/\d\s*[×x*]\s*\d/.test(n) || /^\d+(?:[.,]\d+)?\s*(?:m|ml|m2|cm|mm)$/.test(n)) return false;
  return /\d/.test(n) || n.includes("-") || n.split(" ").some((w) => MATERIAL_WORDS.has(w));
}

/**
 * LE TEST DU FOURNISSEUR (§40, verrou moteur §41.3) : une ligne « À commander » doit pouvoir être
 * chargée dans le camion sans rappeler l'artisan. Interdits en sortie : les m², un ml de métal sans
 * largeur ni épaisseur, « lot », « forfait », « ensemble ». Une telle ligne va chez « Le fournisseur
 * chiffrera » avec sa mesure, avec la raison ; elle ne part jamais en commande telle quelle.
 */
const METAL_WORDS = /\b(zinc|cuivre|alu|aluminium|inox|acier|galva|galvanise|plomb|tole|metal)\b/;
const SHEET_WORDS = /\b(voliges?|voligeage|osb|contreplaques?|panneaux?|ecrans?|membranes?|pare[ -]?(?:pluie|vapeur)|isolant|laine|frein[ -]?vapeur|epdm|feutre)\b/;
const DIMENSION = /\d\s*(?:mm|cm)\b|\bd[ée]v\.?\s*\d|d[ée]velopp|\bø|\bdiam|\blargeur\b|\bep\.?\s*\d|\bepaisseur\b|\d\s*[×x]\s*\d/;
export function supplierTest(designation: string, unit: string | null): string | null {
  const u = (unit ?? "").trim().toLowerCase().replace("²", "2");
  const d = norm(designation);
  // Les panneaux et rouleaux se vendent au m² (volige, OSB, écran, isolant) : le fournisseur sait les charger.
  if (/^(m2|m²)$/.test(u) && SHEET_WORDS.test(d)) return null;
  if (/^(m2|m²)$/.test(u)) return "Une surface en m² ne se charge pas dans un camion : il faut des pièces aux dimensions. Le fournisseur proposera pour cette mesure.";
  if (/^(lot|lots|forfait|forfaits|ft|ens|ensembles?|selon besoin)$/.test(u)) return `« ${unit!.trim()} » n'est pas une unité de commande : le fournisseur ne sait pas quoi charger.`;
  if (/^(ml|m)$/.test(u) && METAL_WORDS.test(d) && !DIMENSION.test(d)) return "Du métal au mètre sans largeur ni épaisseur : le fournisseur ne sait pas quoi charger.";
  return null;
}

/** Regroupe les besoins d'un même article (même produit) sur tout le chantier. */
function aggregate(
  needs: readonly OwnedNeed[],
  ouvrages: readonly OuvrageLevels[],
  characteristicsBySlot: Record<string, string[]>,
  consumables: ReadonlySet<string> = new Set(),
  suggested = false,
): PurchaseItem[] {
  const groups = new Map<string, OwnedNeed[]>();
  for (const n of needs) {
    if (n.status !== "calculated" || (n.origin === "suggested") !== suggested) continue;
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
      } else if (
        sameNeedUnit &&
        quantities[0] &&
        quantities[0].unit !== "u" &&
        !group.some((n) => n.precision) &&
        !(["ml", "m"].includes(quantities[0].unit) && orders[0].unit.many === "ml") &&
        orders[0].unit.many !== (UNIT_LABEL[quantities[0].unit]?.many ?? quantities[0].unit)
      ) {
        // Une pièce reste une pièce (« 8 longueurs de 2 m », pas « (8 pièces) ») ; une précision de la règle dit déjà ce
        // qui est couvert (« 13 ml de faîtage à couvrir ») ; sinon une longueur dit ce qu'elle couvre (§45.3).
        const need = quantities.reduce((sum, q) => sum.plus(q!.value), new Decimal(0));
        approx = unitText(need, UNIT_LABEL[quantities[0].unit] ?? { one: quantities[0].unit, many: quantities[0].unit });
        if (quantities[0].unit === "ml" || quantities[0].unit === "m") approx += " à couvrir";
      }
    } else if (sameNeedUnit && quantities[0]) {
      // Conditionnement pas encore connu : le besoin dans son unité, le fournisseur convertit.
      const need = quantities.reduce((sum, q) => sum.plus(q!.value), new Decimal(0));
      const unit = UNIT_LABEL[quantities[0].unit] ?? { one: quantities[0].unit, many: quantities[0].unit };
      quantity = unitText(need, unit);
      order = { count: need.toDecimalPlaces(2).toFixed(), unit: unit.many };
    }
    // Les caractéristiques du devis (coloris, matière, diamètre) suivent l'article jusqu'au fournisseur.
    // Les caractéristiques du devis suivent l'article, mais une matière seulement si elle est la sienne : la ligne
    // « voligeage sapin sous zinc » ne fait pas de la volige un article en zinc. L'article qui a déjà sa matière n'en
    // prend pas une autre ; sans matière, il n'en prend une que si la ligne n'en cite qu'une (jamais deviner entre deux).
    // Sans ouvrage connu (calcul appelé hors computeWithAnswers) : les caractéristiques de cet emplacement, tous ouvrages.
    const charsOf = (n: OwnedNeed) =>
      n.workItemId ? (characteristicsBySlot[slotCharacteristicsKey(n.workItemId, n.slot)] ?? []) : Object.entries(characteristicsBySlot).flatMap(([k, v]) => (k.endsWith(`/${n.slot}`) ? v : []));
    const raw = [...new Set(group.flatMap(charsOf))].filter((c) => keepCharacteristic(c) && !norm(first.label).includes(norm(c)));
    const own = materialsIn(first.label);
    const cited = [...new Set(raw.flatMap(materialsIn))];
    const extras = raw.filter((c) => {
      const m = materialsIn(c);
      if (m.length === 0) return true;
      return own.length === 0 && cited.length === 1;
    });
    const precision = [...new Set(group.map((n) => n.precision).filter((p): p is string => !!p))].join(" ; ");
    // La section du devis remplace l'épaisseur seule de l'article (« Voliges sapin 18 mm » + « 18×200 mm » →
    // « Voliges sapin 18×200 mm ») : le comptoir lit une seule dimension.
    // Une désignation calculée dit où vont les caractéristiques du devis (« Gouttière {devis} dév. 33 » →
    // « Gouttière zinc demi-ronde dév. 33 ») ; sinon elles suivent le nom.
    const slotted = first.labelWithQuote;
    let label = slotted ? withoutDevisMark(slotted) : first.label;
    const rest = extras.filter((c) => {
      const m = /^(\d+)\s*[×x*]\s*\d+\s*mm$/.exec(c);
      if (!m || !new RegExp(`(^|\\s)${m[1]} mm\\b`).test(label)) return true;
      label = label.replace(new RegExp(`(^|\\s)${m[1]} mm\\b`), `$1${c.replace(/\s*mm$/, " mm")}`);
      return false;
    });
    items.push({
      key,
      label: slotted ? withoutDevisMark(slotted.replace(DEVIS_MARK, rest.join(" "))) : rest.length > 0 ? `${label} ${rest.join(" ")}` : label,
      quantity,
      order,
      approx,
      ...(precision ? { precision } : {}),
      ...(consumables.has(first.family) ? { consumable: true } : {}),
      kind: "computed",
      needIds: group.map((n) => n.needId),
      lineIds: [...new Set(group.flatMap(owner))],
      state: "ready",
      assumptionKeys: [...new Set(group.flatMap((n) => n.assumptions.map((a) => a.key)))],
      ...(() => {
        const rules = group.flatMap((n) => n.toConfirm ?? []).filter((r, i, all) => all.findIndex((x) => x.key === r.key) === i);
        return rules.length > 0 ? { rules } : {};
      })(),
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
      out.push(`${withoutLabour(o.designation)} : ${measure}`);
    }
  }
  return out;
}

export function purchaseView(
  view: ArtisanView,
  engine: { needs: readonly OwnedNeed[]; questions: readonly Question[]; declined?: readonly string[] },
  link: {
    plan: QuotePlan;
    roles: ReadonlyMap<string, LineRole>;
    ref: Referential;
    validation: TakeoffValidation;
    /** §45.8 : réponses de l'artisan sur ce chantier (clé de l'article suggéré), et ce que l'entreprise ne veut plus voir. */
    consumables?: { accepted?: ReadonlySet<string>; refused?: ReadonlySet<string>; hidden?: ReadonlySet<string> };
  },
): PurchaseView {
  const consumableFamilies = new Set(link.ref.families.filter((f) => f.consumable).map((f) => f.code));
  const toBuy = aggregate(
    engine.needs.filter((n) => !(n.question && engine.declined?.includes(n.question.key))),
    view.ouvrages,
    link.plan.characteristicsBySlot,
    consumableFamilies,
  );
  // §45.8 : les consommables suggérés (besoins non « cœur » d'une famille consommable), réunis par article comme le reste.
  // Un besoin « à proposer » (égout et faîtage du joint debout, §47.8) rejoint le bloc, sauf si le devis le cite déjà.
  const quoteText = view.ouvrages.map((o) => norm(o.designation)).join(" | ");
  const offerable = (n: (typeof engine.needs)[number]) => !!n.offer && !(n.offer.unlessQuoteSays ?? []).some((w) => quoteText.includes(norm(w)));
  const offered = aggregate(
    engine.needs.filter((n) => consumableFamilies.has(n.family) || offerable(n)),
    view.ouvrages,
    link.plan.characteristicsBySlot,
    consumableFamilies,
    true,
  ).filter((s) => s.quantity && !toBuy.some((b) => b.label === s.label));
  const accepted = offered.filter((s) => link.consumables?.accepted?.has(s.key));
  toBuy.push(...accepted.map((s) => ({ ...s, consumable: true })));
  const suggestions = offered
    .filter((s) => !link.consumables?.accepted?.has(s.key) && !link.consumables?.refused?.has(s.key) && !link.consumables?.hidden?.has(s.key))
    .slice(0, MAX_SUGGESTIONS);
  const failedSupplierTest: ToQuoteItem[] = [];
  // Quantités écrites telles quelles dans le devis (chatières, sortie de toit) : à acheter, sans calcul.
  // Une ligne sans unité ou sans quantité y figure aussi, à confirmer : elle ne disparaît jamais en silence.
  for (const o of view.ouvrages) {
    const v = link.validation.lines.find((x) => x.lineId === o.lineId);
    const item = view.items.find((i) => i.kind === "line" && i.id === o.lineId);
    // Une ligne sans unité reste « indéterminée » jusqu'à ce que l'artisan la garde telle quelle (« C'est bon ») : alors elle part.
    const kept = o.role !== "undetermined" || item?.state === "verified";
    if (!v || v.kind === "labor" || v.basis !== "purchase" || !kept || o.needs.length > 0) continue;
    const written = o.read.quantity ? writtenQuantity(o.read.quantity, o.read.unit) : null;
    // Le test du fournisseur (§40) : une mesure n'est jamais une commande.
    const refused = supplierTest(o.designation, o.read.unit);
    if (refused) {
      failedSupplierTest.push({ key: `line:${o.lineId}`, label: withoutLabour(o.designation), measure: [o.read.quantity, o.read.unit].filter(Boolean).join(" "), reason: refused, lineIds: [o.lineId] });
      continue;
    }
    toBuy.push({
      key: `line:${o.lineId}`,
      // Marchandise seule : la ligne du devis perd ses mentions de pose (« (Fourniture et pose) »).
      label: withoutLabour(o.designation),
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
  const toQuote: ToQuoteItem[] = [...failedSupplierTest];
  // « Aucun de ces modèles » sur une pièce : BatiClair n'invente rien, le fournisseur chiffre pour la mesure du devis.
  for (const n of engine.needs) {
    if (!(n.question && engine.declined?.includes(n.question.key)) || n.origin === "suggested") continue;
    const planned = link.plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned" && l.workItemId === n.workItemId);
    const owner = planned.find((l) => l.slot === n.slot) ?? planned.find((l) => l.mentions.includes(n.slot)) ?? planned[0];
    const o = owner ? view.ouvrages.find((x) => x.lineId === owner.ref) : undefined;
    const measure = o ? [o.read.quantity, o.read.unit].filter(Boolean).join(" ") : "";
    toQuote.push({ key: `need:${n.needId}`, label: o ? `${n.slotLabel} (${withoutLabour(o.designation)})` : n.slotLabel, measure, reason: "Aucun modèle choisi : le fournisseur propose et chiffre.", lineIds: o ? [o.lineId] : [] });
  }
  for (const o of view.ouvrages) {
    const measure = [o.read.quantity, o.read.unit].filter(Boolean).join(" ");
    // Une ambiguïté encore ouverte (« 6 : ardoises ou jouées ? ») est une question, pas un article à faire chiffrer.
    if (link.roles.get(o.lineId) === "undetermined") continue;
    if (o.pending) {
      if (!toQuote.some((q) => q.key === `line:${o.lineId}`)) toQuote.push({ key: `line:${o.lineId}`, label: withoutLabour(o.designation), measure, reason: o.pending, lineIds: [o.lineId] });
      continue;
    }
    // Un composant cité sans règle, ou un besoin que BatiClair ne sait pas établir : le fournisseur chiffre pour la mesure.
    // (Un besoin qui attend une réponse est une question, pas un article à faire chiffrer.)
    for (const n of o.needs) {
      if (n.need || n.needRange || n.state === "to_confirm") continue;
      if (toBuy.some((b) => b.needIds.includes(n.needId))) continue;
      const computed = engine.needs.find((x) => x.needId === n.needId);
      if (computed?.status === "question" && computed.question && !engine.declined?.includes(computed.question.key)) continue;
      toQuote.push({ key: `need:${n.needId}`, label: `${n.label} (${withoutLabour(o.designation)})`, measure, reason: n.missing ?? "À faire chiffrer.", lineIds: [o.lineId] });
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
  const questions = [...view.decisions, ...preciseQuestions(toBuy, link.validation, link.ref)];
  const canValidate = questions.every((q) => q.lineIds.length === 0) && toBuy.every((b) => b.state === "ready");
  const groups = groupsOf(toBuy, engine.needs, view, link.plan, link.ref);
  const screen = supplyScreen(toBuy, toQuote, questions, engine, view, link.plan, link.ref);
  return { understood: understood(view, link.plan, link.ref), toBuy, groups, toQuote, assumptions, questions, suggestions, canValidate, screen };
}

/** Clé de la question « précision » d'une ligne reprise du devis (« precise:<ligne> »). */
const PRECISE = "precise:";
const plain = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Une ligne reprise telle quelle du devis dont la famille demande une précision que le fournisseur ne peut pas deviner
 * (« Sortie de toit Poujoulat » : quel diamètre ? réponse du fondateur, 2026-10-04) : une question à boutons sur la
 * ligne. La désignation reste celle du devis (marque, modèle) ; la réponse part dans la colonne « précision ». Une ligne
 * qui la donne déjà (« Ø 150 », « VMC ») ne demande rien.
 */
function preciseQuestions(toBuy: readonly PurchaseItem[], validation: TakeoffValidation, ref: Referential): Decision[] {
  const out: Decision[] = [];
  for (const item of toBuy) {
    if (item.kind !== "direct") continue;
    const lineId = item.lineIds[0]!;
    if (validation.lines.find((l) => l.lineId === lineId)?.kind === "labor") continue;
    // La famille se lit sur les mots du référentiel (« sortie de toit »), comme le plan lit une ligne.
    const text = plain(item.label);
    const ask = ref.families.find((f) => f.ask && f.keywords?.some((k) => new RegExp(`\\b${plain(k)}\\b`).test(text)))?.ask;
    if (!ask || new RegExp(ask.answered).test(text)) continue;
    const key = `${PRECISE}${lineId}`;
    out.push({
      key,
      state: "missing",
      title: item.label,
      text: ask.question,
      lineIds: [lineId],
      primary: null,
      secondary: [],
      question: { key, kind: "choose", text: ask.question, ...(ask.hint ? { hint: ask.hint } : {}), options: ask.choices },
    });
  }
  return out;
}

/**
 * § 41.4 : l'artisan réécrit d'un tap le libellé ou la quantité d'une ligne du quantitatif. Ses mots
 * remplacent ceux de BatiClair (réponses « libelle:<ligne> » et « quantite:<ligne> ») ; le calcul
 * reste visible derrière, marqué « fixé par vous ».
 */
export function applyPurchaseOverrides(purchase: PurchaseView, answers: Record<string, string | { value: string; unit: string } | null>): PurchaseView {
  const override = (item: PurchaseItem): PurchaseItem => {
    const label = answers[`libelle:${item.key}`];
    const quantity = answers[`quantite:${item.key}`];
    const precision = answers[`precision:${item.key}`];
    const edited: NonNullable<PurchaseItem["edited"]> = [];
    let out = item;
    // §45.9 : la précision se réécrit d'un tap dans l'aperçu (vide = plus de précision).
    if (typeof precision === "string") {
      const { precision: _old, ...rest } = out;
      out = precision.trim() ? { ...rest, precision: precision.trim() } : rest;
      edited.push("precision");
    }
    if (typeof label === "string" && label.trim()) {
      out = { ...out, label: label.trim() };
      edited.push("label");
    }
    if (quantity && typeof quantity === "object") {
      const unit = quantity.unit.trim();
      out = { ...out, quantity: `${fr(new Decimal(quantity.value))} ${unit}`.trim(), order: { count: quantity.value, unit }, approx: null };
      edited.push("quantity");
    }
    return edited.length > 0 ? { ...out, edited } : item;
  };
  // La précision répondue d'un bouton (« Ø 150 ») part dans la colonne « précision », avant celle que l'artisan aurait écrite ;
  // « Je ne sais pas » : la ligne part telle quelle, à préciser avec le fournisseur.
  const answered = new Map<string, string | null>();
  for (const q of purchase.questions) {
    if (!q.key.startsWith(PRECISE) || !(q.key in answers)) continue;
    const a = answers[q.key];
    answered.set(q.lineIds[0]!, typeof a === "string" && a.trim() ? a.trim() : null);
  }
  const precised = (item: PurchaseItem): PurchaseItem => {
    if (item.kind !== "direct" || !answered.has(item.lineIds[0]!)) return item;
    const value = answered.get(item.lineIds[0]!);
    if (!value || plain(item.precision ?? "").includes(plain(value))) return item;
    return { ...item, precision: [value, item.precision].filter(Boolean).join(" · ") };
  };
  // §45.9 : la croix de l'aperçu retire l'article de la liste (« retire:<clé> »).
  const kept = (item: PurchaseItem) => answers[`retire:${item.key}`] !== "oui";
  // Une suggestion (§45.8) se corrige d'un tap comme une ligne de la liste. Une ligne retirée quitte aussi l'écran.
  const toBuy = purchase.toBuy.filter(kept).map(precised).map(override);
  const present = new Set(toBuy.map((b) => b.key));
  const done = new Set([...answered.keys()].map((id) => `${PRECISE}${id}`));
  const questions = purchase.questions.filter((q) => !done.has(q.key));
  const groups = purchase.screen.groups
    .map((g) => ({
      ...g,
      rows: g.rows
        .filter((r) => !r.itemKey || present.has(r.itemKey))
        .map((r): ScreenRow => {
          if (!r.decisionKey || !done.has(r.decisionKey)) return r;
          const { decisionKey: _d, ...rest } = r;
          return { ...rest, status: answered.get(r.lineIds[0]!) ? "ok" : "supplier" };
        }),
    }))
    .filter((g) => g.rows.length > 0);
  const rows = groups.flatMap((g) => g.rows);
  const screen = { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  const canValidate = questions.every((q) => q.lineIds.length === 0) && toBuy.every((b) => b.state === "ready");
  return { ...purchase, toBuy, questions, canValidate, suggestions: purchase.suggestions.map(override), screen };
}


/** Clé de la confirmation d'une quantité calculée avec une règle « à vérifier » (§47.3). */
export const RATIO = "ratio:";

/** « Quantité à confirmer : colle 4 kg/m², pertes 10 % » (§47.3). */
export function toConfirmText(rules: readonly RuleToConfirm[]): string {
  // Les règles chiffrées d'abord (« 2 rails par cloison », « longueur de 3 m ») ; le nom seul d'un calcul n'est dit qu'à défaut.
  // Une règle sans nom (le calcul lui-même) n'est pas dite : sa valeur l'est par les règles chiffrées qu'il emploie.
  const said = rules.filter((r, i) => r.text && rules.findIndex((x) => x.text === r.text) === i);
  return said.length > 0 ? `Quantité à confirmer : ${said.map((r) => (r.conflict ? `${r.text} (sources en désaccord)` : r.text)).join(", ")}` : "Quantité à confirmer";
}

/**
 * §47.1, §47.3, §47.4 : une ligne calculée avec une règle « à vérifier » (ou que les sources contredisent) sort ORANGE,
 * avec son chiffre et « Quantité à confirmer : [règle] ». « C'est bon » (réponse « ratio:<article> ») la passe au vert ;
 * corriger la quantité aussi (le chiffre de l'artisan remplace le calcul). Une règle confirmée par trois artisans
 * différents est VALIDÉE (`validated`) : elle sort verte partout. L'envoi attend que tout soit vert ou gris.
 */
export function applyRuleConfirmations(
  purchase: PurchaseView,
  answers: Record<string, string | { value: string; unit: string } | null>,
  validated: ReadonlySet<string> = new Set(),
): PurchaseView {
  const decisions: Decision[] = [];
  const toBuy = purchase.toBuy.map((item): PurchaseItem => {
    const pending = (item.rules ?? []).filter((r) => !validated.has(r.key));
    if (pending.length === 0 || `${RATIO}${item.key}` in answers || item.edited?.includes("quantity")) return item;
    decisions.push({
      key: `${RATIO}${item.key}`,
      state: "to_confirm",
      title: item.label,
      text: toConfirmText(pending),
      lineIds: [],
      primary: { action: "keep", label: "C'est bon" },
      secondary: ["edit"],
    });
    return { ...item, toConfirm: pending };
  });
  if (decisions.length === 0) return { ...purchase, toBuy };
  const byItem = new Map(decisions.map((d) => [d.key.slice(RATIO.length), d]));
  const groups = purchase.screen.groups.map((g) => ({
    ...g,
    rows: g.rows.map((r): ScreenRow => {
      const d = r.itemKey && r.status === "ok" ? byItem.get(r.itemKey) : undefined;
      return d ? { ...r, status: "check", decisionKey: d.key, reason: d.text } : r;
    }),
  }));
  const rows = groups.flatMap((g) => g.rows);
  const screen = { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  return { ...purchase, toBuy, questions: [...purchase.questions, ...decisions], canValidate: false, screen };
}
