"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { applyOps, type Op } from "./ops";
import type { AppData, Collection, Settings } from "./types";
import { currentMonth, type MonthIndex } from "./engine/dates";
import { project, type Projection } from "./engine/projection";

// Données de l'application côté navigateur : chaque modification est
// appliquée immédiatement à l'écran puis envoyée au serveur (sauvegarde
// automatique). Aucun bouton « Enregistrer ».

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface StoreValue {
  /** Espace connecté : propriétaire (tout) ou gestion locative (périmètre réduit). */
  role: "owner" | "gestion";
  /** Vue affichée : application complète ou espace gestion locative. */
  view: "patrimoine" | "gestion";
  data: AppData;
  version: number;
  status: SaveStatus;
  nowMonth: MonthIndex;
  projection: Projection;
  upsert: <T extends { id: string }>(coll: Collection, item: T) => void;
  remove: (coll: Collection, id: string | string[]) => void;
  removeMany: (items: { coll: Collection; id: string }[]) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: AppData, reason: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEBOUNCE_MS = 500;

export function StoreProvider({
  initialData,
  initialVersion,
  role = "owner",
  view = "patrimoine",
  children,
}: {
  initialData: AppData;
  initialVersion: number;
  role?: "owner" | "gestion";
  view?: "patrimoine" | "gestion";
  children: React.ReactNode;
}) {
  const [data, setData] = useState(initialData);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [nowMonth] = useState(() => currentMonth());

  const pending = useRef<Op[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef(false);
  const retryDelay = useRef(1000);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retry = useRef<() => void>(() => undefined);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (pending.current.length > 0) {
        const batch = pending.current;
        pending.current = [];
        setStatus("saving");
        try {
          const res = await fetch("/api/ops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ops: batch }),
          });
          if (res.status === 401) {
            window.location.href = "/connexion";
            return;
          }
          if (!res.ok) throw new Error(String(res.status));
          const json = await res.json();
          setVersion(json.version);
          retryDelay.current = 1000;
        } catch {
          pending.current = [...batch, ...pending.current];
          setStatus("error");
          const delay = retryDelay.current;
          retryDelay.current = Math.min(delay * 2, 30000);
          timer.current = setTimeout(() => retry.current(), delay);
          return;
        }
      }
      setStatus("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus("idle"), 2200);
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    retry.current = () => void flush();
  }, [flush]);

  const enqueue = useCallback(
    (ops: Op[], immediate = false) => {
      for (const op of ops) {
        // Fusionne les modifications successives d'un même élément.
        if (op.op === "upsert") {
          pending.current = pending.current.filter(
            (p) => !(p.op === "upsert" && p.coll === op.coll && p.item.id === op.item.id),
          );
        }
        pending.current.push(op);
      }
      setData((d) => applyOps(d, ops));
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), immediate ? 0 : DEBOUNCE_MS);
    },
    [flush],
  );

  const upsert = useCallback(
    <T extends { id: string }>(coll: Collection, item: T) => {
      enqueue([{ op: "upsert", coll, item: item as unknown as { id: string } & Record<string, unknown> }]);
    },
    [enqueue],
  );

  const removeMany = useCallback(
    (items: { coll: Collection; id: string }[]) => {
      if (items.length) enqueue(items.map((i) => ({ op: "delete" as const, coll: i.coll, id: i.id })), true);
    },
    [enqueue],
  );

  const remove = useCallback(
    (coll: Collection, id: string | string[]) => {
      removeMany((Array.isArray(id) ? id : [id]).map((x) => ({ coll, id: x })));
    },
    [removeMany],
  );

  const setSettings = useCallback(
    (patch: Partial<Settings>) => enqueue([{ op: "settings", patch }]),
    [enqueue],
  );

  const replaceAll = useCallback(
    async (next: AppData, reason: string) => {
      await flush();
      setStatus("saving");
      try {
        const res = await fetch("/api/replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: next, reason }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setData(json.data);
        setVersion(json.version);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2200);
        return true;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [flush],
  );

  const reload = useCallback(async () => {
    if (pending.current.length > 0 || flushing.current) return;
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/connexion";
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      if (pending.current.length === 0 && !flushing.current) {
        setData(json.data);
        setVersion(json.version);
      }
    } catch {
      /* hors ligne : on garde les données affichées */
    }
  }, []);

  // Rafraîchit au retour sur l'application (modifications faites sur un autre appareil)
  // et envoie immédiatement les modifications en attente quand on la quitte.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void reload();
      else if (pending.current.length > 0) {
        const body = JSON.stringify({ ops: pending.current });
        if (navigator.sendBeacon?.("/api/ops", new Blob([body], { type: "application/json" }))) {
          pending.current = [];
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reload]);

  const projection = useMemo(() => project(data, nowMonth), [data, nowMonth]);

  const value = useMemo<StoreValue>(
    () => ({ role, view, data, version, status, nowMonth, projection, upsert, remove, removeMany, setSettings, replaceAll, reload }),
    [role, view, data, version, status, nowMonth, projection, upsert, remove, removeMany, setSettings, replaceAll, reload],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore hors StoreProvider");
  return ctx;
}
