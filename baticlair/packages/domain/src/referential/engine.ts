import { Decimal } from "../shared/decimal.js";
import { evaluateInterval, FormulaError, formulaVariables, parseFormula, type IntervalValue } from "./expression.js";
import type { Fact, NeedRule, Product, Referential, SellingUnit, Source, WorkItemType } from "./model.js";
import { parseRefUnit, sameDim } from "./units.js";

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
 * Préférences de l'ENTREPRISE (apprises de ses réponses, modifiables).
 * Jamais une donnée fabricant ni une règle technique : elles ne font que
 * choisir à la place d'une question (« mon écran habituel »).
 */
export interface CompanyPreferences {
  /** Produit habituel, par emplacement (« ecran ») ou par famille (« underlay »). */
  products?: Record<string, string>;
  /** Marge habituelle (« 5 » = 5 %), par produit ou par famille. */
  waste?: Record<string, string>;
}

export interface WorkItemInput {
  workItemId: string;
  params: Record<string, ParamValue>;
  products: Record<string, SlotChoice>;
  /** Emplacements que le devis cite explicitement (« liteaux » écrits sur le devis). */
  mentioned: string[];
  preferences?: CompanyPreferences;
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
  kind: "confirm_product" | "choose_product" | "param";
  text: string;
  hint?: string;
  unit?: string;
  options?: { label: string; value: string }[];
  /** Pourquoi elle compte : « De 1 191 à 1 445 pièces selon la réponse ». */
  impact?: string;
}

export interface TraceLine {
  label: string;
  value: string;
  unit: string;
  /** Provenance lisible : « Devis, ligne 4 », « Fiche Edilians (vérifiée le 02/10/2026) ». */
  from: string;
  verified: boolean;
  url?: string;
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
  /** Calcul fait avec au moins une donnée en brouillon (option acceptDraft). */
  provisional: boolean;
  formula?: string;
  exclusions?: string;
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
    readonly outcome: { status: "question"; question: Question } | { status: "unknown"; reason: string },
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
  // Les bornes d'un paramètre utilisé (pureau entre mini et maxi de la fiche) font partie des données requises.
  for (const p of work.params) if (vars.has(p.key) && p.range) [p.range.min, p.range.max].forEach((v) => vars.add(v));
  const slotKeys = new Set([rule.slot, ...[...vars].filter((v) => v.includes(".") && !v.startsWith("regle.")).map((v) => v.split(".")[0]!)]);
  return {
    products: work.slots.filter((s) => slotKeys.has(s.key)).map((s) => ({ slot: s.key, label: s.label })),
    params: work.params.filter((p) => vars.has(p.key)).map((p) => ({ key: p.key, label: p.label, kind: p.kind })),
    manufacturerSpecs: [...vars]
      .filter((v) => v.includes(".") && !v.startsWith("regle."))
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
  const needs = work.needs.map((rule) => computeNeed(ref, work, rule, input, sources, options));
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
const isPoint = (v: IntervalValue) => v.lo.equals(v.hi);

function computeNeed(
  ref: Referential,
  work: WorkItemType,
  rule: NeedRule,
  input: WorkItemInput,
  sources: Map<string, Source>,
  options: EngineOptions,
): NeedResult {
  const slot = work.slots.find((s) => s.key === rule.slot)!;
  const productFor = (slotKey: string): { product: Product; choice: SlotChoice | { origin: "preference" } } | undefined => {
    const chosen = input.products[slotKey];
    if (chosen) {
      const p = ref.products.find((x) => x.id === chosen.productId);
      return p ? { product: p, choice: chosen } : undefined;
    }
    // Pas sur le devis : le produit habituel de l'entreprise évite la question.
    const family = work.slots.find((s) => s.key === slotKey)?.family;
    const preferred = input.preferences?.products?.[slotKey] ?? (family ? input.preferences?.products?.[family] : undefined);
    const p = preferred ? ref.products.find((x) => x.id === preferred && x.family === family) : undefined;
    return p ? { product: p, choice: { origin: "preference" } } : undefined;
  };
  const resolved = productFor(slot.key);
  const product = resolved?.product;
  const origin: NeedResult["origin"] = input.mentioned.includes(slot.key) ? "explicit" : rule.core ? "deduced" : "suggested";
  const trace: TraceLine[] = [];
  let provisional = false;
  const base = {
    needId: rule.id,
    slot: slot.key,
    family: slot.family,
    label: product?.shortLabel ?? slot.label,
    origin,
    formula: rule.formula,
    ...(rule.exclusions ? { exclusions: rule.exclusions } : {}),
  };

  /** Une donnée du référentiel n'est utilisable que vérifiée (ou en brouillon, sur l'écran du validateur). */
  const useFact = (label: string, fact: Fact): IntervalValue => {
    if (fact.verification.status === "deprecated") throw new Stop({ status: "unknown", reason: `Donnée retirée du référentiel : ${label}.` });
    if (fact.verification.status === "draft") {
      if (!options.acceptDraft) {
        throw new Stop({ status: "unknown", reason: `Donnée en attente de vérification : ${label} (${sources.get(fact.source)?.title ?? fact.source}).` });
      }
      provisional = true;
    }
    const unit = parseRefUnit(fact.unit);
    trace.push({ label, value: fact.value.replace(".", ","), unit: fact.unit, ...provenanceLine(fact, sources) });
    return point(new Decimal(fact.value).times(unit.factor), unit.dim);
  };

  try {
    if (rule.verification.status !== "verified") {
      if (rule.verification.status === "deprecated" || !options.acceptDraft) {
        throw new Stop({ status: "unknown", reason: `Règle de calcul en attente de vérification (${sources.get(rule.source)?.title ?? rule.source}).` });
      }
      provisional = true;
    }

    // 1. Le produit : écrit sur le devis, confirmé, ou habituel ; sinon UNE question.
    //    Si la règle n'utilise AUCUNE caractéristique du produit (2 descentes × 4 m = 8 m de tube),
    //    le besoin se calcule quand même : seule la conversion en unités de vente attend le produit.
    const usesProduct = formulaVariables(parseFormula(rule.formula)).some((v) => v.startsWith(`${slot.key}.`));
    if (!product && usesProduct) {
      const candidates = ref.products.filter((p) => p.family === slot.family);
      if (candidates.length === 0) throw new Stop({ status: "unknown", reason: `Calcul impossible sans les données du produit (${slot.label}).` });
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
    if (product && resolved?.choice.origin === "preference") {
      trace.push({ label: "Produit", value: product.shortLabel, unit: "", from: "Votre produit habituel", verified: true });
    }

    // 2. Les valeurs de la formule. Une donnée de chantier inconnue n'est pas devinée :
    //    elle prend TOUTES ses valeurs admissibles (intervalle), et on regarde si la commande change.
    const expr = parseFormula(rule.formula);
    const missing: { key: string; label: string; question: Question }[] = [];
    const valueOf = (name: string): IntervalValue => {
      const [head, attr] = name.split(".");
      if (attr !== undefined) {
        if (head === "regle") {
          const fact = work.constants[attr];
          if (!fact) throw new Stop({ status: "unknown", reason: `Constante absente du référentiel : ${attr}.` });
          return useFact(attr.replace(/_/g, " "), fact);
        }
        const p = productFor(head!)?.product;
        const family = ref.families.find((f) => f.code === work.slots.find((s) => s.key === head)?.family);
        const def = family?.attributes.find((a) => a.key === attr);
        const fact = p?.attributes[attr];
        if (!p || !fact) {
          throw new Stop({ status: "unknown", reason: `Calcul impossible sans « ${def?.label ?? attr} » de ${p?.shortLabel ?? head}.` });
        }
        return useFact(`${def?.label ?? attr} (${p.shortLabel})`, fact);
      }
      const def = work.params.find((p) => p.key === name);
      if (!def) throw new FormulaError(`Variable inconnue : ${name}`);
      const expected = parseRefUnit(def.unit);
      const bounds = def.range ? { min: valueOf(def.range.min), max: valueOf(def.range.max) } : null;
      const given = input.params[name];
      if (!given) {
        if (!missing.some((m) => m.key === name)) {
          missing.push({
            key: name,
            label: def.label,
            question: { key: `param:${name}`, kind: "param", text: def.question, unit: def.unit, ...(def.hint ? { hint: def.hint } : {}) },
          });
        }
        return bounds ? { lo: bounds.min.lo, hi: bounds.max.hi, dim: expected.dim } : { lo: new Decimal(-Infinity), hi: new Decimal(Infinity), dim: expected.dim };
      }
      const unit = parseRefUnit(given.unit);
      if (!sameDim(unit.dim, expected.dim)) throw new Stop({ status: "unknown", reason: `${def.label} : unité « ${given.unit} » incompatible (attendu ${def.unit}).` });
      const value = new Decimal(given.value).times(unit.factor);
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
        value: given.value.replace(".", ","),
        unit: given.unit,
        from: given.evidence ?? (given.origin === "devis" ? "Devis" : "Votre réponse"),
        verified: true,
      });
      return point(value, unit.dim);
    };
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
    const exact = missing.length === 0;
    trace.push({
      label: "Besoin calculé",
      value: exact ? fr(raw.lo.dividedBy(needUnit.factor)) : `${fr(raw.lo.dividedBy(needUnit.factor))} à ${fr(raw.hi.dividedBy(needUnit.factor))}`,
      unit: rule.unit,
      ...provenanceLine(rule, sources),
    });
    if (companyRate !== undefined) {
      trace.push({ label: "Marge (votre réglage)", value: companyRate.replace(".", ","), unit: "%", from: "Votre réglage", verified: true });
    } else if (wasteRule) {
      trace.push({ label: "Marge recommandée", value: wasteRule.rate.replace(".", ","), unit: "%", ...provenanceLine(wasteRule, sources) });
    } else {
      trace.push({ label: "Marge", value: "0", unit: "%", from: "Aucune marge réglée", verified: true });
    }

    // 5. Achat : la commande pour la plus petite ET la plus grande valeur possible.
    const converted = product ? toPurchase(product, need, rule.unit, useFact) : { pending: `Produit à identifier (${slot.label.toLowerCase()}) pour convertir en unités de vente.` };
    const purchaseUnavailable = converted && "pending" in converted ? converted.pending : undefined;
    const purchase = converted && "pending" in converted ? null : converted;
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
    return {
      ...base,
      status: "calculated",
      ...(exact
        ? { quantity: { value: need.lo.toDecimalPlaces(2).toFixed(), unit: rule.unit } }
        : { quantityRange: { min: need.lo.toDecimalPlaces(2).toFixed(), max: need.hi.toDecimalPlaces(2).toFixed(), unit: rule.unit } }),
      ...(purchase ? { purchase: { order: { count: purchase.orderLo.toFixed(), unit: purchase.unit }, approx: purchase.approx } } : {}),
      ...(purchaseUnavailable ? { purchaseUnavailable } : {}),
      provisional,
      trace,
    };
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    return { ...base, ...e.outcome, provisional, trace };
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
): { orderLo: Decimal; orderHi: Decimal; unit: { one: string; many: string }; approx: PurchaseQuantity[] } | { pending: string } | null {
  const needUnit = parseRefUnit(needUnitText);
  const lo = need.lo.times(needUnit.factor);
  const hi = need.hi.times(needUnit.factor);
  const counts = (su: SellingUnit) => {
    const content = useFact(`Contenu : 1 ${su.label.one}`, su.contains);
    if (!sameDim(content.dim, needUnit.dim) || content.lo.isZero()) return null;
    return { lo: lo.dividedBy(content.lo).ceil(), hi: hi.dividedBy(content.lo).ceil() };
  };
  const primary = product.sellingUnits.find((s) => s.primary);
  if (!primary) return { pending: `Conditionnement à confirmer : aucune unité de vente vérifiée pour ${product.shortLabel}.` };
  let order: { lo: Decimal; hi: Decimal } | null;
  try {
    order = counts(primary);
  } catch (e) {
    // Conditionnement pas encore vérifié : le BESOIN reste juste et affiché ; seule la conversion attend.
    if (e instanceof Stop && e.outcome.status === "unknown") return { pending: e.outcome.reason };
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
