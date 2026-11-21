import { z } from "zod";
import type { Collection } from "./types";

// Contrôle des données reçues par le serveur. Chaque champ connu doit avoir
// le bon type et une valeur plausible : un montant est un nombre fini et
// positif, un taux est compris entre 0 et 20 %, une date a la forme
// AAAA-MM-JJ (ou AAAA-MM). Les champs inconnus restent acceptés (données
// anciennes, évolutions) : seul ce qui est manifestement faux est refusé.
// Une valeur absente (undefined ou null) est toujours acceptée.

const opt = <T extends z.ZodTypeAny>(t: T) => t.nullable().optional();
const money = opt(z.number().finite().min(0).max(1e10));
const signedMoney = opt(z.number().finite().min(-1e10).max(1e10));
const count = (max: number) => opt(z.number().int().min(0).max(max));
const pct = (max: number) => opt(z.number().finite().min(0).max(max));
const date = opt(z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "date attendue au format AAAA-MM-JJ"));
const ref = opt(z.string().max(100));
const text = (max = 5000) => opt(z.string().max(max));
const oneOf = (values: readonly [string, ...string[]]) => opt(z.enum(values));

const scheduleRow = z.looseObject({
  month: z.string().regex(/^\d{4}-\d{2}/),
  payment: z.number().finite(),
  interest: z.number().finite(),
  principal: z.number().finite(),
  balance: z.number().finite(),
  insurance: opt(z.number().finite()),
});

const SCHEMAS: Partial<Record<Collection, z.ZodTypeAny>> = {
  companies: z.looseObject({
    name: text(200),
    kind: oneOf(["holding", "SCI", "SC", "SARL", "SAS", "autre"]),
    parentId: ref,
    ownershipPct: pct(100),
    cash: signedMoney,
    partnerAccounts: signedMoney,
  }),
  buildings: z.looseObject({
    name: text(200),
    kind: oneOf(["immeuble", "maison", "appartement", "local", "hangar", "terrain", "parking", "autre"]),
    usage: oneOf(["location", "residence_principale", "residence_secondaire", "professionnel", "vacant"]),
    companyId: ref,
    acquisitionDate: date,
    acquisitionPrice: money,
    value: money,
    surface: money,
    pricePerSqm: money,
    lotsCount: count(2000),
    rentMonthly: money,
    propertyTax: money,
    insurance: money,
    accounting: money,
    otherCharges: money,
  }),
  units: z.looseObject({
    buildingId: ref,
    name: text(200),
    rent: money,
    charges: money,
    surface: money,
    value: money,
    status: oneOf(["occupe", "vacant"]),
    entryDate: date,
  }),
  loans: z.looseObject({
    name: text(200),
    bank: text(200),
    reference: text(100),
    buildingId: ref,
    companyId: ref,
    kind: oneOf(["amortissable", "in_fine"]),
    rateType: oneOf(["fixe", "variable"]),
    initialAmount: money,
    remaining: money,
    remainingDate: date,
    startDate: date,
    endDate: date,
    monthlyPayment: money,
    ratePct: pct(20),
    insuranceMonthly: money,
    durationMonths: opt(z.number().int().min(1).max(600)),
    schedule: opt(z.looseObject({ rows: z.array(scheduleRow).max(1200) })),
  }),
  tenancies: z.looseObject({
    unitId: ref,
    status: oneOf(["brouillon", "actif", "sortie", "clos"]),
    startDate: date,
    rent: money,
    charges: money,
  }),
  works: z.looseObject({
    label: text(300),
    amount: money,
    year: opt(z.number().int().min(1900).max(2200)),
    status: oneOf(["envisage", "prevu", "en_cours", "termine"]),
  }),
  statements: z.looseObject({
    companyId: ref,
    year: opt(z.number().int().min(1900).max(2200)),
  }),
  documents: z.looseObject({
    fileId: z.string().min(1).max(100),
    name: text(300),
    date: date,
  }),
};

export interface ValidationError {
  coll: Collection;
  id: string;
  message: string;
}

const LABEL: Partial<Record<Collection, string>> = { companies: "Société", buildings: "Bien", units: "Logement", loans: "Crédit", tenancies: "Bail", works: "Travaux", statements: "Bilan", documents: "Document" };

/** Élément refusé ? Renvoie une explication lisible (champ et raison), sinon undefined. */
export function validateItem(coll: Collection, item: { id: string } & Record<string, unknown>): ValidationError | undefined {
  const schema = SCHEMAS[coll];
  if (!schema) return undefined;
  const r = schema.safeParse(item);
  if (r.success) return undefined;
  const first = r.error.issues[0];
  const field = first?.path.join(".") || "valeur";
  const name = typeof item.name === "string" && item.name ? ` « ${item.name} »` : "";
  return { coll, id: item.id, message: `${LABEL[coll] ?? "Élément"}${name} : ${field} invalide (${first?.message ?? "valeur incorrecte"})` };
}

/** Toutes les anomalies d'un jeu de données (contrôle d'une sauvegarde ou des données existantes). */
export function validateData(data: Record<string, unknown>): ValidationError[] {
  const out: ValidationError[] = [];
  for (const coll of Object.keys(SCHEMAS) as Collection[]) {
    const list = data[coll];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const e = validateItem(coll, item as { id: string } & Record<string, unknown>);
      if (e) out.push(e);
    }
  }
  return out;
}
