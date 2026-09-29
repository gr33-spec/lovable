import { COLLECTIONS, emptyData, type AppData, type Collection, type Settings } from "./types";

// Modifications élémentaires envoyées au serveur. Elles sont appliquées sur
// la dernière version enregistrée : deux appareils qui modifient des
// éléments différents ne s'écrasent pas.

export type Op =
  | {
      op: "upsert";
      coll: Collection;
      item: { id: string } & Record<string, unknown>;
      /**
       * État de l'élément avant la modification (tel que l'appareil le
       * connaissait). Seuls les champs réellement modifiés sont alors
       * appliqués : un onglet resté ouvert n'efface pas les changements
       * faits entre-temps ailleurs sur d'autres champs.
       */
      base?: { id: string } & Record<string, unknown>;
    }
  | { op: "delete"; coll: Collection; id: string }
  | { op: "settings"; patch: Partial<Settings> };

/**
 * Structure minimale de chaque élément : un élément incomplet (import ancien,
 * appel direct de l'API…) est complété avec des valeurs vides au lieu de
 * faire planter les écrans qui le lisent.
 */
const SHAPE: Partial<Record<Collection, Record<string, "str" | "arr" | "obj">>> = {
  companies: { name: "str" },
  buildings: { name: "str" },
  units: { name: "str", buildingId: "str" },
  works: { label: "str" },
  events: { label: "str" },
  scenarios: { name: "str", actions: "arr" },
  statements: { companyId: "str", figures: "obj" },
  tenancies: { unitId: "str", tenants: "arr" },
  inspections: { tenancyId: "str", unitId: "str", rooms: "arr", meters: "arr", keys: "arr" },
  projects: { name: "str", lots: "arr", costs: "arr", loans: "arr" },
  documents: { name: "str", fileId: "str" },
};

export function repairItem<T extends { id: string }>(coll: Collection, item: T): T {
  const shape = SHAPE[coll];
  if (!shape) return item;
  let out: Record<string, unknown> | undefined;
  for (const [key, kind] of Object.entries(shape)) {
    const v = (item as Record<string, unknown>)[key];
    const ok = kind === "str" ? typeof v === "string" : kind === "arr" ? Array.isArray(v) : !!v && typeof v === "object" && !Array.isArray(v);
    if (!ok) (out ??= { ...(item as Record<string, unknown>) })[key] = kind === "str" ? "" : kind === "arr" ? [] : {};
  }
  return (out as T | undefined) ?? item;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Applique à `current` uniquement les champs qui diffèrent entre `base` et `next`. */
export function mergeChanges(current: Record<string, unknown>, base: Record<string, unknown>, next: { id: string } & Record<string, unknown>): { id: string } & Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (key === "id" || same(base[key], next[key])) continue;
    if (next[key] === undefined) delete out[key];
    else out[key] = next[key];
  }
  return { ...out, id: next.id };
}

export function applyOps(data: AppData, ops: Op[]): AppData {
  const next: AppData = { ...data, settings: { ...data.settings } };
  for (const o of ops) {
    if (o.op === "settings") {
      next.settings = { ...next.settings, ...o.patch };
      continue;
    }
    if (!COLLECTIONS.includes(o.coll)) continue;
    const list = [...(next[o.coll] as { id: string }[])];
    if (o.op === "upsert") {
      const idx = list.findIndex((x) => x.id === o.item.id);
      const item = repairItem(o.coll, idx >= 0 && o.base?.id === o.item.id ? mergeChanges(list[idx] as Record<string, unknown>, o.base, o.item) : o.item);
      if (idx >= 0) list[idx] = item;
      else list.push(item);
    } else {
      const idx = list.findIndex((x) => x.id === o.id);
      if (idx >= 0) list.splice(idx, 1);
    }
    (next as unknown as Record<string, unknown>)[o.coll] = list;
  }
  return next;
}

/** Normalise un document chargé (sauvegarde importée, ancienne version…). */
export function normalizeData(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const out: AppData = { ...base };
  out.settings = obj.settings && typeof obj.settings === "object" ? (obj.settings as Settings) : {};
  for (const coll of COLLECTIONS) {
    const value = obj[coll];
    if (Array.isArray(value)) {
      (out as unknown as Record<string, unknown>)[coll] = value
        .filter((x) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string")
        .map((x) => repairItem(coll, x as { id: string }));
    }
  }
  return out;
}

export function isValidBackup(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  // Un fichier de compléments (ou tout autre format) n'est jamais une sauvegarde.
  if (typeof obj.type === "string" && obj.type !== "backup") return false;
  const data = (obj.data ?? obj) as Record<string, unknown>;
  if (!(COLLECTIONS.some((c) => Array.isArray(data[c])) && Array.isArray(data.companies))) return false;
  // Chaque élément d'une sauvegarde porte un identifiant : sinon l'import viderait les données.
  return COLLECTIONS.every((c) => {
    const list = data[c];
    return !Array.isArray(list) || list.every((x) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string");
  });
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
