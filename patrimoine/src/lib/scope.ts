import type { Op } from "./ops";
import type { AppData, Building, Company, Settings, Unit } from "./types";

// Périmètre de l'espace « gestion locative » : ce que l'accès gestion peut
// lire et modifier. Appliqué côté serveur (lecture filtrée, modifications
// triées), l'interface n'étant qu'un confort.

const COMPANY_READ: (keyof Company)[] = ["id", "name", "kind", "parentId", "address", "siren", "representative", "representativeRole", "email", "phone", "familySci"];
const COMPANY_WRITE: (keyof Company)[] = ["address", "siren", "representative", "representativeRole", "email", "phone", "familySci"];
const BUILDING_READ: (keyof Building)[] = [
  "id",
  "name",
  "companyId",
  "address",
  "city",
  "lotsCount",
  "rentMonthly",
  "condition",
  "zoneTendue",
  "rentControl",
  "legalRegime",
  "constructionPeriod",
  "commonFacilities",
];
const BUILDING_WRITE: (keyof Building)[] = ["address", "city", "zoneTendue", "rentControl", "legalRegime", "constructionPeriod", "commonFacilities"];
/** Champs du logement masqués à l'espace gestion. */
const UNIT_HIDDEN: (keyof Unit)[] = ["value"];
const SETTINGS_WRITE: (keyof Settings)[] = ["dismissedReminders"];

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function omit<T extends object>(obj: T, keys: (keyof T)[]): T {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

/** Données visibles par l'espace gestion. */
export function scopeForGestion(data: AppData): AppData {
  return {
    schemaVersion: data.schemaVersion,
    settings: { groupName: data.settings.groupName, leaseYears: data.settings.leaseYears, dismissedReminders: data.settings.dismissedReminders, theme: data.settings.theme, onboardingDone: true },
    companies: data.companies.map((c) => pick(c, COMPANY_READ) as Company),
    buildings: data.buildings.map((b) => pick(b, BUILDING_READ) as Building),
    units: data.units.map((u) => omit(u, UNIT_HIDDEN)),
    tenancies: data.tenancies,
    inspections: data.inspections,
    loans: [],
    works: [],
    events: [],
    withdrawals: [],
    plans: [],
    scenarios: [],
    statements: [],
    projects: [],
    documents: [],
  };
}

/**
 * Modifications autorisées pour l'espace gestion, fusionnées avec l'état
 * actuel (les champs masqués ne sont jamais écrasés). Les autres sont
 * ignorées.
 */
export function sanitizeGestionOps(current: AppData, ops: Op[]): Op[] {
  const out: Op[] = [];
  for (const o of ops) {
    if (o.op === "settings") {
      const patch = pick(o.patch as Settings, SETTINGS_WRITE);
      if (Object.keys(patch).length) out.push({ op: "settings", patch });
      continue;
    }
    if (o.op === "delete") {
      // Seuls les états des lieux et les brouillons de bail peuvent être supprimés.
      if (o.coll === "inspections") out.push(o);
      if (o.coll === "tenancies" && current.tenancies.find((t) => t.id === o.id)?.status === "brouillon") out.push(o);
      continue;
    }
    const item = o.item as Record<string, unknown> & { id: string };
    if (o.coll === "tenancies" || o.coll === "inspections") {
      out.push(o);
    } else if (o.coll === "units") {
      const existing = current.units.find((u) => u.id === item.id);
      if (!existing) continue; // pas de création de logement
      const hidden = pick(existing, UNIT_HIDDEN);
      out.push({ op: "upsert", coll: "units", item: { ...omit(item as unknown as Unit, UNIT_HIDDEN), ...hidden, id: existing.id, buildingId: existing.buildingId } as unknown as typeof item });
    } else if (o.coll === "buildings") {
      const existing = current.buildings.find((b) => b.id === item.id);
      if (!existing) continue;
      out.push({ op: "upsert", coll: "buildings", item: { ...existing, ...pick(item as unknown as Building, BUILDING_WRITE) } as unknown as typeof item });
    } else if (o.coll === "companies") {
      const existing = current.companies.find((c) => c.id === item.id);
      if (!existing) continue;
      out.push({ op: "upsert", coll: "companies", item: { ...existing, ...pick(item as unknown as Company, COMPANY_WRITE) } as unknown as typeof item });
    }
  }
  return out;
}
