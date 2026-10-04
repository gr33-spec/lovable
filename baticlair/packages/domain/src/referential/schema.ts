import { z } from "zod";
import { checkReferential } from "./integrity.js";
import type { Referential } from "./model.js";

/**
 * SCHÉMA DU FICHIER DE RÉFÉRENTIEL (plan v3 §3, référentiel §19 et §32) : un référentiel métier est une DONNÉE,
 * lue depuis un fichier (JSON) et vérifiée au chargement, d'abord par sa forme (ce schéma), puis par son sens
 * (checkReferential : unités, formules, sources, appellations). Un fichier faux ne se charge pas, avec le chemin
 * exact de la faute. Le moteur ne lit jamais un référentiel qui n'est pas passé par ici.
 */
const str = z.string().min(1);
const verification = z.object({ status: z.enum(["draft", "verified", "deprecated"]), verifiedAt: z.string().optional(), verifiedBy: z.string().optional(), note: z.string().optional() });
const provenance = { source: str, verification, version: z.number().int().min(1), note: z.string().optional() };
const fact = z.object({ ...provenance, kind: z.enum(["manufacturer_spec", "installation_condition", "packaging"]), value: str, unit: str });
const source = z.object({
  id: str,
  kind: z.enum(["manufacturer", "standard", "baticlair_rule", "retailer", "definition", "trade_practice", "other"]),
  title: str,
  publisher: z.string().optional(),
  url: z.string().optional(),
  documentRef: z.string().optional(),
  retrievedAt: str,
  note: z.string().optional(),
});
const family = z.object({
  code: str,
  label: str,
  needUnit: str,
  attributes: z.array(z.object({ key: str, label: str, unit: str })),
  keyAttributes: z.array(str),
  keywords: z.array(str).optional(),
  refines: z.string().optional(),
});
const sellingUnit = z.object({ id: str, label: z.object({ one: str, many: str }), contains: fact, primary: z.boolean().optional() });
const product = z.object({
  id: str,
  family: str,
  label: str,
  shortLabel: str,
  manufacturer: z.string().optional(),
  aliases: z.array(str),
  generic: z.boolean().optional(),
  attributes: z.record(str, fact),
  sellingUnits: z.array(sellingUnit),
  note: z.string().optional(),
});
const choice = z.object({ label: str, value: str });
const param = z.object({
  key: str,
  label: str,
  unit: str,
  kind: z.enum(["site_data", "artisan_preference"]),
  question: str,
  hint: z.string().optional(),
  range: z.object({ min: str, max: str }).optional(),
  fromLineQuantity: z.boolean().optional(),
  forSlots: z.array(str).optional(),
  textLabels: z.array(str).optional(),
  default: z.object({ ...provenance, value: z.string().optional(), formula: z.string().optional() }).optional(),
  choices: z.array(choice).optional(),
  estimate: z.string().optional(),
  display: z.record(str, str).optional(),
});
const derived = z.object({ ...provenance, key: str, label: str, unit: str, formula: str, shown: z.boolean().optional() });
const table = z.object({ ...provenance, label: str, unit: str, axes: z.array(z.object({ param: str, thresholds: z.array(str).min(1) })).min(1), values: z.array(z.array(str).min(1)).min(1) });
const points = z.object({ ...provenance, label: str, unit: str, keys: z.array(z.object({ variable: str, unit: str })).min(1), rows: z.array(z.array(str).min(2)).min(1), otherwise: str, admissible: z.object({ slot: str }).optional() });
const slot = z.object({
  key: str,
  family: str,
  label: str,
  keywords: z.array(str).optional(),
  usual: z.object({ text: str, source: str, productShort: z.string().optional(), productId: z.string().optional() }).optional(),
  measureOnly: z.literal(true).optional(),
});
const need = z.object({ ...provenance, id: str, slot: str, formula: str, unit: str, core: z.boolean(), exclusions: z.string().optional(), requires: z.array(str).optional(), when: z.string().optional() });
const workItem = z.object({
  id: str,
  trade: str,
  label: str,
  triggers: z.array(str).min(1),
  params: z.array(param),
  slots: z.array(slot).min(1),
  constants: z.record(str, fact),
  derived: z.array(derived).optional(),
  tables: z.record(str, table).optional(),
  points: z.record(str, points).optional(),
  needs: z.array(need).min(1),
});
const wasteRule = z.object({ ...provenance, family: str, product: z.string().optional(), workItem: z.string().optional(), rate: z.string().regex(/^\d+(\.\d+)?$/) });
const countedWork = z.object({ key: str, label: z.object({ one: str, many: str }), keywords: z.array(str).min(1) });

export const referentialSchema = z.object({
  id: str,
  version: str,
  trade: str,
  sources: z.array(source).min(1),
  families: z.array(family).min(1),
  products: z.array(product),
  workItems: z.array(workItem).min(1),
  wasteRules: z.array(wasteRule),
  countedWorks: z.array(countedWork).optional(),
});

export class ReferentialFileError extends Error {
  constructor(
    message: string,
    /** Chemins et fautes, un par ligne (« workItems.3.needs.0.formula : Required »). */
    readonly problems: string[],
  ) {
    super(message);
    this.name = "ReferentialFileError";
  }
}

/** La forme : chaque champ à sa place, du bon type. Renvoie le référentiel typé, ou l'erreur avec ses chemins. */
export function validateReferential(data: unknown): Referential {
  const r = referentialSchema.safeParse(data);
  if (!r.success) {
    const problems = r.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`);
    throw new ReferentialFileError(`Référentiel invalide (${problems.length} faute${problems.length > 1 ? "s" : ""}) : ${problems[0]}`, problems);
  }
  return r.data as Referential;
}

/** La forme, puis le sens : un référentiel qui ne passe pas les deux ne se charge pas. */
export function loadReferential(data: unknown): Referential {
  const ref = validateReferential(data);
  const problems = checkReferential(ref);
  if (problems.length > 0) throw new ReferentialFileError(`Référentiel ${ref.id}@${ref.version} incohérent : ${problems[0]}`, problems);
  return ref;
}
