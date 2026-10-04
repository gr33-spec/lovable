import { Decimal } from "../shared/decimal.js";
import { evaluateInterval, FormulaError, formulaVariables, parseFormula, type IntervalValue } from "./expression.js";
import type { Fact, LookupTable, NeedRule, ParamDef, PointTable, Product, Referential, SellingUnit, Source, WorkItemType } from "./model.js";
import { parseRefUnit, sameDim, isAngleUnit, percentSlopeToDegrees } from "./units.js";

/**
 * Moteur de quantitatif : ouvrage du devis → besoins matériaux → lignes
 * d'achat. Tout nombre vient d'ici, calculé à partir de données sourcées et
 * vérifiées ; l'IA n'en fournit aucun.
 *
 * Trois issues seulement, pour chaque besoin :
 *  - « calculated » : BatiClair sait, et montre son calcul ;
 *  - « question »   : il manque UNE information, BatiClair la demande ;
 *  - « unknown »    : il ne sait pas, et le dit (jamais de valeur inventée).
 */

/** Valeur d'un paramètre, avec son origine (pour « Voir le calcul »). */
export interface ParamValue {
  value: string;
  unit: string;
  origin: "devis" | "artisan";
  /** Ce qui la justifie (« Devis, ligne 4 »). */
  evidence?: string;
}

export interface SlotChoice {
  productId: string;
  /**
   * « devis » : référence ou modèle écrit sans ambiguïté ; « artisan » :
   * choisi ou confirmé par l'artisan ; « alias » : reconnu par une
   * appellation, à faire confirmer avant de calculer.
   */
  origin: "devis" | "artisan" | "alias";
}

/**
 * HYPOTHÈSE utilisée par le calcul (donnée par défaut du référentiel ou
 * produit par défaut), dite à l'artisan en une ligne et modifiable : la clé
 * est celle de la réponse qui la remplace (« param:pente », « product:liteau »).
 */
export interface Assumption {
  key: string;
  label: string;
  value: string;
  unit: string;
  /** Pourquoi cette valeur (« Pente moyenne d'une toiture »). */
  note?: string;
  /** Réponses proposées en boutons. */
  choices?: { label: string; value: string }[];
}

/**
 * Préférences de l'ENTREPRISE (apprises de ses réponses, modifiables).
 * Jamais une donnée fabricant ni une règle technique : elles ne font que
 * choisir à la place d'une question (« mon écran habituel »).
 */
export interface CompanyPreferences {
  /** Produit habituel ÉTABLI, par emplacement (« ecran ») ou par famille (« underlay ») : utilisé sans question. */
  products?: Record<string, string>;
  /**
   * Produit habituel PAS ENCORE ÉTABLI (en essai, périmé, contredit récemment) :
   * proposé à l'artisan en une question (« Votre écran habituel : X ? »), jamais
   * utilisé en silence.
   */
  proposals?: Record<string, string>;
  /** Marge habituelle (« 5 » = 5 %), par produit ou par famille. */
  waste?: Record<string, string>;
  /**
   * Habitude ÉTABLIE sur un paramètre d'entreprise (« faconnage » = « 1 » : je façonne), apprise à la
   * deuxième confirmation sur deux chantiers différents : la question n'est plus posée, l'habitude est dite.
   */
  params?: Record<string, string>;
}

export interface WorkItemInput {
  workItemId: string;
  params: Record<string, ParamValue>;
  products: Record<string, SlotChoice>;
  /** Emplacements que le devis cite explicitement (« liteaux » écrits sur le devis). */
  mentioned: string[];
  preferences?: CompanyPreferences;
  /** Emplacements où l'artisan a dit « aucun de ces modèles » : ni produit lu, ni produit par défaut. */
  declined?: string[];
}

export interface EngineOptions {
  /**
   * Accepter les données en brouillon : réservé à l'écran de vérification
   * du référentiel (le validateur voit le calcul « provisoire »). Jamais
   * pour un artisan.
   */
  acceptDraft?: boolean;
}

export interface Question {
  /** Clé stable : la même question n'est posée qu'une fois pour tout l'ouvrage. */
  key: string;
  /** « choose » : un choix simple entre des lectures (« 6 ardoises » ou « 6 jouées »). */
  kind: "confirm_product" | "choose_product" | "param" | "choose";
  text: string;
  hint?: string;
  unit?: string;
  options?: { label: string; value: string }[];
  /** Pourquoi elle compte : « De 1 191 à 1 445 pièces selon la réponse ». */
  impact?: string;
}

/**
 * D'où vient un élément du calcul. Quatre natures, jamais mélangées :
 *  - « devis »       : lu dans le devis du client ;
 *  - « referential » : BatiClair sait (référentiel sourcé et vérifié) ;
 *  - « company »     : votre entreprise utilise habituellement (préférence apprise) ;
 *  - « project »     : choisi ou répondu par l'artisan pour CE chantier ;
 *  - « assumption »  : hypothèse par défaut du référentiel (dite, modifiable).
 */
export type Origin = "devis" | "referential" | "company" | "project" | "assumption";

export interface TraceLine {
  label: string;
  value: string;
  unit: string;
  /** Nature de la donnée (voir Origin) ; absente pour un élément sans effet (donnée inconnue sans effet). */
  origin?: Origin;
  /** Provenance lisible : « Devis, ligne 4 », « Fiche Edilians (vérifiée le 02/10/2026) ». */
  from: string;
  /** La valeur telle qu'on la dit (« III » pour la région ardoise 3), quand elle diffère de `value`. */
  shown?: string;
  /** Valeur approchée faute de table officielle (dite « estimation »). */
  estimation?: boolean;
  verified: boolean;
  url?: string;
}

/**
 * Ce qui bloque, en clair et rangé par nature : c'est la liste de ce qu'il
 * faut documenter (fiche fabricant, conditionnement, règle) pour que
 * BatiClair sache la prochaine fois.
 */
export interface MissingData {
  kind: "rule" | "product" | "product_data" | "packaging" | "constant";
  /** « Espacement maximal », « Règle de calcul : contre-liteaux », « Conditionnement ». */
  label: string;
  workItemId: string;
  slot: string;
  family: string;
  productId?: string;
  /** Caractéristique attendue (« espacement_max »). */
  attribute?: string;
  /** Source déclarée (en attente de vérification), s'il y en a une. */
  sourceId?: string;
}

export interface PurchaseQuantity {
  count: string;
  unit: { one: string; many: string };
}

export interface NeedResult {
  needId: string;
  slot: string;
  family: string;
  /** Nom court (« Liteaux 27×40 ») ou, sans produit, le nom de l'emplacement. */
  label: string;
  /** Nom de l'emplacement (« Contre-liteaux »), même quand le produit est connu. */
  slotLabel: string;
  /** « explicit » : cité par le devis ; « deduced » : cœur de l'ouvrage ; « suggested » : à confirmer. */
  origin: "explicit" | "deduced" | "suggested";
  status: "calculated" | "question" | "unknown";
  /** Besoin exact, marge comprise, dans l'unité du besoin (arrondi au centième). */
  quantity?: { value: string; unit: string };
  /**
   * Besoin connu à une fourchette près (donnée inconnue SANS effet sur la
   * commande) : la commande, elle, est exacte.
   */
  quantityRange?: { min: string; max: string; unit: string };
  /** Quantité à commander (arrondie au supérieur) et ordres de grandeur. */
  purchase?: { order: PurchaseQuantity; approx: PurchaseQuantity[] };
  /** Besoin juste, mais conversion en unité de vente impossible (conditionnement pas encore vérifié). */
  purchaseUnavailable?: string;
  question?: Question;
  /** Pourquoi BatiClair ne sait pas (« unknown »). */
  reason?: string;
  /** Ce qu'il faut documenter pour débloquer le besoin (« unknown ») ou sa conversion en unités de vente. */
  missing?: MissingData;
  /** Calcul fait avec au moins une donnée en brouillon (option acceptDraft). */
  provisional: boolean;
  /** Hypothèses par défaut utilisées (dites à l'artisan, modifiables). */
  assumptions: Assumption[];
  /** D'où vient le produit retenu : écrit au devis, reconnu par appellation, choisi pour le chantier, préférence de l'entreprise, par défaut. */
  /** « declined » : aucun des modèles proposés ne convenait ; le générique compte, le fournisseur met sa marque. */
  productOrigin?: "devis" | "alias" | "artisan" | "preference" | "proposal" | "default" | "declined";
  /** Préférence de l'entreprise écartée (produit absent, autre famille…) : la vérification normale a repris. */
  preferenceIgnored?: string;
  formula?: string;
  exclusions?: string;
  /** Colonne « précision » de la demande de devis (§45.3). */
  precision?: string;
  trace: TraceLine[];
}

export interface WorkItemResult {
  workItemId: string;
  referentialVersion: string;
  needs: NeedResult[];
  /**
   * La prochaine question (une seule à la fois) : celle qui débloque le
   * plus de besoins cités par le devis. Jamais pour un besoin seulement
   * suggéré (« À confirmer » suffit).
   */
  nextQuestion: Question | null;
}

class Stop extends Error {
  constructor(
    readonly outcome: { status: "question"; question: Question } | { status: "unknown"; reason: string; missing?: MissingData },
  ) {
    super("stop");
  }
}

/** « 1 305,43 » : à la française, milliers séparés (texte montré à l'artisan). */
const fr = (d: Decimal, places = 2) => {
  const [int, dec] = d.toDecimalPlaces(places).toFixed().split(".");
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${dec ? `,${dec}` : ""}`;
};

/** Ce dont une règle a besoin pour être déterministe, rangé par nature (jamais mélangé). */
export interface RequiredInputs {
  /** Produits à identifier (emplacements). */
  products: { slot: string; label: string }[];
  /** Données du chantier et préférences de l'artisan (paramètres). */
  params: { key: string; label: string; kind: "site_data" | "artisan_preference" }[];
  /** Caractéristiques fabricant citées. */
  manufacturerSpecs: { slot: string; key: string; label: string }[];
  /** Conditions de pose citées. */
  installationConditions: string[];
  /** Conditionnement de l'unité de commande du produit. */
  packaging: true;
}

/**
 * Liste exacte des données dont une règle a besoin. Sans l'une d'elles, le
 * moteur ne calcule pas : il la lit dans le devis, ou la demande. Aucune
 * valeur par défaut, aucun choix à la place de l'artisan.
 */
export function requiredInputs(ref: Referential, workItemId: string, needId: string): RequiredInputs {
  const work = ref.workItems.find((w) => w.id === workItemId);
  const rule = work?.needs.find((n) => n.id === needId);
  if (!work || !rule) throw new Error(`Besoin inconnu : ${workItemId}/${needId}`);
  const vars = new Set(formulaVariables(parseFormula(rule.formula)));
  // Une valeur intermédiaire ou une table cite d'autres données : elles font partie du besoin.
  for (let grew = true; grew; ) {
    grew = false;
    for (const v of [...vars]) {
      const derived = work.derived?.find((d) => d.key === v);
      const table = v.startsWith("table.") ? work.tables?.[v.slice("table.".length)] : undefined;
      const other = v.startsWith("commande.") ? work.needs.find((n) => n.id === v.slice("commande.".length)) : undefined;
      const pts = v.startsWith("points.") ? work.points?.[v.slice("points.".length)] : undefined;
      const more = derived || other
        ? formulaVariables(parseFormula((derived ?? other)!.formula))
        : table
          ? table.axes.map((a) => a.param)
          : pts
            ? [...pts.keys.map((k) => k.variable), ...formulaVariables(parseFormula(pts.otherwise))]
            : [];
      for (const m of more) if (!vars.has(m)) (vars.add(m), (grew = true));
    }
  }
  // Les bornes d'un paramètre utilisé (pureau entre mini et maxi de la fiche) font partie des données requises.
  for (const p of work.params) if (vars.has(p.key) && p.range) [p.range.min, p.range.max].forEach((v) => vars.add(v));
  const isSpec = (v: string) => v.includes(".") && !v.startsWith("regle.") && !v.startsWith("table.") && !v.startsWith("commande.") && !v.startsWith("points.");
  const slotKeys = new Set([rule.slot, ...[...vars].filter(isSpec).map((v) => v.split(".")[0]!)]);
  return {
    products: work.slots.filter((s) => slotKeys.has(s.key)).map((s) => ({ slot: s.key, label: s.label })),
    params: work.params.filter((p) => vars.has(p.key)).map((p) => ({ key: p.key, label: p.label, kind: p.kind })),
    manufacturerSpecs: [...vars]
      .filter(isSpec)
      .map((v) => {
        const [slot, key] = v.split(".") as [string, string];
        const family = ref.families.find((f) => f.code === work.slots.find((s) => s.key === slot)?.family);
        return { slot, key, label: family?.attributes.find((a) => a.key === key)?.label ?? key };
      }),
    installationConditions: [...vars].filter((v) => v.startsWith("regle.")).map((v) => v.slice("regle.".length)),
    packaging: true,
  };
}

export function computeWorkItem(ref: Referential, input: WorkItemInput, options: EngineOptions = {}): WorkItemResult {
  const work = ref.workItems.find((w) => w.id === input.workItemId);
  if (!work) throw new Error(`Ouvrage inconnu du référentiel : ${input.workItemId}`);
  const sources = new Map(ref.sources.map((s) => [s.id, s]));
  // Un besoin qui exige une donnée que rien ne donne (ni devis, ni réponse, ni hypothèse) n'existe pas pour ce chantier.
  const known = (key: string) => input.params[key] !== undefined || work.params.find((p) => p.key === key)?.default !== undefined;
  // Dans l'ordre : un besoin peut partir de la commande d'un besoin précédent (« commande.ardoises »).
  const done = new Map<string, Earlier>();
  // Condition d'existence d'un besoin (« faconnage < 2 ») : jugée sur les données connues (réponse, devis,
  // hypothèse fixe) ; une donnée encore inconnue laisse le besoin exister, et il posera sa question.
  const applies = (rule: NeedRule): boolean => {
    if (!rule.when) return true;
    const expr = parseFormula(rule.when);
    const values = new Map<string, IntervalValue>();
    for (const name of formulaVariables(expr)) {
      // Une constante sourcée de l'ouvrage (« regle.rampant_max_bac ») : un seuil de la condition.
      if (name.startsWith("regle.")) {
        const c = work.constants?.[name.slice("regle.".length)];
        if (!c) throw new FormulaError(`Condition du besoin ${rule.id} : constante inconnue ${name}`);
        const u = parseRefUnit(c.unit);
        values.set(name, point(new Decimal(c.value).times(u.factor), u.dim));
        continue;
      }
      const def = work.params.find((p) => p.key === name);
      if (!def) throw new FormulaError(`Condition du besoin ${rule.id} : variable inconnue ${name}`);
      const factor = parseRefUnit(def.unit);
      const given = input.params[name];
      const raw = given ? given.value : def.default?.value;
      // Donnée inconnue : toutes les valeurs restent possibles ; le besoin existe si la condition PEUT être vraie
      // (il posera alors sa question), et n'existe pas si elle est fausse quoi qu'il arrive.
      if (raw === undefined) {
        values.set(name, { lo: new Decimal(-Infinity), hi: new Decimal(Infinity), dim: factor.dim });
        continue;
      }
      values.set(name, point(new Decimal(raw).times(given ? parseRefUnit(given.unit).factor : factor.factor), factor.dim));
    }
    const v = evaluateInterval(expr, (name) => values.get(name)!);
    return !v.hi.isZero();
  };
  const needs = work.needs
    .filter((rule) => (rule.requires ?? []).every(known) && applies(rule))
    .map((rule) => {
      let exact: IntervalValue | undefined;
      const result = computeNeed(ref, work, rule, input, sources, options, done, (v) => (exact = v));
      done.set(rule.id, { result, ...(exact ? { exact } : {}) });
      return result;
    });
  // La question qui débloque le plus de besoins demandés par le devis (à égalité : la première).
  const asked = needs.filter((n) => n.question && n.origin !== "suggested").map((n) => n.question!);
  const count = (key: string) => asked.filter((q) => q.key === key).length;
  const nextQuestion = asked.reduce<Question | null>((best, q) => (!best || count(q.key) > count(best.key) ? q : best), null);
  return { workItemId: work.id, referentialVersion: ref.version, needs, nextQuestion };
}

/**
 * Tout le CHANTIER : chaque ouvrage calculé, et une seule prochaine question
 * pour l'ensemble (celle qui débloque le plus de besoins demandés par le
 * devis ; une même question n'est posée qu'une fois, même si plusieurs
 * ouvrages en ont besoin).
 */
export function computeChantier(
  ref: Referential,
  inputs: WorkItemInput[],
  options: EngineOptions = {},
): { workItems: WorkItemResult[]; nextQuestion: Question | null; questionsPending: string[] } {
  const workItems = inputs.map((i) => computeWorkItem(ref, i, options));
  const asked = workItems.flatMap((w) => w.needs.filter((n) => n.question && n.origin !== "suggested").map((n) => n.question!));
  const count = (key: string) => asked.filter((q) => q.key === key).length;
  const nextQuestion = asked.reduce<Question | null>((best, q) => (!best || count(q.key) > count(best.key) ? q : best), null);
  return { workItems, nextQuestion, questionsPending: [...new Set(asked.map((q) => q.key))] };
}

function provenanceLine(p: { source: string; verification: { status: string; verifiedAt?: string } }, sources: Map<string, Source>): Pick<TraceLine, "from" | "verified" | "url"> {
  const s = sources.get(p.source);
  const verified = p.verification.status === "verified";
  const when = verified && p.verification.verifiedAt ? `, vérifiée le ${p.verification.verifiedAt}` : verified ? "" : ", en attente de vérification";
  return { from: `${s?.title ?? p.source}${when}`, verified, ...(s?.url ? { url: s.url } : {}) };
}

const point = (value: Decimal, dim: IntervalValue["dim"]): IntervalValue => ({ lo: value, hi: value, dim });
/** Un besoin déjà calculé de l'ouvrage, et sa valeur exacte après marge (pour « commande.<besoin> »). */
type Earlier = { result: NeedResult; exact?: IntervalValue };

/** « III » pour la région ardoise 3 : la valeur dite, quand le référentiel en donne une. */
const displayed = (def: ParamDef, raw: string | undefined): { shown?: string } => {
  if (!def.display || raw === undefined) return {};
  const hit = Object.entries(def.display).find(([k]) => /^-?\d+(\.\d+)?$/.test(raw) && new Decimal(k).equals(new Decimal(raw)));
  return hit ? { shown: hit[1] } : {};
};
const isPoint = (v: IntervalValue) => v.lo.equals(v.hi);

function computeNeed(
  ref: Referential,
  work: WorkItemType,
  rule: NeedRule,
  input: WorkItemInput,
  sources: Map<string, Source>,
  options: EngineOptions,
  earlier: ReadonlyMap<string, Earlier> = new Map(),
  /** Reçoit le besoin exact après marge (dans l'unité du besoin), pour un besoin suivant qui en part. */
  onNeed: (need: IntervalValue) => void = () => {},
): NeedResult {
  const slot = work.slots.find((s) => s.key === rule.slot)!;
  let preferenceIgnored: string | undefined;
  const productFor = (slotKey: string): { product: Product; choice: SlotChoice | { origin: "preference" | "proposal" | "default" | "declined" } } | undefined => {
    const chosen = input.products[slotKey];
    if (chosen) {
      const p = ref.products.find((x) => x.id === chosen.productId);
      return p ? { product: p, choice: chosen } : undefined;
    }
    // Pas sur le devis : le produit habituel de l'entreprise évite la question (établi) ou la simplifie (à reconfirmer).
    // Il ne passe JAMAIS outre le référentiel : un produit inconnu ou d'une autre famille est écarté.
    const slotDef = work.slots.find((s) => s.key === slotKey);
    const family = slotDef?.family;
    for (const kind of ["preference", "proposal"] as const) {
      const map = kind === "preference" ? input.preferences?.products : input.preferences?.proposals;
      const preferred = map?.[slotKey] ?? (family ? map?.[family] : undefined);
      if (!preferred) continue;
      const p = ref.products.find((x) => x.id === preferred);
      if (p && p.family === family) return { product: p, choice: { origin: kind } };
      if (slotKey === slot.key) {
        preferenceIgnored = p
          ? `Produit habituel « ${p.shortLabel} » écarté : ce n'est pas un produit de cette famille.`
          : `Produit habituel écarté : il n'est plus au référentiel.`;
      }
    }
    // Rien de nommé, pas d'habitude : le produit par défaut du référentiel (pratique validée), dit comme hypothèse.
    // L'artisan a répondu « aucun de ces modèles » : le moteur calcule QUAND MÊME avec le générique de la famille
    // (« modèle à préciser » : le fournisseur met sa marque), au lieu de renvoyer la ligne à chiffrer. Le fournisseur
    // ne chiffre que ce que le référentiel ne sait pas compter.
    const usual = slotDef?.usual?.productId ? ref.products.find((x) => x.id === slotDef.usual!.productId) : undefined;
    if (usual && usual.family === family) {
      if (!input.declined?.includes(slotKey)) return { product: usual, choice: { origin: "default" } };
      if (usual.generic) return { product: usual, choice: { origin: "declined" } };
    }
    return undefined;
  };
  const resolved = productFor(slot.key);
  const product = resolved?.product;
  const origin: NeedResult["origin"] = input.mentioned.includes(slot.key) ? "explicit" : rule.core ? "deduced" : "suggested";
  const trace: TraceLine[] = [];
  const assumptions: Assumption[] = [];
  const assume = (a: Assumption) => {
    if (!assumptions.some((x) => x.key === a.key)) assumptions.push(a);
  };
  let provisional = false;
  const base = {
    needId: rule.id,
    slot: slot.key,
    family: slot.family,
    label: product ? (resolved?.choice.origin === "declined" ? `${product.shortLabel} (modèle à préciser)` : product.shortLabel) : slot.label,
    slotLabel: slot.label,
    origin,
    ...(resolved ? { productOrigin: resolved.choice.origin } : {}),
    ...(preferenceIgnored ? { preferenceIgnored } : {}),
    formula: rule.formula,
    ...(rule.exclusions ? { exclusions: rule.exclusions } : {}),
  };

  const gap = (m: Omit<MissingData, "workItemId" | "slot" | "family">): MissingData => ({ workItemId: work.id, slot: slot.key, family: slot.family, ...m });
  /** Une donnée du référentiel n'est utilisable que vérifiée (ou en brouillon, sur l'écran du validateur). */
  const useFact = (label: string, fact: Fact, missing: Omit<MissingData, "workItemId" | "slot" | "family" | "label" | "sourceId">): IntervalValue => {
    const blocked = (reason: string) => new Stop({ status: "unknown", reason, missing: gap({ ...missing, label, sourceId: fact.source }) });
    if (fact.verification.status === "deprecated") throw blocked(`Donnée retirée du référentiel : ${label}.`);
    if (fact.verification.status === "draft") {
      if (!options.acceptDraft) throw blocked(`Donnée en attente de vérification : ${label} (${sources.get(fact.source)?.title ?? fact.source}).`);
      provisional = true;
    }
    const unit = parseRefUnit(fact.unit);
    trace.push({ label, value: fact.value.replace(".", ","), unit: fact.unit, origin: "referential", ...provenanceLine(fact, sources) });
    return point(new Decimal(fact.value).times(unit.factor), unit.dim);
  };

  try {
    if (rule.verification.status !== "verified") {
      if (rule.verification.status === "deprecated" || !options.acceptDraft) {
        throw new Stop({
          status: "unknown",
          // La source détaillée va dans « missing » (liste à documenter) ; l'artisan lit une phrase courte.
          reason: "Règle de calcul en attente de vérification.",
          missing: gap({ kind: "rule", label: `Règle de calcul : ${slot.label.toLowerCase()}`, sourceId: rule.source }),
        });
      }
      provisional = true;
    }

    // 1. Le produit : écrit sur le devis, confirmé, ou habituel ; sinon UNE question.
    //    Si la règle n'utilise AUCUNE caractéristique du produit (2 descentes × 4 m = 8 m de tube),
    //    le besoin se calcule quand même : seule la conversion en unités de vente attend le produit.
    const usesProduct = formulaVariables(parseFormula(rule.formula)).some((v) => v.startsWith(`${slot.key}.`));
    if (!product && usesProduct) {
      const candidates = ref.products.filter((p) => p.family === slot.family);
      if (candidates.length === 0) {
        throw new Stop({ status: "unknown", reason: `Calcul impossible sans les données du produit (${slot.label}).`, missing: gap({ kind: "product", label: slot.label }) });
      }
      throw new Stop({
        status: "question",
        question: {
          key: `product:${slot.key}`,
          kind: "choose_product",
          text: `Quel produit pour : ${slot.label.toLowerCase()} ?`,
          options: candidates.map((p) => ({ label: p.shortLabel, value: p.id })),
        },
      });
    }
    if (product && resolved?.choice.origin === "alias") {
      throw new Stop({
        status: "question",
        question: {
          key: `product:${slot.key}`,
          kind: "confirm_product",
          text: `J'ai identifié : ${product.shortLabel}. C'est bien ce modèle ?`,
          options: [
            { label: "Oui", value: product.id },
            { label: "Modifier", value: "" },
          ],
        },
      });
    }
    if (product && resolved?.choice.origin === "proposal") {
      throw new Stop({
        status: "question",
        question: {
          key: `product:${slot.key}`,
          kind: "confirm_product",
          text: `${slot.label} habituel de votre entreprise : ${product.shortLabel}. On le garde pour ce chantier ?`,
          options: [
            { label: "Oui", value: product.id },
            { label: "Modifier", value: "" },
          ],
        },
      });
    }
    if (product && resolved) {
      const o = resolved.choice.origin;
      if (o === "default") {
        const usual = slot.usual!;
        trace.push({ label: "Produit", value: product.shortLabel, unit: "", from: `Par défaut : ${usual.text}`, origin: "assumption", verified: true });
        assume({ key: `product:${slot.key}`, label: slot.label, value: product.shortLabel, unit: "", note: usual.text });
      } else if (o === "declined") {
        // Pas d'hypothèse à re-poser : l'artisan a déjà dit qu'aucun modèle proposé ne convenait.
        trace.push({ label: "Produit", value: `${product.shortLabel} (modèle à préciser)`, unit: "", from: "Aucun des modèles proposés ne convient : le fournisseur propose le sien pour cette quantité", origin: "project", verified: true });
      } else {
        trace.push({
          label: "Produit",
          value: product.shortLabel,
          unit: "",
          from: o === "preference" ? "Préférence de votre entreprise" : o === "artisan" ? "Votre choix pour ce chantier" : "Devis",
          origin: o === "preference" ? "company" : o === "artisan" ? "project" : "devis",
          verified: true,
        });
      }
    }

    // 2. Les valeurs de la formule. Une donnée de chantier inconnue n'est pas devinée :
    //    elle prend TOUTES ses valeurs admissibles (intervalle), et on regarde si la commande change.
    const expr = parseFormula(rule.formula);
    const missing: { key: string; label: string; question: Question }[] = [];
    const derivedCache = new Map<string, IntervalValue>();
    const valueOf = (name: string): IntervalValue => {
      const [head, attr] = name.split(".");
      if (attr !== undefined) {
        if (head === "table") {
          const table = work.tables?.[attr];
          if (!table) throw new Stop({ status: "unknown", reason: `Table absente du référentiel : ${attr}.`, missing: gap({ kind: "constant", label: attr.replace(/_/g, " "), attribute: attr }) });
          return useTable(attr, table);
        }
        if (head === "points") {
          const pts = work.points?.[attr];
          if (!pts) throw new Stop({ status: "unknown", reason: `Table absente du référentiel : ${attr}.`, missing: gap({ kind: "constant", label: attr.replace(/_/g, " "), attribute: attr }) });
          return usePoints(pts);
        }
        if (head === "commande") {
          const other = earlier.get(attr)?.result;
          const exactOther = earlier.get(attr)?.exact;
          const otherRule = work.needs.find((n) => n.id === attr);
          if (!other || !otherRule) throw new Stop({ status: "unknown", reason: `Calcul impossible : il part d'un autre besoin non calculé (${attr}).` });
          // Les ardoises attendent une réponse : les crochets aussi, avec la même question.
          if (other.status === "question" && other.question) throw new Stop({ status: "question", question: other.question });
          if (other.status !== "calculated" || !exactOther) throw new Stop({ status: "unknown", reason: `Calcul impossible tant que « ${other.slotLabel.toLowerCase()} » n'est pas calculé.` });
          const unit = parseRefUnit(otherRule.unit);
          // La valeur exacte, arrondie à l'unité comme la commande (jamais la valeur affichée, arrondie au centième).
          const lo = exactOther.lo.ceil();
          const hi = exactOther.hi.ceil();
          trace.push({
            label: `${other.slotLabel} après marge`,
            value: lo.equals(hi) ? fr(lo, 0) : `${fr(lo, 0)} à ${fr(hi, 0)}`,
            unit: otherRule.unit,
            from: "Calcul ci-dessus",
            verified: true,
          });
          return { lo: lo.times(unit.factor), hi: hi.times(unit.factor), dim: unit.dim };
        }
        if (head === "regle") {
          const fact = work.constants[attr];
          if (!fact) throw new Stop({ status: "unknown", reason: `Constante absente du référentiel : ${attr}.`, missing: gap({ kind: "constant", label: attr.replace(/_/g, " "), attribute: attr }) });
          return useFact(attr.replace(/_/g, " "), fact, { kind: "constant", attribute: attr });
        }
        const p = productFor(head!)?.product;
        const family = ref.families.find((f) => f.code === work.slots.find((s) => s.key === head)?.family);
        const def = family?.attributes.find((a) => a.key === attr);
        const fact = p?.attributes[attr];
        if (!p || !fact) {
          throw new Stop({
            status: "unknown",
            reason: `Calcul impossible sans « ${def?.label ?? attr} » de ${p?.shortLabel ?? head}.`,
            missing: gap({ kind: "product_data", label: def?.label ?? attr, attribute: attr, ...(p ? { productId: p.id } : {}) }),
          });
        }
        return useFact(`${def?.label ?? attr} (${p.shortLabel})`, fact, { kind: "product_data", attribute: attr, productId: p.id });
      }
      const derived = work.derived?.find((d) => d.key === name);
      if (derived) {
        const cached = derivedCache.get(name);
        if (cached) return cached;
        if (derived.verification.status !== "verified") {
          if (derived.verification.status === "deprecated" || !options.acceptDraft) {
            throw new Stop({ status: "unknown", reason: "Règle de calcul en attente de vérification.", missing: gap({ kind: "rule", label: `Règle : ${derived.label.toLowerCase()}`, sourceId: derived.source }) });
          }
          provisional = true;
        }
        const unit = parseRefUnit(derived.unit);
        const v = evaluateInterval(parseFormula(derived.formula), valueOf);
        if (!sameDim(v.dim, unit.dim)) throw new FormulaError(`La valeur ${derived.key} ne donne pas des ${derived.unit}`);
        derivedCache.set(name, v);
        const shown = (x: Decimal) => fr(x.dividedBy(unit.factor));
        trace.push({ label: derived.label, value: isPoint(v) ? shown(v.lo) : `${shown(v.lo)} à ${shown(v.hi)}`, unit: derived.unit, origin: "referential", ...provenanceLine(derived, sources) });
        if (derived.shown && isPoint(v)) assume({ key: `derived:${derived.key}`, label: derived.label, value: shown(v.lo), unit: derived.unit });
        return v;
      }
      const def = work.params.find((p) => p.key === name);
      if (!def) throw new FormulaError(`Variable inconnue : ${name}`);
      const expected = parseRefUnit(def.unit);
      const bounds = def.range ? { min: valueOf(def.range.min), max: valueOf(def.range.max) } : null;
      const given = input.params[name];
      if (!given && def.default) return useDefault(def, def.default, expected);
      if (!given) {
        if (!missing.some((m) => m.key === name)) {
          missing.push({
            key: name,
            label: def.label,
            question: { key: `param:${name}`, kind: "param", text: def.question, unit: def.unit, ...(def.hint ? { hint: def.hint } : {}), ...(def.choices ? { options: def.choices } : {}) },
          });
        }
        return bounds ? { lo: bounds.min.lo, hi: bounds.max.hi, dim: expected.dim } : { lo: new Decimal(-Infinity), hi: new Decimal(Infinity), dim: expected.dim };
      }
      // Une pente donnée en % (devis, ancienne réponse) est lue en degrés : la pente est en degrés partout.
      const read = isAngleUnit(def.unit) && given.unit.trim() === "%" ? { value: percentSlopeToDegrees(new Decimal(given.value)).toString(), unit: def.unit } : given;
      const unit = parseRefUnit(read.unit);
      if (!sameDim(unit.dim, expected.dim)) throw new Stop({ status: "unknown", reason: `${def.label} : unité « ${given.unit} » incompatible (attendu ${def.unit}).` });
      const value = new Decimal(read.value).times(unit.factor);
      if (bounds && (value.lessThan(bounds.min.lo) || value.greaterThan(bounds.max.hi))) {
        throw new Stop({
          status: "question",
          question: {
            key: `param:${name}`,
            kind: "param",
            text: `${def.label} hors des valeurs de la fiche : pouvez-vous vérifier ?`,
            unit: def.unit,
            hint: `Entre ${fr(bounds.min.lo.dividedBy(expected.factor))} et ${fr(bounds.max.hi.dividedBy(expected.factor))} ${def.unit}.`,
          },
        });
      }
      trace.push({
        label: def.label,
        value: read.value.replace(".", ","),
        unit: read.unit,
        ...displayed(def, read.value),
        ...(def.estimate ? { estimation: true } : {}),
        from: given.evidence ?? (given.origin === "devis" ? "Devis" : "Votre réponse"),
        origin: given.origin === "devis" ? "devis" : "project",
        verified: true,
      });
      return point(value, unit.dim);
    };
    /** Hypothèse par défaut : une valeur fixe ou une formule, tracée et dite à l'artisan. */
    function useDefault(def: ParamDef, d: NonNullable<ParamDef["default"]>, expected: ReturnType<typeof parseRefUnit>): IntervalValue {
      if (d.verification.status !== "verified") {
        if (d.verification.status === "deprecated" || !options.acceptDraft) {
          throw new Stop({ status: "unknown", reason: `Hypothèse par défaut en attente de vérification : ${def.label.toLowerCase()}.`, missing: gap({ kind: "constant", label: `Hypothèse : ${def.label}`, sourceId: d.source }) });
        }
        provisional = true;
      }
      const cached = derivedCache.get(`default:${def.key}`);
      if (cached) return cached;
      let v: IntervalValue;
      if (d.formula) {
        v = evaluateInterval(parseFormula(d.formula), valueOf);
        if (!sameDim(v.dim, expected.dim)) throw new FormulaError(`L'hypothèse ${def.key} ne donne pas des ${def.unit}`);
      } else {
        v = point(new Decimal(d.value ?? "0").times(expected.factor), expected.dim);
      }
      derivedCache.set(`default:${def.key}`, v);
      const shown = (x: Decimal) => fr(x.dividedBy(expected.factor));
      const value = isPoint(v) ? shown(v.lo) : `${shown(v.lo)} à ${shown(v.hi)}`;
      const prov = provenanceLine(d, sources);
      trace.push({ label: def.label, value, unit: def.unit, ...displayed(def, d.value), ...(def.estimate ? { estimation: true } : {}), from: `Hypothèse${d.note ? ` : ${d.note}` : ""} (${prov.from})`, verified: prov.verified, ...(prov.url ? { url: prov.url } : {}), origin: "assumption" });
      assume({ key: `param:${def.key}`, label: def.label, value: displayed(def, d.value).shown ?? value, unit: def.unit, ...(d.note ? { note: d.note } : {}), ...(def.choices ? { choices: def.choices } : {}) });
      return v;
    }
    /**
     * Table de points du fabricant : la valeur de la ligne EXACTE (format, recouvrement) ; sinon la formule
     * du fabricant (interpolation), dite comme telle. Les données de la formule sont toujours évaluées,
     * pour rester affichées et modifiables (le diamètre du crochet).
     */
    function usePoints(pts: PointTable): IntervalValue {
      if (pts.verification.status !== "verified") {
        if (pts.verification.status === "deprecated" || !options.acceptDraft) {
          throw new Stop({ status: "unknown", reason: "Règle de calcul en attente de vérification.", missing: gap({ kind: "rule", label: `Table : ${pts.label.toLowerCase()}`, sourceId: pts.source }) });
        }
        provisional = true;
      }
      const unit = parseRefUnit(pts.unit);
      const keys = pts.keys.map((k) => ({ v: valueOf(k.variable), factor: parseRefUnit(k.unit).factor }));
      const formula = evaluateInterval(parseFormula(pts.otherwise), valueOf);
      const shown = (x: Decimal) => fr(x.dividedBy(unit.factor));
      const exact = keys.every((k) => isPoint(k.v));
      if (exact && pts.admissible) checkAdmissible(pts, keys.map((k) => k.v.lo.dividedBy(k.factor)));
      const row = exact ? pts.rows.find((r) => keys.every((k, i) => k.v.lo.dividedBy(k.factor).minus(new Decimal(r[i]!)).abs().lessThan("0.000001"))) : undefined;
      if (row) {
        const value = new Decimal(row[keys.length]!);
        trace.push({ label: `${pts.label} (table ${sources.get(pts.source)?.publisher ?? "du fabricant"})`, value: fr(value), unit: pts.unit, origin: "referential", ...provenanceLine(pts, sources) });
        return point(value.times(unit.factor), unit.dim);
      }
      trace.push({
        label: `${pts.label} (formule ${sources.get(pts.source)?.publisher ?? "du fabricant"}, hors table)`,
        value: isPoint(formula) ? shown(formula.lo) : `${shown(formula.lo)} à ${shown(formula.hi)}`,
        unit: pts.unit,
        origin: "referential",
        ...provenanceLine(pts, sources),
      });
      return formula;
    }
    /**
     * Bornes du fabricant (§34) : un recouvrement hors de la plage d'un format. Les formats admis sont
     * ceux dont la plage contient ce recouvrement, du plus proche au plus éloigné.
     *  - Format écrit sur le devis (ou choisi par l'artisan) : on le GARDE toujours. La formule calcule,
     *    la ligne est marquée « estimation, recouvrement hors table », et le format voisin est un conseil
     *    (hypothèse à boutons), jamais une question bloquante.
     *  - Format venu d'une habitude ou d'un défaut : UNE question à boutons, le voisin « conseillé » d'abord.
     */
    function checkAdmissible(pts: PointTable, values: Decimal[]): void {
      const last = values.length - 1;
      const target = values[last]!;
      const rangeOf = (lead: Decimal[]) => {
        const rs = pts.rows.filter((r) => lead.every((v, i) => v.minus(new Decimal(r[i]!)).abs().lessThan("0.000001"))).map((r) => new Decimal(r[last]!));
        return rs.length ? { min: Decimal.min(...rs), max: Decimal.max(...rs) } : null;
      };
      const range = rangeOf(values.slice(0, last));
      if (!range || (target.greaterThanOrEqualTo(range.min) && target.lessThanOrEqualTo(range.max))) return;
      const slotKey = pts.admissible!.slot;
      const slotDef = work.slots.find((x) => x.key === slotKey)!;
      const chosen = productFor(slotKey);
      const current = chosen?.product;
      const fromQuote = chosen?.choice.origin === "devis" || chosen?.choice.origin === "artisan";
      const lead = pts.keys.slice(0, last);
      // Valeurs des premières clés pour un autre produit (« ardoise.longueur » en cm).
      const leadOf = (p: Product): Decimal[] | null => {
        const out: Decimal[] = [];
        for (const k of lead) {
          const [head, attr] = k.variable.split(".");
          const fact = head === slotKey && attr ? p.attributes[attr] : undefined;
          if (!fact) return null;
          out.push(new Decimal(fact.value).times(parseRefUnit(fact.unit).factor).dividedBy(parseRefUnit(k.unit).factor));
        }
        return out;
      };
      const here = values.slice(0, last);
      const candidates = ref.products
        .filter((p) => p.family === slotDef.family && p.id !== current?.id)
        .map((p) => ({ p, lead: leadOf(p) }))
        .filter((c): c is { p: Product; lead: Decimal[] } => {
          if (!c.lead) return false;
          const r = rangeOf(c.lead);
          return !!r && target.greaterThanOrEqualTo(r.min) && target.lessThanOrEqualTo(r.max);
        })
        .map((c) => ({ ...c, distance: c.lead.reduce((sum, v, i) => sum.plus(v.minus(here[i]!).abs()), new Decimal(0)) }))
        .sort((a, b) => a.distance.comparedTo(b.distance));
      const unit = pts.keys[last]!.unit;
      const bound = target.lessThan(range.min) ? `sous le minimum de ${fr(range.min, 0)} ${unit}` : `au-delà du maximum de ${fr(range.max, 0)} ${unit}`;
      const name = current?.shortLabel ?? slotDef.label;
      const variable = pts.keys[last]!.variable;
      const what = (work.derived?.find((d) => d.key === variable)?.label ?? work.params.find((p) => p.key === variable)?.label ?? variable.replace(/_/g, " ")).toLowerCase();
      const publisher = sources.get(pts.source)?.publisher ?? "fabricant";
      const plage = `${what} ${fr(target, 0)} ${unit}, ${bound} pour ce format (${publisher})`;
      const options = candidates.map((c, i) => ({ label: i === 0 ? `${c.p.shortLabel} (conseillé)` : c.p.shortLabel, value: c.p.id }));
      if (fromQuote && current) {
        // Le devis fait foi : calcul par la formule, dit comme estimation ; le voisin n'est qu'un conseil.
        const conseil = candidates[0] ? ` Format conseillé : ${candidates[0].p.shortLabel}.` : "";
        const texte = `${what.charAt(0).toUpperCase()}${what.slice(1)} ${fr(target, 0)} ${unit} hors table ${publisher} (${bound} pour ce format).${conseil}`;
        trace.push({ label: "Estimation", value: texte, unit: "", from: `Format écrit sur le devis, gardé`, origin: "referential", estimation: true, verified: true, ...(provenanceLine(pts, sources).url ? { url: provenanceLine(pts, sources).url } : {}) });
        if (options.length > 0) {
          assume({ key: `product:${slotKey}`, label: slotDef.label, value: current.shortLabel, unit: "", note: `Recouvrement hors table ${publisher} pour ce format.${conseil}`, choices: [{ label: `${current.shortLabel} (devis)`, value: current.id }, ...options] });
        }
        return;
      }
      const reason = `${name} non admis ici : ${plage}.`;
      trace.push({ label: "Format non admis", value: reason, unit: "", origin: "referential", ...provenanceLine(pts, sources) });
      if (candidates.length === 0) throw new Stop({ status: "unknown", reason });
      throw new Stop({
        status: "question",
        question: {
          key: `product:${slotKey}`,
          kind: "choose_product",
          text: `${reason} Quel format ?`,
          options,
        },
      });
    }
    /** Table : la cellule des plus grands seuils atteints ; une entrée hors table arrête le calcul (rien n'est deviné). */
    function useTable(name: string, table: LookupTable): IntervalValue {
      if (table.verification.status !== "verified") {
        if (table.verification.status === "deprecated" || !options.acceptDraft) {
          throw new Stop({ status: "unknown", reason: "Règle de calcul en attente de vérification.", missing: gap({ kind: "rule", label: `Table : ${table.label.toLowerCase()}`, sourceId: table.source }) });
        }
        provisional = true;
      }
      const unit = parseRefUnit(table.unit);
      const inputs = table.axes.map((axis) => {
        const def = work.params.find((p) => p.key === axis.param);
        if (!def) throw new FormulaError(`Table ${name} : paramètre inconnu ${axis.param}`);
        const v = valueOf(axis.param);
        const factor = parseRefUnit(def.unit).factor;
        return { axis, lo: v.lo.dividedBy(factor), hi: v.hi.dividedBy(factor) };
      });
      const index = (axis: LookupTable["axes"][number], x: Decimal): number => {
        let best = -1;
        axis.thresholds.forEach((t, i) => {
          if (x.greaterThanOrEqualTo(new Decimal(t))) best = i;
        });
        return best;
      };
      const cell = (ij: number[]): Decimal => new Decimal(table.values[ij[0]!]![ij[1] ?? 0]!);
      const los = inputs.map((i) => index(i.axis, i.lo));
      const his = inputs.map((i) => index(i.axis, i.hi));
      if (his.some((i) => i < 0)) {
        const which = inputs[his.findIndex((i) => i < 0)]!;
        const def = work.params.find((p) => p.key === which.axis.param)!;
        throw new Stop({ status: "unknown", reason: `${def.label} trop faible pour cet ouvrage (minimum ${which.axis.thresholds[0]} ${def.unit}).` });
      }
      // Entrées connues à un intervalle près : toutes les cellules entre les deux coins restent possibles.
      const candidates: Decimal[] = [];
      const i0 = Math.max(los[0]!, 0);
      for (let i = i0; i <= his[0]!; i++) {
        if (inputs.length === 1) candidates.push(cell([i]));
        else for (let j = Math.max(los[1]!, 0); j <= his[1]!; j++) candidates.push(cell([i, j]));
      }
      if (los.some((i) => i < 0)) candidates.push(new Decimal(-Infinity));
      const v: IntervalValue = { lo: Decimal.min(...candidates).times(unit.factor), hi: Decimal.max(...candidates).times(unit.factor), dim: unit.dim };
      const shown = (x: Decimal) => fr(x.dividedBy(unit.factor));
      trace.push({ label: table.label, value: isPoint(v) ? shown(v.lo) : `${shown(v.lo)} à ${shown(v.hi)}`, unit: table.unit, origin: "referential", ...provenanceLine(table, sources) });
      return v;
    }
    // Condition d'existence encore indécise (« faconnage » sans réponse) : sa question, avant tout calcul.
    if (rule.when) {
      // La condition tranchée, une donnée inconnue qu'elle a rencontrée sans en avoir besoin (« bacs longs » quand
      // le rampant fait 5,5 m) n'est pas un manque : elle ne doit ni s'afficher « inconnue » ni devenir une question.
      const missingBefore = missing.length;
      const w = evaluateInterval(parseFormula(rule.when), valueOf);
      if (!isPoint(w) && missing[0]) throw new Stop({ status: "question", question: missing[0].question });
      missing.splice(missingBefore);
    }
    const raw = evaluateInterval(expr, valueOf);

    // 3. Unité du besoin.
    const needUnit = parseRefUnit(rule.unit);
    if (!sameDim(raw.dim, needUnit.dim)) throw new FormulaError(`La règle ${rule.id} ne donne pas des ${rule.unit}`);

    // 4. Marge : réglage de l'entreprise (produit, puis famille), sinon règle sourcée la plus précise, sinon 0 % dit.
    const companyRate = (product ? input.preferences?.waste?.[product.id] : undefined) ?? input.preferences?.waste?.[slot.family];
    const wasteRule = ref.wasteRules
      .filter(
        (w) =>
          w.family === slot.family &&
          (w.product === undefined || w.product === product?.id) &&
          (w.workItem === undefined || w.workItem === work.id) &&
          (w.verification.status === "verified" || options.acceptDraft),
      )
      .sort((a, b) => Number(b.product !== undefined) * 2 + Number(b.workItem !== undefined) - (Number(a.product !== undefined) * 2 + Number(a.workItem !== undefined)))[0];
    let factor = new Decimal(1);
    if (companyRate !== undefined) {
      factor = new Decimal(companyRate).dividedBy(100).plus(1);
    } else if (wasteRule) {
      if (wasteRule.verification.status === "draft") provisional = true;
      factor = new Decimal(wasteRule.rate).dividedBy(100).plus(1);
    }
    const need: IntervalValue = { lo: raw.lo.dividedBy(needUnit.factor).times(factor), hi: raw.hi.dividedBy(needUnit.factor).times(factor), dim: raw.dim };
    onNeed(need);
    const exact = missing.length === 0;
    trace.push({
      label: "Besoin calculé",
      value: exact ? fr(raw.lo.dividedBy(needUnit.factor)) : `${fr(raw.lo.dividedBy(needUnit.factor))} à ${fr(raw.hi.dividedBy(needUnit.factor))}`,
      unit: rule.unit,
      origin: "referential",
      ...provenanceLine(rule, sources),
    });
    if (companyRate !== undefined) {
      trace.push({ label: "Marge (votre réglage)", value: companyRate.replace(".", ","), unit: "%", from: "Réglage de votre entreprise", origin: "company", verified: true });
    } else if (wasteRule) {
      trace.push({ label: "Marge recommandée", value: wasteRule.rate.replace(".", ","), unit: "%", origin: "referential", ...provenanceLine(wasteRule, sources) });
    } else {
      // Ni règle sourcée, ni réglage : 0 %, et c'est dit (c'est un réglage de l'entreprise, ici vide).
      trace.push({ label: "Marge", value: "0", unit: "%", from: "Aucune marge réglée par votre entreprise", origin: "company", verified: true });
    }

    // 5. Achat : la commande pour la plus petite ET la plus grande valeur possible.
    const converted = product
      ? toPurchase(product, need, rule.unit, (label, fact) => useFact(label, fact, { kind: "packaging", productId: product.id }))
      : { pending: `Produit à identifier (${slot.label.toLowerCase()}) pour convertir en unités de vente.`, missing: gap({ kind: "product", label: slot.label }) };
    const purchaseUnavailable = converted && "pending" in converted ? converted.pending : undefined;
    const purchaseMissing = converted && "pending" in converted && converted.missing ? { ...converted.missing, workItemId: work.id, slot: slot.key, family: slot.family } : undefined;
    const purchase = converted && "pending" in converted ? null : converted;
    // Une donnée qui change l'ARTICLE (le diamètre) sans changer la quantité : demandée quand même.
    for (const name of rule.precisionRequires ?? []) valueOf(name);
    const required = missing.find((m) => rule.precisionRequires?.includes(m.key));
    if (required) throw new Stop({ status: "question", question: required.question });
    if (!exact) {
      const decided = purchase && purchase.orderLo.equals(purchase.orderHi) && purchase.orderLo.isFinite();
      if (!decided) {
        const q = missing[0]!.question;
        const impact =
          purchase && purchase.orderLo.isFinite() && purchase.orderHi.isFinite()
            ? `De ${fr(purchase.orderLo, 0)} à ${fr(purchase.orderHi, 0)} ${purchase.unit.many} selon la réponse.`
            : undefined;
        throw new Stop({ status: "question", question: { ...q, ...(impact ? { impact } : {}) } });
      }
      // La donnée manque, mais aucune de ses valeurs possibles ne change la commande : pas de question.
      for (const m of missing) trace.push({ label: m.label, value: "inconnue", unit: "", from: "Sans effet sur la commande", verified: true });
    }
    // Précision au comptoir (§45.3) : « {longueur_bande|m} » s'écrit avec la valeur du chantier ; une valeur
    // inconnue ou en fourchette retire la précision plutôt que d'écrire un chiffre douteux.
    let precision: string | undefined;
    if (rule.precision && exact) {
      const traceLen = trace.length;
      const missingLen = missing.length;
      try {
        precision = rule.precision.replace(/\{([\w.]+)(?:\|([^}]+))?\}/g, (_, name: string, unitText?: string) => {
          const v = valueOf(name);
          if (!isPoint(v) || !v.lo.isFinite()) throw new Error("précision incalculable");
          // Sans unité, une donnée qui a sa façon d'être dite (« 150 » → « Ø 150 », « 0 » → « VMC ») s'écrit ainsi.
          const def = unitText ? undefined : work.params.find((p) => p.key === name);
          const shown = def?.display?.[v.lo.dividedBy(parseRefUnit(def.unit).factor).toFixed()];
          if (shown !== undefined) return shown;
          const u = unitText ? parseRefUnit(unitText) : null;
          return `${fr(u ? v.lo.dividedBy(u.factor) : v.lo)}${unitText ? ` ${unitText.replace("m2", "m²")}` : ""}`;
        });
      } catch {
        precision = undefined;
      }
      trace.splice(traceLen);
      missing.splice(missingLen);
    }
    return {
      ...base,
      ...(precision !== undefined ? { precision } : {}),
      status: "calculated",
      ...(exact
        ? { quantity: { value: need.lo.toDecimalPlaces(2).toFixed(), unit: rule.unit } }
        : { quantityRange: { min: need.lo.toDecimalPlaces(2).toFixed(), max: need.hi.toDecimalPlaces(2).toFixed(), unit: rule.unit } }),
      ...(purchase ? { purchase: { order: { count: purchase.orderLo.toFixed(), unit: purchase.unit }, approx: purchase.approx } } : {}),
      ...(purchaseUnavailable ? { purchaseUnavailable } : {}),
      ...(purchaseMissing ? { missing: purchaseMissing } : {}),
      provisional,
      assumptions,
      trace,
    };
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    return { ...base, ...e.outcome, provisional, assumptions, trace };
  }
}

/**
 * Commande dans l'unité de vente principale, arrondie au supérieur, pour les
 * deux bornes du besoin (identiques quand tout est connu). Les ordres de
 * grandeur (palettes…) ne sont donnés que s'ils sont les mêmes aux deux bornes.
 */
function toPurchase(
  product: Product,
  need: IntervalValue,
  needUnitText: string,
  useFact: (label: string, fact: Fact) => IntervalValue,
): { orderLo: Decimal; orderHi: Decimal; unit: { one: string; many: string }; approx: PurchaseQuantity[] } | { pending: string; missing?: MissingData } | null {
  const needUnit = parseRefUnit(needUnitText);
  const lo = need.lo.times(needUnit.factor);
  const hi = need.hi.times(needUnit.factor);
  const counts = (su: SellingUnit) => {
    const content = useFact(`Contenu : 1 ${su.label.one}`, su.contains);
    if (!sameDim(content.dim, needUnit.dim) || content.lo.isZero()) return null;
    // Arrondi au supérieur après avoir effacé le bruit décimal (333,333… × 1,05 vaut 350, pas 351).
    const whole = (x: Decimal) => x.dividedBy(content.lo).toDecimalPlaces(6).ceil();
    return { lo: whole(lo), hi: whole(hi) };
  };
  const primary = product.sellingUnits.find((s) => s.primary);
  if (!primary) {
    return {
      pending: `Conditionnement à confirmer : aucune unité de vente vérifiée pour ${product.shortLabel}.`,
      missing: { kind: "packaging", label: "Conditionnement (unité de vente)", workItemId: "", slot: "", family: product.family, productId: product.id },
    };
  }
  let order: { lo: Decimal; hi: Decimal } | null;
  try {
    order = counts(primary);
  } catch (e) {
    // Conditionnement pas encore vérifié : le BESOIN reste juste et affiché ; seule la conversion attend.
    if (e instanceof Stop && e.outcome.status === "unknown") return { pending: e.outcome.reason, ...(e.outcome.missing ? { missing: e.outcome.missing } : {}) };
    throw e;
  }
  if (!order) return null;
  const approx = product.sellingUnits
    .filter((s) => s !== primary)
    .flatMap((s) => {
      try {
        const c = counts(s);
        return c && c.lo.equals(c.hi) ? [{ count: c.lo.toFixed(), unit: s.label }] : [];
      } catch (e) {
        // Un ordre de grandeur sans donnée vérifiée est simplement omis ; il ne bloque pas la commande.
        if (e instanceof Stop) return [];
        throw e;
      }
    });
  return { orderLo: order.lo, orderHi: order.hi, unit: primary.label, approx };
}
