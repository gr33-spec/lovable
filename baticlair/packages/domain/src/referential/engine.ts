import { Decimal } from "../shared/decimal.js";
import { evaluate, FormulaError, formulaVariables, parseFormula, type DimValue } from "./expression.js";
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

export interface WorkItemInput {
  workItemId: string;
  params: Record<string, ParamValue>;
  products: Record<string, SlotChoice>;
  /** Emplacements que le devis cite explicitement (« liteaux » écrits sur le devis). */
  mentioned: string[];
  /** Marges réglées par l'artisan, par produit ou par famille (« 5 » = 5 %). Priment sur le référentiel. */
  companyWaste?: Record<string, string>;
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
  /** Besoin, marge comprise, dans l'unité du besoin (arrondi au centième). */
  quantity?: { value: string; unit: string };
  /** Quantité à commander (arrondie au supérieur) et ordres de grandeur. */
  purchase?: { order: PurchaseQuantity; approx: PurchaseQuantity[] };
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
  /** La prochaine question à poser (une seule à la fois). */
  nextQuestion: Question | null;
}

class Stop extends Error {
  constructor(
    readonly outcome: { status: "question"; question: Question } | { status: "unknown"; reason: string },
  ) {
    super("stop");
  }
}

const fr = (d: Decimal, places = 2) => d.toDecimalPlaces(places).toFixed().replace(".", ",");

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
  const nextQuestion = needs.find((n) => n.status === "question" && n.origin !== "suggested")?.question ?? needs.find((n) => n.question)?.question ?? null;
  return { workItemId: work.id, referentialVersion: ref.version, needs, nextQuestion };
}

function provenanceLine(p: { source: string; verification: { status: string; verifiedAt?: string } }, sources: Map<string, Source>): Pick<TraceLine, "from" | "verified" | "url"> {
  const s = sources.get(p.source);
  const verified = p.verification.status === "verified";
  const when = verified && p.verification.verifiedAt ? `, vérifiée le ${p.verification.verifiedAt}` : verified ? "" : ", en attente de vérification";
  return { from: `${s?.title ?? p.source}${when}`, verified, ...(s?.url ? { url: s.url } : {}) };
}

function computeNeed(
  ref: Referential,
  work: WorkItemType,
  rule: NeedRule,
  input: WorkItemInput,
  sources: Map<string, Source>,
  options: EngineOptions,
): NeedResult {
  const slot = work.slots.find((s) => s.key === rule.slot)!;
  const choice = input.products[slot.key];
  const product = choice ? ref.products.find((p) => p.id === choice.productId) : undefined;
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
  const useFact = (label: string, fact: Fact): DimValue => {
    if (fact.verification.status === "deprecated") throw new Stop({ status: "unknown", reason: `Donnée retirée du référentiel : ${label}.` });
    if (fact.verification.status === "draft") {
      if (!options.acceptDraft) {
        throw new Stop({ status: "unknown", reason: `Donnée en attente de vérification : ${label} (${sources.get(fact.source)?.title ?? fact.source}).` });
      }
      provisional = true;
    }
    const unit = parseRefUnit(fact.unit);
    trace.push({ label, value: fact.value.replace(".", ","), unit: fact.unit, ...provenanceLine(fact, sources) });
    return { value: new Decimal(fact.value).times(unit.factor), dim: unit.dim };
  };

  try {
    if (rule.verification.status !== "verified") {
      if (rule.verification.status === "deprecated" || !options.acceptDraft) {
        throw new Stop({ status: "unknown", reason: `Règle de calcul en attente de vérification (${sources.get(rule.source)?.title ?? rule.source}).` });
      }
      provisional = true;
    }

    // 1. Le produit : connu sans ambiguïté, sinon UNE question.
    if (!product) {
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
    if (choice?.origin === "alias") {
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

    // 2. Les valeurs de la formule.
    const expr = parseFormula(rule.formula);
    const valueOf = (name: string): DimValue => {
      const [head, attr] = name.split(".");
      if (attr !== undefined) {
        if (head === "regle") {
          const fact = work.constants[attr];
          if (!fact) throw new Stop({ status: "unknown", reason: `Constante absente du référentiel : ${attr}.` });
          return useFact(attr.replace(/_/g, " "), fact);
        }
        const slotChoice = input.products[head!];
        const p = slotChoice ? ref.products.find((x) => x.id === slotChoice.productId) : undefined;
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
      const given = input.params[name];
      if (!given) {
        throw new Stop({
          status: "question",
          question: { key: `param:${name}`, kind: "param", text: def.question, unit: def.unit, ...(def.hint ? { hint: def.hint } : {}) },
        });
      }
      const unit = parseRefUnit(given.unit);
      const expected = parseRefUnit(def.unit);
      if (!sameDim(unit.dim, expected.dim)) throw new Stop({ status: "unknown", reason: `${def.label} : unité « ${given.unit} » incompatible (attendu ${def.unit}).` });
      const value = new Decimal(given.value).times(unit.factor);
      if (def.range) {
        const min = valueOf(def.range.min);
        const max = valueOf(def.range.max);
        if (value.lessThan(min.value) || value.greaterThan(max.value)) {
          throw new Stop({
            status: "question",
            question: {
              key: `param:${name}`,
              kind: "param",
              text: `${def.label} hors des valeurs de la fiche : pouvez-vous vérifier ?`,
              unit: def.unit,
              hint: `Entre ${fr(min.value.dividedBy(expected.factor))} et ${fr(max.value.dividedBy(expected.factor))} ${def.unit}.`,
            },
          });
        }
      }
      trace.push({
        label: def.label,
        value: given.value.replace(".", ","),
        unit: given.unit,
        from: given.evidence ?? (given.origin === "devis" ? "Devis" : "Votre réponse"),
        verified: true,
      });
      return { value, dim: unit.dim };
    };
    const raw = evaluate(expr, valueOf);

    // 3. Unité du besoin.
    const needUnit = parseRefUnit(rule.unit);
    if (!sameDim(raw.dim, needUnit.dim)) throw new FormulaError(`La règle ${rule.id} ne donne pas des ${rule.unit}`);
    let need = raw.value.dividedBy(needUnit.factor);
    trace.push({ label: "Besoin calculé", value: fr(need), unit: rule.unit, ...provenanceLine(rule, sources) });

    // 4. Marge : réglage de l'artisan, sinon règle sourcée, sinon aucune (dit clairement).
    // Réglage de l'artisan : pour ce produit, sinon pour la famille.
    const companyRate = input.companyWaste?.[product.id] ?? input.companyWaste?.[slot.family];
    // Règle sourcée la plus précise : produit + ouvrage, puis produit, puis ouvrage, puis famille.
    const wasteRule = ref.wasteRules
      .filter(
        (w) =>
          w.family === slot.family &&
          (w.product === undefined || w.product === product.id) &&
          (w.workItem === undefined || w.workItem === work.id) &&
          (w.verification.status === "verified" || options.acceptDraft),
      )
      .sort((a, b) => Number(b.product !== undefined) * 2 + Number(b.workItem !== undefined) - (Number(a.product !== undefined) * 2 + Number(a.workItem !== undefined)))[0];
    if (companyRate !== undefined) {
      need = need.times(new Decimal(companyRate).dividedBy(100).plus(1));
      trace.push({ label: "Marge (votre réglage)", value: companyRate.replace(".", ","), unit: "%", from: "Votre réglage", verified: true });
    } else if (wasteRule) {
      if (wasteRule.verification.status === "draft") provisional = true;
      need = need.times(new Decimal(wasteRule.rate).dividedBy(100).plus(1));
      trace.push({ label: "Marge recommandée", value: wasteRule.rate.replace(".", ","), unit: "%", ...provenanceLine(wasteRule, sources) });
    } else {
      trace.push({ label: "Marge", value: "0", unit: "%", from: "Aucune marge réglée", verified: true });
    }

    // 5. Achat : unité de commande arrondie au supérieur, et ordres de grandeur.
    const purchase = toPurchase(product, need, rule.unit, (label, fact) => useFact(label, fact));
    return {
      ...base,
      status: "calculated",
      quantity: { value: need.toDecimalPlaces(2).toFixed(), unit: rule.unit },
      ...(purchase ? { purchase } : {}),
      provisional,
      trace,
    };
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    return { ...base, ...e.outcome, provisional, trace };
  }
}

function toPurchase(
  product: Product,
  need: Decimal,
  needUnitText: string,
  useFact: (label: string, fact: Fact) => DimValue,
): { order: PurchaseQuantity; approx: PurchaseQuantity[] } | null {
  const needUnit = parseRefUnit(needUnitText);
  const needBase = need.times(needUnit.factor);
  const count = (su: SellingUnit) => {
    const content = useFact(`Contenu : 1 ${su.label.one}`, su.contains);
    if (!sameDim(content.dim, needUnit.dim) || content.value.isZero()) return null;
    return needBase.dividedBy(content.value).ceil();
  };
  const primary = product.sellingUnits.find((s) => s.primary);
  if (!primary) return null;
  const orderCount = count(primary);
  if (!orderCount) return null;
  const approx = product.sellingUnits
    .filter((s) => s !== primary)
    .flatMap((s) => {
      try {
        const c = count(s);
        return c ? [{ count: c.toFixed(), unit: s.label }] : [];
      } catch (e) {
        // Un ordre de grandeur sans donnée vérifiée est simplement omis ; il ne bloque pas la commande.
        if (e instanceof Stop) return [];
        throw e;
      }
    });
  return { order: { count: orderCount.toFixed(), unit: primary.label }, approx };
}
