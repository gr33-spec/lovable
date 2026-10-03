import { Decimal } from "../shared/decimal.js";
import { keyCharacteristics } from "../takeoff/characteristics.js";
import { validateTakeoffLine } from "../takeoff/validation.js";
import { keywordPosition, normalizeText, type TradeProfile } from "../trades/trade-profile.js";
import type { ChantierContext, SiteFact } from "./context.js";
import { paramsFromContext } from "./context.js";
import type { CompanyPreferences, SlotChoice, WorkItemInput } from "./engine.js";
import type { ProductFamily, Referential, Slot, WorkItemType } from "./model.js";
import { identifyProducts } from "./resolve.js";
import { parseRefUnit, sameDim, isAngleUnit, percentSlopeToDegrees } from "./units.js";

/**
 * DU DEVIS AU MOTEUR : chaque ligne du devis client est rattachée, sans
 * saisie, à un ouvrage du référentiel, à ses emplacements (tuile, liteau…),
 * aux produits qu'elle nomme et aux données qu'elle contient. Tout vient
 * du VOCABULAIRE du référentiel (données), rien n'est écrit pour un devis
 * particulier.
 *
 * Ce qui n'est pas reconnu le reste, avec la raison : jamais un rattachement
 * « au plus proche ».
 */
export interface QuoteLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** Titres du devis au-dessus de la ligne (voir TakeoffLineInput.section). */
  section?: readonly string[];
}

export type LinePlan =
  | {
      ref: string;
      status: "planned";
      workItemId: string;
      /** Emplacement que la ligne désigne (« contre_liteau »). */
      slot: string;
      /** Autres emplacements que la ligne cite (« crochets et naissances compris »). */
      mentions: string[];
      characteristics: string[];
    }
  /** Main-d'œuvre, location, forfait : rien à acheter. */
  | { ref: string; status: "not_material" }
  /** Pas d'ouvrage connu pour cette ligne : BatiClair le dit. */
  | { ref: string; status: "not_covered"; family: string | null; reason: string };

export interface QuotePlan {
  lines: LinePlan[];
  inputs: WorkItemInput[];
  context: ChantierContext;
  /** Caractéristiques du devis par emplacement, pour le nom des lignes d'achat. */
  characteristicsBySlot: Record<string, string[]>;
  /** Questions de cohérence (deux valeurs différentes pour la même donnée). */
  conflicts: string[];
}

/** Le mot le plus tôt dans la ligne nomme l'ouvrage ; à égalité, l'expression la plus longue (« tuile de rive » > « tuile »). */
function earliest<T>(text: string, items: { item: T; keywords: string[] }[]): T | null {
  let best: { item: T; pos: number; len: number } | null = null;
  for (const { item, keywords } of items) {
    for (const k of keywords) {
      const pos = keywordPosition(text, k);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && k.length > best.len)) best = { item, pos, len: k.length };
    }
  }
  return best?.item ?? null;
}

const familyOf = (ref: Referential, code: string): ProductFamily | undefined => ref.families.find((f) => f.code === code);
const slotWords = (ref: Referential, slot: Slot) => [...(slot.keywords ?? []), ...(familyOf(ref, slot.family)?.keywords ?? [])];

/** Unités de ligne de devis → unités du référentiel. */
export const LINE_UNITS: Record<string, string> = { U: "u", M: "m", ML: "m", M2: "m2", M3: "m3", KG: "kg", T: "t" };
const TEXT_UNITS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", ml: "m", m2: "m2", "m²": "m2", "%": "%", "°": "°" };

/** « entraxe 90 cm », « hauteur : 4m », « pureau de 34,3 cm » → valeur et unité, seulement si elles sont écrites. */
function readLabelled(normalized: string, label: string): { value: string; unit: string } | null {
  const pos = keywordPosition(normalized, label);
  if (pos < 0) return null;
  const after = normalized.slice(pos + normalizeText(label).length);
  const m = /^[a-z]{0,2}\s*(?:de |d |: |:|= |a )?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|ml|m²|m2|m|%|°)(?![a-z0-9])/.exec(after);
  if (!m) return null;
  return { value: m[1]!.replace(",", "."), unit: TEXT_UNITS[m[2]!]! };
}

/**
 * @param extraFacts données du chantier connues hors du devis (zone climatique déduite du
 *   code postal de l'adresse) : elles complètent le contexte, le devis l'emporte s'il les écrit.
 */
export function planQuote(lines: QuoteLine[], ref: Referential, profile: TradeProfile, preferences?: CompanyPreferences, extraFacts: readonly SiteFact[] = []): QuotePlan {
  // Le vocabulaire d'un référentiel ne vaut que pour SON métier : dans un devis de plombier,
  // « coude PVC » n'est pas un coude de descente de gouttière.
  const covered = profile.id.split(",").includes(ref.trade);
  const families = covered ? ref.families.filter((f) => f.keywords?.length).map((f) => ({ item: f.code, keywords: f.keywords! })) : [];
  const read = lines.map((line) => {
    const v = validateTakeoffLine({ id: line.ref, designation: line.designation, quantityRaw: line.quantity, unitRaw: line.unit, source: "client_quote" }, profile);
    const text = normalizeText(line.designation);
    return { line, v, text, family: v.kind === "labor" ? null : earliest(text, families) };
  });

  // 1. Les ouvrages présents : ceux qu'une ligne déclenche.
  const active = ref.workItems.filter((w) => read.some((r) => r.family && w.triggers.includes(r.family)));

  const plans: LinePlan[] = [];
  const facts: SiteFact[] = [];
  const products = new Map<string, Map<string, SlotChoice | "conflict">>();
  const mentioned = new Map<string, Set<string>>();
  const characteristicsBySlot: Record<string, string[]> = {};

  for (const { line, v, text, family } of read) {
    if (v.kind === "labor") {
      plans.push({ ref: line.ref, status: "not_material" });
      continue;
    }
    const work = family ? active.find((w) => w.slots.some((s) => s.family === family)) : undefined;
    if (!work || !family) {
      const label = family ? (familyOf(ref, family)?.label ?? family) : null;
      plans.push({
        ref: line.ref,
        status: "not_covered",
        family,
        reason: !covered
          ? "Le calcul des quantités n'existe pas encore pour ce métier."
          : label
            ? `${label} : pas encore de règle de calcul dans BatiClair.`
            : "Ouvrage non reconnu par BatiClair.",
      });
      continue;
    }
    // 2. L'emplacement : celui de la famille ; si deux emplacements partagent la famille, leurs mots départagent.
    const candidates = work.slots.filter((s) => s.family === family);
    const slot = candidates.length === 1 ? candidates[0]! : earliest(text, candidates.map((s) => ({ item: s, keywords: s.keywords ?? [] })));
    if (!slot) {
      plans.push({ ref: line.ref, status: "not_covered", family, reason: `Emplacement ambigu dans « ${work.label} ».` });
      continue;
    }
    // Un emplacement de la MÊME famille n'est jamais « cité » par la ligne d'un autre
    // (« contre-lattes en liteaux » ne parle pas du lattage) : il lui faut sa propre ligne.
    const mentions = work.slots
      .filter((s) => s.family !== slot.family && slotWords(ref, s).some((k) => keywordPosition(text, k) >= 0))
      .map((s) => s.key);
    const seen = mentioned.get(work.id) ?? new Set<string>();
    [slot.key, ...mentions].forEach((k) => seen.add(k));
    mentioned.set(work.id, seen);

    // 3. Les produits nommés par la ligne (un seul candidat par famille, sinon le moteur posera la question).
    const chosen = products.get(work.id) ?? new Map<string, SlotChoice | "conflict">();
    for (const s of [slot, ...work.slots.filter((x) => mentions.includes(x.key))]) {
      const found = identifyProducts(line.designation, ref, s.family).candidates;
      if (found.length !== 1) continue;
      const choice: SlotChoice = { productId: found[0]!.product.id, origin: found[0]!.product.generic ? "devis" : "alias" };
      const before = chosen.get(s.key);
      chosen.set(s.key, before && before !== "conflict" && before.productId !== choice.productId ? "conflict" : (before ?? choice));
    }
    products.set(work.id, chosen);

    // 4. Les données écrites : la quantité de la ligne, et les valeurs annoncées par leur nom.
    const unit = v.unit ? LINE_UNITS[v.unit] : undefined;
    if (unit && v.quantity) {
      for (const p of work.params.filter((x) => x.fromLineQuantity && sameDimUnit(x.unit, unit) && (!x.forSlots || x.forSlots.includes(slot.key)))) {
        facts.push({ key: p.key, value: v.quantity.toFixed(), unit, evidence: `Devis, ${line.ref}`, origin: "devis" });
      }
    }
    for (const p of work.params) {
      for (const label of p.textLabels ?? []) {
        const found = readLabelled(text, label);
        if (!found || !sameDimUnit(p.unit, found.unit)) continue;
        // « pente 45 % » dans un devis : gardée en degrés, l'unité de la pente partout dans BatiClair.
        const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
        facts.push({ key: p.key, ...asRef, evidence: `Devis, ${line.ref} (« ${label} »)`, origin: "devis" });
      }
    }
    const chars = productCharacteristics(ref, work, slot, line.designation);
    if (chars.length > 0) characteristicsBySlot[slot.key] = [...new Set([...(characteristicsBySlot[slot.key] ?? []), ...chars])];
    plans.push({ ref: line.ref, status: "planned", workItemId: work.id, slot: slot.key, mentions, characteristics: chars });
  }

  // Une donnée hors devis (zone) ne vaut que si le devis ne la donne pas : jamais de conflit avec lui.
  for (const f of extraFacts) if (!facts.some((x) => x.key === f.key)) facts.push(f);
  const context: ChantierContext = { facts };
  const conflicts: string[] = [];
  const inputs: WorkItemInput[] = active
    .filter((w) => mentioned.has(w.id))
    .map((w: WorkItemType) => {
      const { params, conflicts: c } = paramsFromContext(context, w);
      c.forEach((x) => conflicts.push(`${w.params.find((p) => p.key === x.key)?.label ?? x.key} : ${x.facts.map((f) => `${f.value} ${f.unit} (${f.evidence})`).join(" / ")}`));
      const chosen = [...(products.get(w.id) ?? new Map()).entries()].filter((e): e is [string, SlotChoice] => e[1] !== "conflict");
      return {
        workItemId: w.id,
        params,
        products: Object.fromEntries(chosen),
        mentioned: [...mentioned.get(w.id)!],
        ...(preferences ? { preferences } : {}),
      };
    });
  return { lines: plans, inputs, context, characteristicsBySlot, conflicts: [...new Set(conflicts)] };
}

/**
 * Caractéristiques du devis qui décrivent le PRODUIT de cet emplacement
 * (coloris, matière, section) : on retire ce qui est déjà ailleurs —
 * une donnée du chantier lue (« entraxe 90 cm »), un produit d'une autre
 * famille (« pour tuiles HP10 » sur une ligne de liteaux), un composant
 * cité (« crochets et naissances compris » devient ses propres lignes).
 */
function productCharacteristics(ref: Referential, work: WorkItemType, slot: Slot, designation: string): string[] {
  return keyCharacteristics(designation).filter((c) => {
    const n = normalizeText(c);
    if (/^(avec|comprenant) /.test(n) || / compris$/.test(n)) return false;
    if (work.params.some((p) => (p.textLabels ?? []).some((label) => readLabelled(n, label)))) return false;
    const products = identifyProducts(c, ref).candidates;
    return !(products.length > 0 && products.every((x) => x.product.family !== slot.family));
  });
}

function sameDimUnit(a: string, b: string): boolean {
  return sameDim(parseRefUnit(a).dim, parseRefUnit(b).dim);
}
