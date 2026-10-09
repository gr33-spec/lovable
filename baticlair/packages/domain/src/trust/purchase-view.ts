import { baseOf } from "../referential/model.js";
import { Decimal } from "../shared/decimal.js";
import { CONSUMABLES_QUESTION, DEVIS_MARK, withoutDevisMark, type Assumption, type NeedResult, type Question, type RuleToConfirm } from "../referential/engine.js";
import type { LineRole } from "../referential/line-roles.js";
import type { Referential } from "../referential/model.js";
import type { QuoteLineReading } from "../referential/reading.js";
import { LINE_UNITS, slotCharacteristicsKey, type QuotePlan } from "../referential/plan.js";
import { parseRefUnit, sameDim } from "../referential/units.js";
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
  /** §49.2.5 « Info manquante » : les questions dont la réponse manque à cette ligne (elle est orange, un tap ouvre la question). */
  waitsOn?: string[];
  /**
   * §49.8 : ce qui règle la ligne SUR PLACE, d'un tap dans sa carte : la donnée qui manque ou la valeur par défaut à
   * confirmer, avec ses boutons (« Développé ? 25 · 28 · 33 · 40 »).
   */
  asks?: { key: string; text: string; unit: string | null; options: { label: string; value: string }[] }[];
  /** §49.8 : un écart entre le devis et le calcul, en deux boutons (« Garder 20 » / « Mettre 21 »). */
  gap?: { written: string; computed: string; unit: string };
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
  /** « Couverture en ardoises au crochet : 200 m² », « 6 jouées de lucarnes »… */
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
  /** Ce que l'artisan doit savoir (l'amiante, §18) : dit en haut de la liste, jamais envoyé au fournisseur. */
  warnings: string[];
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
    const work = workId ? ref.workItems.find((w) => w.id === baseOf(workId)) : undefined;
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
    // §49.2.5 « Info manquante » : un tap ouvre la question qui manque à la ligne.
    const waits = (item.waitsOn ?? []).map((k) => decisions.find((d) => d.question?.key === k || d.key === `engine:${k}`)).filter((d): d is Decision => !!d);
    const check = item.state === "to_confirm" || precise !== undefined || (item.waitsOn?.length ?? 0) > 0;
    const decision = waits[0] ?? (item.state === "to_confirm" ? (decisionFor(item.lineIds) ?? precise) : precise);
    for (const d of [decision, precise, ...waits]) if (d) used.add(d.key);
    const missing = item.rules?.length ? { text: toConfirmText(item.rules) } : undefined;
    groupOf(workId, item.consumable === true).rows.push({
      key: `item:${item.key}`,
      status: check ? "check" : "ok",
      itemKey: item.key,
      ...(decision ? { decisionKey: decision.key } : {}),
      ...(item.waitsOn?.length && missing ? { reason: missing.text } : {}),
      lineIds: item.lineIds,
    });
  }
  const listed = new Set(toBuy.flatMap((b) => b.needIds));
  // Ce qui attend une réponse : une ligne orange par ouvrage et par question (« bobine ou bacs » : une ligne, une question).
  const waiting = new Map<string, { workId: string | undefined; questionKey: string; labels: string[]; lineIds: string[] }>();
  for (const n of engine.needs) {
    if (n.status !== "question" || !n.question || n.origin === "suggested" || n.consumable || engine.declined?.includes(n.question.key)) continue;
    // Déjà sa ligne « Info manquante » (l'article, ou la ligne écrite telle quelle) : pas de seconde ligne d'attente.
    const linesOfWork = plan.lines.filter((l) => l.status === "planned" && l.workItemId === n.workItemId).map((l) => l.ref);
    if (listed.has(n.needId) || toBuy.some((b) => b.key.startsWith("manque:line:") && b.waitsOn?.includes(n.question!.key) && b.lineIds.some((id) => linesOfWork.includes(id)))) continue;
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
    return param ? plannedWorks.find((id) => ref.workItems.find((w) => w.id === baseOf(id))?.params.some((p) => p.key === param)) : undefined;
  };
  // Une décision qu'aucune ligne ne porte encore (ambiguïté d'une mesure, article sans unité) : sa propre ligne orange.
  for (const d of decisions) {
    // La question consommables n'est pas une ligne : elle se pose à l'écran des questions, avant le calcul (§49.4).
    if (used.has(d.key) || d.question?.key === CONSUMABLES_QUESTION.key) continue;
    const line = view.ouvrages.find((o) => d.lineIds.includes(o.lineId));
    const quantity = line ? [line.read.quantity, line.read.unit].filter(Boolean).join(" ") || null : null;
    const workId = workOfLine(d.lineIds[0]) ?? workOfQuestion(d);
    // Une question découverte d'avance pour un ouvrage déjà orange attend son tour : elle viendra après la réponse en cours.
    if (d.key.startsWith("engine:") && d.lineIds.length === 0 && workId && groups.get(workId)?.rows.some((r) => r.status === "check")) continue;
    groupOf(workId).rows.push({ key: `decision:${d.key}`, status: "check", pending: { label: d.title, quantity }, decisionKey: d.key, lineIds: d.lineIds });
  }
  // §49.1 : dans l'ordre du devis (l'ouvrage de la première ligne d'abord) ; les consommables ferment la liste.
  const firstLine = (g: ScreenGroup) => {
    const at = g.rows.flatMap((r) => r.lineIds).map((id) => view.ouvrages.findIndex((o) => o.lineId === id)).filter((i) => i >= 0);
    return at.length > 0 ? Math.min(...at) : Number.MAX_SAFE_INTEGER;
  };
  const ordered = [...groups.values()].sort((a, b) => Number(a.kind === "consommables") - Number(b.kind === "consommables") || firstLine(a) - firstLine(b) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const rows = ordered.flatMap((g) => g.rows);
  return { groups: ordered, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
}

/**
 * Doute de lecture sur une ligne qui est la MESURE d'un ouvrage calculé (« Liteaux pour ardoises 200 m² ») : jamais un
 * article (les liteaux sont en ml), et plus une question à l'écran (2026-10-06) : la mesure se lit dans le titre de l'ouvrage.
 */
function measureDoubt(d: Decision, view: ArtisanView): boolean {
  return d.key.startsWith("line:") && view.ouvrages.some((o) => d.lineIds.includes(o.lineId) && o.needs.length > 0);
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
  return /\d/.test(n) || n.includes("-") || n.split(" ").some((w) => MATERIAL_WORDS.has(w) || PROFILE_WORDS.has(w));
}
/** Le profil écrit au devis change l'article au comptoir : « gouttière Havraise » n'est pas une demi-ronde (D-2026-020). */
const PROFILE_WORDS = new Set(["havraise", "nantaise", "mouluree", "carree", "rectangulaire"]);

/**
 * LE TEST DU FOURNISSEUR (§40, verrou moteur §41.3) : une ligne « À commander » doit pouvoir être
 * chargée dans le camion sans rappeler l'artisan. Interdits en sortie : les m², un ml de métal sans
 * largeur ni épaisseur, « lot », « forfait », « ensemble ». Une telle ligne va chez « Le fournisseur
 * chiffrera » avec sa mesure, avec la raison ; elle ne part jamais en commande telle quelle.
 */
const METAL_WORDS = /\b(zinc|cuivre|alu|aluminium|inox|acier|galva|galvanise|plomb|tole|metal)\b/;
const SHEET_WORDS = /\b(voliges?|voligeage|osb|contreplaques?|panneaux?|ecrans?|membranes?|pare[ -]?(?:pluie|vapeur)|isolant|laine|frein[ -]?vapeur|epdm|feutre)\b/;
const DIMENSION = /\d\s*(?:mm|cm)\b|\bd[ée]v\.?\s*\d|d[ée]velopp|ø\s*\d|\bdiam|\blargeur\b|\bep\.?\s*\d|\bepaisseur\b|\d\s*[×x]\s*\d/;
export function supplierTest(designation: string, unit: string | null): string | null {
  const u = (unit ?? "").trim().toLowerCase().replace("²", "2");
  const d = norm(designation);
  // Les panneaux et rouleaux se vendent au m² (volige, OSB, écran, isolant) : le fournisseur sait les charger.
  if (/^(m2|m²)$/.test(u) && SHEET_WORDS.test(d)) return null;
  // Un poste confié à une entreprise certifiée (désamiantage, §18) ou un système vendu à sa longueur (ligne de vie,
  // §14) : le fournisseur le chiffre tel qu'écrit.
  if (/\b(desamiantage|amiante|amiantees?|ligne de vie|lignes de vie)\b/.test(d)) return null;
  if (/^(m2|m²)$/.test(u)) return "Une surface en m² ne se charge pas dans un camion : il faut des pièces aux dimensions. Le fournisseur proposera pour cette mesure.";
  if (/^(lot|lots|forfait|forfaits|ft|ens|ensembles?|selon besoin)$/.test(u)) return `« ${unit!.trim()} » n'est pas une unité de commande : le fournisseur ne sait pas quoi charger.`;
  if (/^(ml|m)$/.test(u) && METAL_WORDS.test(d) && !DIMENSION.test(d)) return "Du métal au mètre sans largeur ni épaisseur : le fournisseur ne sait pas quoi charger.";
  return null;
}

/**
 * Ce qui garde une ligne orange, propre à ce chantier (§49) : un article cité par la pose sans être chiffré (les colliers
 * de « fixation »), un consommable sorti sur le « oui » de l'artisan, une valeur par défaut du tiroir pas encore
 * confirmée (§49.2.5 : « la ligne qui en dépend reste orange tant qu'un défaut non confirmé la porte »).
 */
/** Défauts affichés, jamais demandés (§49.4.3 : zone climatique, entraxe, taux de perte, pureau). */
const SHOWN_ONLY = new Set(["param:zone", "param:region_ardoise", "param:entraxe", "param:pureau"]);

function lineRules(key: string, group: readonly OwnedNeed[]): RuleToConfirm[] {
  const out: RuleToConfirm[] = [];
  const cited = group.find((n) => n.citedAs)?.citedAs;
  if (cited) out.push({ key: `cite:${key}`, text: `Le devis parle de ${cited} sans les chiffrer : quantité calculée, à vérifier`, local: true, said: true });
  if (group.some((n) => n.consumable)) out.push({ key: `consommable:${key}`, text: "Consommable ajouté sur ton oui : retire-le s'il ne sert pas", local: true, said: true });
  // Seulement les défauts que l'écran des questions annonce, réglables d'un tap (« Je pars sur ces valeurs ») ; la zone
  // climatique est un défaut affiché, jamais une question (§49.4.3).
  const defaults = [
    ...new Map(
      group
        .flatMap((n) => n.assumptions)
        .filter((a) => a.key.startsWith("param:") && !a.fromQuote && !a.computed && (a.choices?.length ?? 0) > 1 && !SHOWN_ONLY.has(a.key))
        .map((a) => [a.key, a]),
    ).values(),
  ];
  if (defaults.length > 0) {
    const said = defaults.map((a) => `${a.label.toLowerCase()} ${a.value}${a.unit && a.unit !== "u" && /\d/.test(a.value) ? `${a.unit === "°" ? "" : " "}${a.unit}` : ""}`).join(" ; ");
    out.push({ key: `defaut:${defaults.map((a) => `${a.key}=${a.value}`).join("&")}`, text: `Valeur par défaut à confirmer : ${said}`, local: true, said: true });
  }
  return out;
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
  // §49.5 : deux lignes du devis ne fusionnent jamais. Le même article sorti par deux ouvrages écrits (les feuilles des
  // bandes de rive, du faîtage et du porte-solin) reste une ligne par ouvrage, chacune avec sa précision.
  for (const [key, group] of [...groups]) {
    const works = [...new Set(group.map((n) => n.workItemId ?? "?"))];
    if (works.length < 2) continue;
    groups.delete(key);
    for (const w of works) groups.set(`${key}@${w}`, group.filter((n) => (n.workItemId ?? "?") === w));
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
      ...(consumables.has(first.family) || group.some((n) => n.consumable) ? { consumable: true } : {}),
      kind: "computed",
      needIds: group.map((n) => n.needId),
      lineIds: [...new Set(group.flatMap(owner))],
      state: "ready",
      assumptionKeys: [...new Set(group.flatMap((n) => n.assumptions.map((a) => a.key)))],
      ...(() => {
        const rules = [...group.flatMap((n) => n.toConfirm ?? []), ...lineRules(key, group)].filter((r, i, all) => all.findIndex((x) => x.key === r.key) === i);
        return rules.length > 0 ? { rules } : {};
      })(),
      ...(() => {
        const waits = [...new Set(group.flatMap((n) => (n.unknownParams ?? []).map((k) => `param:${k}`)))];
        return waits.length > 0 ? { waitsOn: waits } : {};
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
    const work = workId ? ref.workItems.find((w) => w.id === baseOf(workId)) : undefined;
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
      const work = ref.workItems.find((w) => w.id === baseOf(planned.workItemId))!;
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
  engine: { needs: readonly OwnedNeed[]; questions: readonly Question[]; declined?: readonly string[]; checks?: readonly OwnedNeed[]; unknowns?: readonly OwnedNeed[] },
  link: {
    plan: QuotePlan;
    roles: ReadonlyMap<string, LineRole>;
    ref: Referential;
    validation: TakeoffValidation;
    /** §45.8 : réponses de l'artisan sur ce chantier (clé de l'article suggéré), et ce que l'entreprise ne veut plus voir. */
    consumables?: { accepted?: ReadonlySet<string>; refused?: ReadonlySet<string>; hidden?: ReadonlySet<string> };
    /** §41.1 : la lecture de chaque ligne (son « manque » fait les questions du comptoir, §49.4). */
    readings?: ReadonlyMap<string, QuoteLineReading>;
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
  // §49.1 point 5 : pas de bloc « Suggestions » pour des articles absents du devis, dans aucun métier.
  const suggestions: PurchaseItem[] = [];
  void offered;
  // §49.2.5 « Info manquante » : un article écrit qui attend une donnée sort quand même, orange, avec la quantité que le
  // calcul sait donner sans elle (« Gouttière zinc Havraise dév. ? », 3 longueurs de 4 m) ; jamais une valeur inventée.
  const waitingOn = (n: OwnedNeed) => engine.needs.find((x) => x.needId === n.needId && x.workItemId === n.workItemId && x.status === "question")?.question;
  const unknownItems = aggregate(engine.unknowns ?? [], view.ouvrages, link.plan.characteristicsBySlot, consumableFamilies).map((item): PurchaseItem => {
    const questions = [...new Map(item.needIds.flatMap((id) => (engine.unknowns ?? []).filter((n) => n.needId === id)).map(waitingOn).filter((q): q is Question => !!q).map((q) => [q.key, q])).values()];
    // La ligne du devis qu'elle remplace : sans elle, la ligne écrite ressortirait aussi en gris (§49.8, jamais deux fois).
    const works = new Set(item.needIds.flatMap((id) => (engine.unknowns ?? []).filter((n) => n.needId === id).map((n) => n.workItemId)));
    const lineIds = item.lineIds.length > 0 ? item.lineIds : link.plan.lines.filter((l) => l.status === "planned" && works.has(l.workItemId)).map((l) => l.ref).slice(0, 1);
    return { ...item, lineIds, key: `manque:${item.key}`, waitsOn: questions.map((q) => q.key), rules: [missingRule(item.key, questions, link.ref), ...(item.rules ?? [])] };
  });
  toBuy.push(...unknownItems);
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
    // Une quantité écrite par l'artisan lui-même fait foi : seule celle du devis se compare au calcul.
    const gap = o.byArtisan ? null : quantityGap(o.lineId, v, link.plan, engine.checks ?? []);
    const pieces = o.byArtisan ? null : writtenPieces(o.lineId, v, link.plan, link.ref);
    toBuy.push({
      key: `line:${o.lineId}`,
      // Marchandise seule : la ligne du devis perd ses mentions de pose (« (Fourniture et pose) »).
      label: withoutLabour(o.designation),
      quantity: pieces ? `${pieces.count} ${pieces.unit}` : (written?.text ?? null),
      order: pieces ?? (o.read.quantity ? { count: o.read.quantity, unit: written!.unit } : null),
      approx: null,
      kind: "direct",
      needIds: [],
      lineIds: [o.lineId],
      state: item?.state === "verified" ? "ready" : "to_confirm",
      ...(gap ? { rules: [gap], ...(gapValues(gap, pieces?.unit ?? written?.unit ?? "") ? { gap: gapValues(gap, pieces?.unit ?? written?.unit ?? "")! } : {}) } : {}),
      assumptionKeys: [],
    });
  }
  // Rien de calculable sans la réponse (le façonnage du faîtage : bandes ou feuilles ?) : la ligne écrite sort telle quelle,
  // avec la quantité du devis, orange « Info manquante » (§49.5 : une ligne écrite ne disparaît jamais).
  for (const o of view.ouvrages) {
    const planned = link.plan.lines.find((l) => l.ref === o.lineId);
    if (planned?.status !== "planned" || toBuy.some((b) => b.lineIds.includes(o.lineId) && b.kind === "direct")) continue;
    const waiting = engine.needs.filter((n) => n.workItemId === planned.workItemId && n.status === "question" && n.question && !n.consumable && n.origin !== "suggested" && !(n.question.key.startsWith("product:") && engine.declined?.includes(n.question.key)));
    const work = link.ref.workItems.find((w) => w.id === baseOf(planned.workItemId));
    const slot = work?.slots.find((x) => x.key === planned.slot);
    // Les besoins de l'article écrit par CETTE ligne (lui-même, ou une autre forme de lui : les feuilles d'une bande).
    const own = waiting.filter((n) => n.slot === planned.slot || work?.slots.find((x) => x.key === n.slot)?.formOf === planned.slot);
    if (!slot || own.length === 0 || toBuy.some((b) => b.needIds.some((id) => own.some((n) => n.needId === id)))) continue;
    const questions = [...new Map(own.map((n) => [n.question!.key, n.question!])).values()];
    const chars = (link.plan.characteristicsBySlot[slotCharacteristicsKey(planned.workItemId, planned.slot)] ?? []).filter(keepCharacteristic);
    // Les données écrites qui font l'article au comptoir (« développé 25 cm ») suivent le nom ; jamais un défaut.
    const params = link.plan.inputs.find((i) => i.workItemId === planned.workItemId)?.params ?? {};
    const writtenData = [...new Set(own.flatMap((n) => work!.needs.find((r) => r.id === n.needId)?.precisionRequires ?? []))]
      .filter((k) => params[k]?.origin === "devis" && params[k]!.unit !== "u")
      .map((k) => `${k.startsWith("developpe") ? "dév." : work!.params.find((p) => p.key === k)!.label.toLowerCase()} ${fr(params[k]!.value)} ${params[k]!.unit === "u" ? "" : params[k]!.unit}`.trim());
    // Le nom est celui de la pièce écrite (« Bande de rive zinc quartz dév. 200 », instance d'un ouvrage pièce par pièce),
    // sinon celui de l'ouvrage pour son article principal, sinon celui de l'article : jamais « Bandes zinc » pour une
    // bande nommée, ni « Couverture zinc… » pour des voliges.
    const piece = link.plan.inputs.find((i) => i.workItemId === planned.workItemId)?.label;
    const base = piece ?? (slot.key === work!.slots[0]?.key ? shortWork(work!.label) : slot.label);
    const name = [base, ...writtenData.filter((d) => !norm(base).includes(norm(d).split(" ")[0]!))].join(", ");
    const label = [name, ...chars.filter((c) => !norm(name).includes(norm(c)))].join(" ");
    // La quantité du devis telle quelle, sauf une mesure qui n'est pas une unité de commande (120 m² de tuiles) : la
    // ligne reste vide et la mesure se lit dans la précision (§49.3.3, jamais d'unité interdite).
    const measure = /^(m2|m²)$/i.test((o.read.unit ?? "").trim()) && supplierTest(label, o.read.unit) !== null;
    const written = o.read.quantity && !measure ? writtenQuantity(o.read.quantity, o.read.unit) : null;
    const said = [o.read.quantity, o.read.unit === "m2" ? "m²" : o.read.unit].filter(Boolean).join(" ");
    toBuy.push({
      key: `manque:line:${o.lineId}`,
      label,
      quantity: written?.text ?? null,
      order: written ? { count: o.read.quantity!, unit: written.unit } : null,
      approx: null,
      ...(measure && said ? { precision: `${said} au devis` } : {}),
      kind: "direct",
      needIds: [],
      lineIds: [o.lineId],
      state: "ready",
      assumptionKeys: [],
      waitsOn: questions.map((q) => q.key),
      rules: [missingRule(`line:${o.lineId}`, questions, link.ref)],
    });
  }
  // La naissance d'office (§49.1 point 3) qui attend une réponse (combien de descentes ?) : sa ligne, vide, orange.
  for (const n of engine.needs) {
    if (n.status !== "question" || !n.question || n.consumable || n.origin === "suggested" || toBuy.some((b) => b.needIds.includes(n.needId))) continue;
    const work = link.ref.workItems.find((w) => w.id === baseOf(n.workItemId));
    const slot = work?.slots.find((x) => x.key === n.slot);
    if (!work || !slot?.indissociable) continue;
    const chars = (link.plan.characteristicsBySlot[slotCharacteristicsKey(n.workItemId ?? work.id, slot.key)] ?? []).filter(keepCharacteristic);
    const lineIds = link.plan.lines.filter((l) => l.status === "planned" && l.workItemId === n.workItemId).map((l) => l.ref).slice(0, 1);
    toBuy.push({
      key: `manque:need:${n.workItemId}/${n.needId}`,
      label: [slot.label, ...chars].join(" "),
      quantity: null,
      order: null,
      approx: null,
      kind: "computed",
      needIds: [n.needId],
      lineIds,
      state: "ready",
      assumptionKeys: [],
      waitsOn: [n.question.key],
      rules: [missingRule(`need:${n.workItemId}/${n.needId}`, [n.question], link.ref)],
    });
  }
  // §49.1 : la liste suit l'ordre du devis ; l'article d'une ligne vient à la place de la ligne qui l'écrit (les colliers
  // cités par la pose des descentes, après les coudes).
  const position = (item: PurchaseItem) => writtenAt(item, engine.needs, link.plan, view);
  toBuy.splice(
    0,
    toBuy.length,
    ...toBuy
      .map((item, i) => ({ item: withWrittenContext(item, engine.needs, link.plan, view), i, at: position(item) }))
      // À la même ligne, l'article que la ligne écrit d'abord (la bande porte-solin, puis son mortier).
      // Les consommables acceptés ferment la liste (§49.1 point 4), dans l'ordre de leurs lignes.
      .sort((a, b) => Number(a.item.consumable === true) - Number(b.item.consumable === true) || a.at - b.at || Number(a.item.kind !== "direct") - Number(b.item.kind !== "direct") || a.i - b.i)
      .map((x) => x.item),
  );
  const toQuote: ToQuoteItem[] = [...failedSupplierTest];
  // « Aucun de ces modèles » sur une pièce : BatiClair n'invente rien, le fournisseur chiffre pour la mesure du devis.
  for (const n of engine.needs) {
    // Seulement « aucun de ces modèles » sur une pièce ; une donnée laissée sans réponse fait une ligne « Info manquante ».
    if (!(n.question && n.question.key.startsWith("product:") && engine.declined?.includes(n.question.key)) || n.origin === "suggested") continue;
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
      // §49.1 : une ligne écrite qui attend une info sort UNE fois, orange « Info manquante », jamais aussi en gris.
      if (toBuy.some((b) => b.key.startsWith("manque:") && !b.key.startsWith("manque:need:") && b.lineIds.includes(o.lineId))) continue;
      if (!toQuote.some((q) => q.key === `line:${o.lineId}`)) toQuote.push({ key: `line:${o.lineId}`, label: withoutLabour(o.designation), measure, reason: o.pending, lineIds: [o.lineId] });
      continue;
    }
    // Un composant cité sans règle, ou un besoin que BatiClair ne sait pas établir : le fournisseur chiffre pour la mesure.
    // (Un besoin qui attend une réponse est une question, pas un article à faire chiffrer.)
    for (const n of o.needs) {
      if (n.need || n.needRange || n.state === "to_confirm") continue;
      if (toBuy.some((b) => b.needIds.includes(n.needId) || b.key === `manque:line:${o.lineId}`)) continue;
      const computed = engine.needs.find((x) => x.needId === n.needId);
      if (computed?.consumable) continue;
      if (computed?.status === "question" && computed.question && !engine.declined?.includes(computed.question.key)) continue;
      toQuote.push({ key: `need:${n.needId}`, label: `${n.label} (${withoutLabour(o.designation)})`, measure, reason: n.missing ?? "À faire chiffrer.", lineIds: [o.lineId] });
    }
  }
  // Les hypothèses dites à l'artisan : les données (pente, zone, pureau…), et un produit par défaut seulement
  // quand il existe un vrai choix du même genre (liteaux 18×40 ou 27×40). Une pièce « modèle à préciser »
  // que le fournisseur remplacera par sa marque n'en est pas une.
  const assumptions: Assumption[] = [];
  for (const n of engine.needs) {
    const work = link.ref.workItems.find((w) => w.id === baseOf(n.workItemId));
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
  // Le doute sur une MESURE d'ouvrage (« 48 m² », « 4 m ») dont les articles sont calculés n'est pas une question : la mesure
  // est déjà dans le titre de l'ouvrage, l'artisan s'en moque (retour du fondateur, 2026-10-06 : « les mesures lues dans le
  // devis on s'en fout »). Ni ligne orange, ni blocage de l'envoi.
  const engineQuestions = [...view.decisions.filter((d) => !measureDoubt(d, view)), ...preciseQuestions(toBuy, link.validation, link.ref)];
  // §49.4 : « manque » (lecture §41.1) et le tiroir produisent la liste ; une question du tiroir sur le même sujet suffit,
  // une donnée écrite au devis n'est jamais demandée. Sans réponse, la ligne sort orange « Info manquante ».
  const counter = counterQuestions(link.readings, engineQuestions, link.plan, link.ref, assumptions);
  for (const d of counter) {
    const what = d.text.replace(/\s*\?$/, "");
    for (const [i, item] of toBuy.entries()) {
      if (!item.lineIds.includes(d.lineIds[0]!)) continue;
      toBuy[i] = { ...item, waitsOn: [...(item.waitsOn ?? []), d.key], rules: [...(item.rules ?? []), { key: `manque:${d.key}`, text: `Info manquante : ${what.charAt(0).toLowerCase()}${what.slice(1)}`, local: true, said: true }] };
    }
  }
  const questions = [...engineQuestions, ...counter];
  // §49.8 : chaque ligne orange porte ses boutons (la donnée qui manque, le défaut à confirmer) pour se régler sur place.
  const known = new Map<string, Question>();
  for (const n of engine.needs) if (n.question) known.set(n.question.key, n.question);
  for (const q of engine.questions) known.set(q.key, q);
  for (const d of questions) if (d.question) known.set(d.question.key, d.question);
  for (const [i, item] of toBuy.entries()) {
    const asks = [
      ...(item.waitsOn ?? []).map((k) => known.get(k)).filter((q): q is Question => !!q?.options?.length),
      ...assumptions
        .filter((a) => item.assumptionKeys.includes(a.key) && (item.rules ?? []).some((r) => r.key.startsWith("defaut:") && r.key.includes(a.key)) && (a.choices?.length ?? 0) > 1)
        .map((a): Question => ({ key: a.key, kind: "param", text: a.label, unit: a.unit, options: a.choices! })),
    ];
    if (asks.length === 0) continue;
    toBuy[i] = { ...item, asks: [...new Map(asks.map((q) => [q.key, { key: q.key, text: q.text.replace(/\s*\?$/, "").replace(/ Cela change la commande :.*$/, ""), unit: q.unit ?? null, options: q.options! }])).values()] };
  }
  const canValidate = sendable(toBuy, toQuote, questions);
  const groups = groupsOf(toBuy, engine.needs, view, link.plan, link.ref);
  const screen = supplyScreen(toBuy, toQuote, questions, engine, view, link.plan, link.ref);
  // Une famille qui avertit (l'amiante) : lue par le plan sur toutes les lignes, même de main-d'œuvre.
  const warnings = link.plan.warnings ?? [];
  return { understood: understood(view, link.plan, link.ref), toBuy, groups, toQuote, assumptions, questions, suggestions, canValidate, screen, warnings };
}

/** Clé de la question « précision » d'une ligne reprise du devis (« precise:<ligne> »). */
const PRECISE = "precise:";
/** Clé d'une question de comptoir venue de « manque » (§41.1, §49.4) : « comptoir:<ligne>:<rang> ». */
export const COUNTER = "comptoir:";

/** Les sujets d'une question de comptoir : deux questions sur le même sujet n'en font qu'une. */
const TOPICS = ["developpe", "diametre", "pente", "rampant", "format", "modele", "teinte", "coloris", "couleur", "epaisseur", "faconnage", "qualite", "largeur", "hauteur", "taille", "aspect", "profil", "dimension"];
const topicsOf = (text: string) => TOPICS.filter((t) => plain(text).includes(t));

/**
 * §49.4 point 2 : les questions de comptoir de « manque » (ce que le vendeur demanderait encore pour servir la ligne).
 * Écartées : celles que le tiroir pose déjà (même sujet), et celles sur une donnée que le devis écrit (le Ø80, la pente).
 * Les choix écrits entre parenthèses (« (25, 28, 33, 40) ») deviennent des boutons ; la réponse part en précision.
 */
function counterQuestions(readings: ReadonlyMap<string, QuoteLineReading> | undefined, asked: readonly Decision[], plan: QuotePlan, ref: Referential, shown: readonly Assumption[]): Decision[] {
  if (!readings) return [];
  // Déjà à l'écran : une question du tiroir, ou une valeur annoncée dans « Je pars sur ces valeurs » (l'épaisseur du zinc).
  const askedTopics = new Set([...asked.flatMap((d) => topicsOf(`${d.question?.text ?? ""} ${d.question?.key ?? ""}`)), ...shown.flatMap((a) => topicsOf(`${a.key} ${a.label}`))]);
  const out: Decision[] = [];
  for (const [lineId, reading] of readings) {
    const planned = plan.lines.find((l) => l.ref === lineId);
    const work = planned?.status === "planned" ? ref.workItems.find((w) => w.id === baseOf(planned.workItemId)) : undefined;
    const params = work && planned?.status === "planned" ? (plan.inputs.find((i) => i.workItemId === planned.workItemId)?.params ?? {}) : {};
    // Les données écrites de l'ouvrage (lues au devis, ligne de pose comprise) : jamais redemandées. Une donnée se
    // reconnaît à son sujet (« diamètre ») ou à tous les mots de son nom (« nombre de descentes »).
    const written = work ? work.params.filter((p) => params[p.key]?.origin === "devis") : [];
    // Une donnée que l'ouvrage de la ligne connaît (le Ø des naissances pour la gouttière) se règle par SA question, posée
    // avant le calcul, une fois pour toutes les lignes qui en dépendent ; jamais une 2e question du comptoir, ni avant ni
    // après le calcul (la question du tiroir close au calcul ne la fait pas revenir sur les cartes).
    const writtenTopics = new Set((work?.params ?? []).flatMap((p) => topicsOf(`${p.key} ${p.label}`)));
    const words = (t: string) => plain(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const namesWritten = (m: string) => written.some((p) => words(p.label).length > 0 && words(p.label).every((w) => plain(m).includes(w)));
    reading.manque.forEach((m, i) => {
      const topics = topicsOf(m);
      if (topics.some((t) => askedTopics.has(t) || writtenTopics.has(t)) || namesWritten(m)) return;
      // « (0,65, 0,70, 0,80 mm) » : la virgule décimale ne coupe pas un choix ; l'unité finale vaut pour tous.
      const raw = /\(([^)]+)\)/.exec(m)?.[1]?.split(/\s*,\s+|\s*;\s*|\s*\/\s*|\s+ou\s+|(?<!\d),(?!\d)/).map((c) => c.trim()).filter(Boolean) ?? [];
      const unit = /^[\d.,]+\s*([a-zA-Z°²]+)$/.exec(raw.at(-1) ?? "")?.[1];
      const choices = unit ? raw.map((c) => (/^[\d.,]+$/.test(c) ? `${c} ${unit}` : c)) : raw;
      const text = `${m.replace(/\s*\([^)]*\)/, "").trim().replace(/^./, (c) => c.toUpperCase())} ?`;
      const key = `${COUNTER}${lineId}:${i + 1}`;
      out.push({
        key,
        state: "missing",
        title: text,
        text,
        lineIds: [lineId],
        primary: null,
        secondary: [],
        question: { key, kind: "choose", text, ...(choices.length >= 2 ? { options: choices.map((c) => ({ label: c, value: c })) } : {}) },
      });
      topics.forEach((t) => askedTopics.add(t));
    });
  }
  return out;
}
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
  // §49.4 : une question de comptoir répondue part dans la précision de sa ligne ; la ligne n'attend plus rien.
  const counterAnswers = purchase.questions.filter((q) => q.key.startsWith(COUNTER) && typeof answers[q.key] === "string" && (answers[q.key] as string).trim());
  const counterDone = new Set(counterAnswers.map((q) => q.key));
  // Laissée sans réponse au calcul (§48.4) : la question se ferme, la ligne reste orange « Info manquante ».
  const counterClosed = new Set(purchase.questions.filter((q) => q.key.startsWith(COUNTER) && answers[q.key] === null).map((q) => q.key));
  const countered = (item: PurchaseItem): PurchaseItem => {
    const mine = counterAnswers.filter((q) => item.lineIds.includes(q.lineIds[0]!));
    if (mine.length === 0) return item;
    const said = mine.map((q) => `${q.text.replace(/\s*\?$/, "")} : ${(answers[q.key] as string).trim()}`);
    const waitsOn = (item.waitsOn ?? []).filter((k) => !counterDone.has(k));
    const rules = (item.rules ?? []).filter((r) => !counterDone.has(r.key.replace(/^manque:/, "")));
    const { waitsOn: _w, rules: _r, ...rest } = item;
    return { ...rest, ...(waitsOn.length ? { waitsOn } : {}), ...(rules.length ? { rules } : {}), precision: [item.precision, ...said].filter(Boolean).join(" ; ") };
  };
  const precised = (item: PurchaseItem): PurchaseItem => {
    if (item.kind !== "direct" || !answered.has(item.lineIds[0]!)) return item;
    const value = answered.get(item.lineIds[0]!);
    if (!value || plain(item.precision ?? "").includes(plain(value))) return item;
    return { ...item, precision: [value, item.precision].filter(Boolean).join(" · ") };
  };
  // §45.9 : la croix de l'aperçu retire l'article de la liste (« retire:<clé> »).
  const kept = (item: PurchaseItem) => answers[`retire:${item.key}`] !== "oui";
  // Une suggestion (§45.8) se corrige d'un tap comme une ligne de la liste. Une ligne retirée quitte aussi l'écran.
  const toBuy = purchase.toBuy.filter(kept).map(precised).map(countered).map(override);
  const present = new Set(toBuy.map((b) => b.key));
  const done = new Set([...[...answered.keys()].map((id) => `${PRECISE}${id}`), ...counterDone]);
  const questions = purchase.questions.filter((q) => !done.has(q.key) && !counterClosed.has(q.key));
  const groups = purchase.screen.groups
    .map((g) => ({
      ...g,
      rows: g.rows
        .filter((r) => !r.itemKey || present.has(r.itemKey))
        .map((r): ScreenRow => {
          if (r.decisionKey && counterClosed.has(r.decisionKey)) {
            const { decisionKey: _closed, ...open } = r;
            return open;
          }
          if (!r.decisionKey || !done.has(r.decisionKey)) return r;
          const { decisionKey: _d, reason: _why, ...rest } = r;
          if (counterDone.has(r.decisionKey)) {
            // La réponse donnée, la ligne reste orange seulement si elle attend encore autre chose.
            const item = toBuy.find((b) => b.key === r.itemKey);
            return { ...rest, status: item?.waitsOn?.length ? "check" : "ok" };
          }
          return { ...rest, status: answered.get(r.lineIds[0]!) ? "ok" : "supplier" };
        }),
    }))
    .filter((g) => g.rows.length > 0);
  const rows = groups.flatMap((g) => g.rows);
  const screen = { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  const canValidate = sendable(toBuy, purchase.toQuote, questions);
  return { ...purchase, toBuy, questions, canValidate, suggestions: purchase.suggestions.map(override), screen };
}


/**
 * « Tuyau de descente … (2 descentes de 3 mètres), 6 m » : la longueur se commande en longueurs, telles que le devis les
 * décrit (2 longueurs de 3 m), seulement quand le compte écrit tombe juste (D-2026-020).
 */
function writtenPieces(lineId: string, v: TakeoffValidation["lines"][number], plan: QuotePlan, ref: Referential): { count: string; unit: string } | null {
  const planned = plan.lines.find((l) => l.ref === lineId);
  if (planned?.status !== "planned" || !v.quantity || !v.unit || LINE_UNITS[v.unit] !== "m") return null;
  const from = ref.workItems.find((w) => w.id === baseOf(planned.workItemId))?.slots.find((s) => s.key === planned.slot)?.piecesFrom;
  const params = plan.inputs.find((i) => i.workItemId === planned.workItemId)?.params;
  const count = from && params?.[from.count];
  const length = from && params?.[from.length];
  if (!count || !length || count.origin !== "devis" || length.origin !== "devis" || !sameDim(parseRefUnit(length.unit).dim, parseRefUnit("m").dim)) return null;
  const metres = new Decimal(length.value).times(parseRefUnit(length.unit).factor);
  if (!metres.times(count.value).equals(v.quantity)) return null;
  const n = new Decimal(count.value);
  const piece = from.piece ?? { one: "longueur", many: "longueurs" };
  return { count: fr(n), unit: `${n.equals(1) ? piece.one : piece.many} de ${fr(metres)} m` };
}

/**
 * Le devis écrit la quantité (« 20 crochets de gouttière ») : elle reste la base, mais elle est comparée au calcul. Un
 * écart réel (plus de 3 %, et au moins une pièce) se dit sur la ligne, orange, jusqu'au « C'est bon » de l'artisan
 * (retour du fondateur sur D-2026-020 : « 20 au devis, 21 calculés pour 10 m à 50 cm »).
 */
function quantityGap(lineId: string, v: TakeoffValidation["lines"][number], plan: QuotePlan, checks: readonly OwnedNeed[]): RuleToConfirm | null {
  const planned = plan.lines.find((l) => l.ref === lineId);
  if (planned?.status !== "planned" || !v.quantity || !v.unit || v.quantity.lessThanOrEqualTo(0)) return null;
  const unit = LINE_UNITS[v.unit];
  const need = checks.find((n) => n.workItemId === planned.workItemId && n.slot === planned.slot && n.quantity);
  if (!unit || !need?.quantity) return null;
  const written = parseRefUnit(unit);
  const computed = parseRefUnit(need.quantity.unit);
  if (!sameDim(written.dim, computed.dim)) return null;
  let value = new Decimal(need.quantity.value).times(computed.factor).dividedBy(written.factor);
  const count = unit === "u";
  if (count) value = value.ceil();
  const diff = value.minus(v.quantity).abs();
  if (diff.dividedBy(v.quantity).lessThanOrEqualTo(0.03) || (count && diff.lessThan(1))) return null;
  const said = (d: Decimal) => (count ? fr(d) : `${fr(d.toDecimalPlaces(2))} ${unit === "m2" ? "m²" : unit === "m" ? "ml" : unit}`);
  // §49.2.2 : « Le devis dit 20, le calcul donne 21 » ; l'artisan tranche d'un tap.
  return {
    key: `ecart:${lineId}`,
    text: `Le devis dit ${said(v.quantity)}, le calcul donne ${said(value)}${need.basis ? ` (${need.basis})` : ""}`,
    local: true,
    said: true,
  };
}

/** « Info manquante : développé de la gouttière » : la donnée qui manque, dite avec les mots de la question. */
function missingRule(key: string, questions: readonly Question[], ref?: Referential): RuleToConfirm {
  // Le nom de la donnée (« développé de la gouttière »), sinon la question elle-même.
  const name = (q: Question) => {
    const m = /^param:([a-z0-9_]+)/.exec(q.key);
    const def = m ? ref?.workItems.flatMap((w) => w.params).find((p) => p.key === m[1]) : undefined;
    return def ? def.label.toLowerCase() : q.text.replace(/\s*\?$/, "").replace(/ Cela change la commande :.*$/, "");
  };
  const what = [...new Set(questions.map(name))].join(", ");
  return { key: `manque:${key}`, text: `Info manquante${what ? ` : ${what}` : ""}`, local: true, said: true };
}

/**
 * La place d'un article dans la liste (§49.1 : l'ordre du devis) : la ligne qui l'écrit (l'emplacement de la ligne, ou un
 * article qu'elle nomme, ou celui dont il est la forme d'achat) ; un article cité par une ligne de pose (les colliers),
 * à la place de cette ligne ; sinon la première ligne de son ouvrage.
 */
function writtenAt(item: PurchaseItem, needs: readonly OwnedNeed[], plan: QuotePlan, view: ArtisanView): number {
  const order = (ref: string) => {
    const i = view.ouvrages.findIndex((o) => o.lineId === ref);
    return i >= 0 ? i : plan.lines.findIndex((l) => l.ref === ref) + view.ouvrages.length;
  };
  const own = needs.filter((n) => item.needIds.includes(n.needId));
  const at: number[] = [];
  for (const n of own) {
    const planned = plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned" && l.workItemId === n.workItemId);
    const input = plan.inputs.find((i) => i.workItemId === n.workItemId);
    const own = planned.find((l) => l.slot === n.slot);
    if (own) {
      at.push(order(own.ref));
      continue;
    }
    // Nommé en second sur la ligne d'un autre article (« bande porte-solin et mortier ») : juste après cet article.
    const named = planned.find((l) => l.mentions.includes(n.slot));
    if (named) {
      at.push(order(named.ref) + 0.1);
      continue;
    }
    // Cité par une ligne de pose : sa place est juste après la dernière ligne écrite de l'ouvrage.
    if (input?.cited?.some((c) => c.slot === n.slot) && planned.length > 0) {
      at.push(Math.max(...planned.map((l) => order(l.ref))) + 0.5);
      continue;
    }
    if (planned[0]) at.push(order(planned[0].ref));
  }
  if (at.length > 0) return Math.min(...at);
  const lines = item.lineIds.map(order);
  return lines.length > 0 ? Math.min(...lines) : Number.MAX_SAFE_INTEGER;
}

/**
 * Ce que le devis écrit autour de l'article et que le comptoir doit lire : la ligne de pose qui le cite (les colliers
 * de « fixation », ligne 14), et « y compris retour d'angle … » écrit sur la ligne de la gouttière (§49.6).
 */
function withWrittenContext(item: PurchaseItem, needs: readonly OwnedNeed[], plan: QuotePlan, view: ArtisanView): PurchaseItem {
  const own = needs.filter((n) => item.needIds.includes(n.needId));
  let out = item;
  if (out.lineIds.length === 0) {
    const lines = own.flatMap((n) => plan.inputs.find((i) => i.workItemId === n.workItemId)?.cited?.filter((c) => c.slot === n.slot).map((c) => c.line) ?? []);
    if (lines.length > 0) out = { ...out, lineIds: [...new Set(lines)] };
  }
  const writes = own
    .map((n) => plan.lines.find((l) => l.status === "planned" && l.workItemId === n.workItemId && l.slot === n.slot))
    .find((l) => l !== undefined);
  const text = writes ? view.ouvrages.find((o) => o.lineId === writes.ref)?.designation : undefined;
  const included = text ? /\b(y compris [^).;]+)/i.exec(text)?.[1]?.trim() : undefined;
  if (included && !norm(out.precision ?? "").includes(norm(included))) out = { ...out, precision: [out.precision, included].filter(Boolean).join(" ; ") };
  return out;
}

/** « Le devis dit 20, le calcul donne 21 » → les deux valeurs, pour « Garder 20 » / « Mettre 21 » (§49.8). */
function gapValues(gap: RuleToConfirm, unit: string): PurchaseItem["gap"] | null {
  const m = /^Le devis dit ([\d  ,.]+?)(?: [^\d,]+)?, le calcul donne ([\d  ,.]+?)(?: [^\d(]+)?(?: \(|$)/.exec(gap.text);
  return m ? { written: m[1]!.trim(), computed: m[2]!.trim(), unit } : null;
}

/** Clé de la confirmation d'une quantité calculée avec une règle « à vérifier » (§47.3). */
export const RATIO = "ratio:";

/**
 * La liste peut partir : elle n'est pas vide, aucune question n'est ouverte (ligne douteuse ou question du calcul),
 * chaque ligne est prête. Dans tous les métiers (retour du fondateur, 2026-10-05). Les « Quantité à confirmer »
 * bloquent à part (`applyRuleConfirmations`).
 */
function sendable(toBuy: readonly PurchaseItem[], toQuote: readonly ToQuoteItem[], questions: readonly Decision[]): boolean {
  return toBuy.length + toQuote.length > 0 && questions.every((q) => q.lineIds.length === 0 && !q.question) && toBuy.every((b) => b.state === "ready");
}

/** « Quantité à confirmer : colle 4 kg/m², pertes 10 % » (§47.3). */
export function toConfirmText(rules: readonly RuleToConfirm[]): string {
  // Les règles chiffrées d'abord (« 2 rails par cloison », « longueur de 3 m ») ; le nom seul d'un calcul n'est dit qu'à défaut.
  // Une règle sans nom (le calcul lui-même) n'est pas dite : sa valeur l'est par les règles chiffrées qu'il emploie.
  const unique = rules.filter((r, i) => r.text && rules.findIndex((x) => x.text === r.text) === i);
  // Une phrase entière (§49 : l'écart avec le devis, l'info manquante, le défaut à confirmer) se dit telle quelle, en premier.
  const sentences = unique.filter((r) => r.said).map((r) => r.text);
  const said = unique.filter((r) => !r.said);
  const rulesText = said.length > 0 ? `Quantité à confirmer : ${said.map((r) => (r.conflict ? `${r.text} (sources en désaccord)` : r.text)).join(", ")}` : null;
  const all = [...sentences, ...(rulesText ? [rulesText] : [])];
  return all.length > 0 ? all.join(". ") : "Quantité à confirmer";
}

/**
 * §47.4 et §47.5 : quand une règle « à vérifier » passe VALIDÉE (réponse du fondateur, 2026-10-05). Une entreprise ne
 * compte qu'une fois par règle, sous sa preuve la plus forte (un bon de commande l'emporte sur l'écran). Validée par
 * trois confirmations d'écran de trois entreprises différentes, OU deux bons de commande de deux entreprises
 * différentes, OU un bon de commande plus une confirmation d'une autre entreprise. Un bon de commande seul ne valide pas.
 */
export function ruleValidatedBy(companies: { screen: number; order: number }): boolean {
  return companies.screen >= 3 || companies.order >= 2 || (companies.order >= 1 && companies.screen >= 1);
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
    const pending = (item.rules ?? []).filter((r) => r.local || !validated.has(r.key));
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
      // Une ligne orange sans question ouverte (« Info manquante » close au calcul) se lève aussi d'un « C'est bon ».
      const d = r.itemKey && (r.status === "ok" || !r.decisionKey) ? byItem.get(r.itemKey) : undefined;
      return d ? { ...r, status: "check", decisionKey: d.key, reason: d.text } : r;
    }),
  }));
  const rows = groups.flatMap((g) => g.rows);
  const screen = { groups, total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  return { ...purchase, toBuy, questions: [...purchase.questions, ...decisions], canValidate: false, screen };
}
