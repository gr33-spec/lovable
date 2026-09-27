import { COLLECTIONS, emptyData, type AppData, type Collection, type Settings } from "./types";

// Modifications élémentaires envoyées au serveur. Elles sont appliquées sur
// la dernière version enregistrée : deux appareils qui modifient des
// éléments différents ne s'écrasent pas.

export type Op =
  | { op: "upsert"; coll: Collection; item: { id: string } & Record<string, unknown> }
  | { op: "delete"; coll: Collection; id: string }
  | { op: "settings"; patch: Partial<Settings> };

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
      if (idx >= 0) list[idx] = o.item;
      else list.push(o.item);
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
      (out as unknown as Record<string, unknown>)[coll] = value.filter(
        (x) => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string",
      );
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
