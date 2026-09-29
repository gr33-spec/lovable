"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { applyOps, type Op } from "./ops";
import { toast } from "./toast";
import type { AppData, Collection, Settings } from "./types";
import { currentMonth, type MonthIndex } from "./engine/dates";
import { project, type Projection } from "./engine/projection";

// Données de l'application côté navigateur : chaque modification est
// appliquée immédiatement à l'écran puis envoyée au serveur (sauvegarde
// automatique). Aucun bouton « Enregistrer ».

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface StoreValue {
  /** Espace connecté : propriétaire (tout) ou gestion locative (périmètre réduit). */
  role: "owner" | "gestion" | "lecture";
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
  /** Plusieurs créations / modifications enregistrées ensemble (une seule requête). */
  upsertMany: (items: { coll: Collection; item: { id: string } }[]) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: AppData, reason: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEBOUNCE_MS = 500;

// Modifications pas encore confirmées par le serveur, gardées sur l'appareil :
// une coupure réseau ou un onglet fermé trop tôt ne fait rien perdre ; elles
// sont renvoyées à la prochaine ouverture (les opérations sont idempotentes).
// Effacées dès l'enregistrement, et à la déconnexion.
export const PENDING_KEY = "patrimoine-en-attente";
const PENDING_MAX_AGE = 7 * 24 * 3600 * 1000;

function savePending(role: string, ops: Op[]) {
  try {
    if (ops.length) localStorage.setItem(PENDING_KEY, JSON.stringify({ role, at: Date.now(), ops }));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* stockage indisponible : la file reste en mémoire */
  }
}

function loadPending(role: string): Op[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
    if (!raw || raw.role !== role || Date.now() - raw.at > PENDING_MAX_AGE || !Array.isArray(raw.ops)) return [];
    return raw.ops as Op[];
  } catch {
    return [];
  }
}

/** Refus définitif du serveur (modification invalide ou non autorisée) : inutile de réessayer. */
const REJECTED = new Set([400, 403, 413, 422]);

export function StoreProvider({
  initialData,
  initialVersion,
  role = "owner",
  view = "patrimoine",
  children,
}: {
  initialData: AppData;
  initialVersion: number;
  role?: "owner" | "gestion" | "lecture";
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

  const send = async (ops: Op[]) =>
    fetch("/api/ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops }) });

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
          let res = await send(batch);
          if (res.status === 401) {
            pending.current = [...batch, ...pending.current];
            savePending(role, pending.current);
            window.location.replace("/connexion");
            return;
          }
          if (REJECTED.has(res.status)) {
            // Une modification refusée ne doit pas bloquer les autres : envoi une à une,
            // seules celles que le serveur refuse sont abandonnées (et signalées).
            let refused = 0;
            for (const op of batch) {
              res = await send([op]);
              if (REJECTED.has(res.status)) refused++;
              else if (!res.ok) throw new Error(String(res.status));
              else setVersion((await res.json()).version);
            }
            if (refused) toast(refused > 1 ? `${refused} modifications n'ont pas pu être enregistrées.` : "Une modification n'a pas pu être enregistrée.");
          } else {
            if (!res.ok) throw new Error(String(res.status));
            setVersion((await res.json()).version);
          }
          retryDelay.current = 1000;
          savePending(role, pending.current);
        } catch {
          pending.current = [...batch, ...pending.current];
          savePending(role, pending.current);
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
  }, [role]);

  useEffect(() => {
    retry.current = () => void flush();
  }, [flush]);

  const enqueue = useCallback(
    (ops: Op[], immediate = false) => {
      // Consultation : on peut tout ouvrir, rien n'est modifié (le serveur refuse de toute façon).
      if (role === "lecture") {
        toast("Mode consultation : aucune modification n'est enregistrée.");
        return;
      }
      for (const op of ops) {
        // Fusionne les modifications successives d'un même élément.
        if (op.op === "upsert") {
          pending.current = pending.current.filter(
            (p) => !(p.op === "upsert" && p.coll === op.coll && p.item.id === op.item.id),
          );
        }
        pending.current.push(op);
      }
      savePending(role, pending.current);
      setData((d) => applyOps(d, ops));
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), immediate ? 0 : DEBOUNCE_MS);
    },
    [flush, role],
  );

  const upsert = useCallback(
    <T extends { id: string }>(coll: Collection, item: T) => {
      enqueue([{ op: "upsert", coll, item: item as unknown as { id: string } & Record<string, unknown> }]);
    },
    [enqueue],
  );

  const upsertMany = useCallback(
    (items: { coll: Collection; item: { id: string } }[]) => {
      if (items.length) enqueue(items.map((i) => ({ op: "upsert" as const, coll: i.coll, item: i.item as { id: string } & Record<string, unknown> })), true);
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
      if (role === "lecture") {
        toast("Mode consultation : aucune modification n'est enregistrée.");
        return false;
      }
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
    [flush, role],
  );

  const reload = useCallback(async () => {
    if (pending.current.length > 0 || flushing.current) return;
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) {
        window.location.replace("/connexion");
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
        // Envoi de dernière chance ; la file est gardée (sur l'appareil aussi) et
        // renvoyée au retour si besoin : réenvoyer une modification est sans effet.
        const body = JSON.stringify({ ops: pending.current });
        navigator.sendBeacon?.("/api/ops", new Blob([body], { type: "application/json" }));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reload]);

  // Modifications restées en attente (coupure, onglet fermé) : réappliquées et renvoyées.
  useEffect(() => {
    if (role === "lecture") return;
    const left = loadPending(role);
    if (!left.length) return;
    pending.current = [...left, ...pending.current];
    timer.current = setTimeout(() => {
      setData((d) => applyOps(d, left));
      void flush();
    }, 0);
  }, [role, flush]);

  // Réseau revenu : envoi immédiat, sans attendre le prochain essai.
  useEffect(() => {
    const online = () => {
      if (pending.current.length) void flush();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [flush]);

  const projection = useMemo(() => project(data, nowMonth), [data, nowMonth]);

  const value = useMemo<StoreValue>(
    () => ({ role, view, data, version, status, nowMonth, projection, upsert, upsertMany, remove, removeMany, setSettings, replaceAll, reload }),
    [role, view, data, version, status, nowMonth, projection, upsert, upsertMany, remove, removeMany, setSettings, replaceAll, reload],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore hors StoreProvider");
  return ctx;
}
