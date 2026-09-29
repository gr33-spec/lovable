"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Ellipsis, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { expandRemoval, removalBackup } from "@/lib/removal";
import type { Collection } from "@/lib/types";
import { cx } from "./ui";
import { currentToast, dismissToast, subscribeToast, toast } from "@/lib/toast";

// Balayage vers la gauche d'une ligne : fait apparaître ses actions (supprimer,
// ignorer, marquer payé…). Un balayage complet déclenche la dernière action.
// Chaque action peut être annulée depuis le bandeau qui s'affiche ensuite.

export type SwipeTone = "neg" | "pos" | "warn" | "blue" | "neutral";

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  tone?: SwipeTone;
  onAction: () => void;
}

const TONES: Record<SwipeTone, string> = {
  neg: "bg-neg text-white",
  pos: "bg-pos text-white",
  warn: "bg-warn text-white",
  blue: "bg-series-1 text-white",
  neutral: "bg-ink-2 text-white",
};

const ACTION_WIDTH = 84;
// Une seule ligne ouverte à la fois.
const OPEN_EVENT = "swipe-row-open";

/** `inset` : la ligne s'étend sous la marge intérieure de la carte (p-5 par défaut) pour que les actions touchent le bord. */
export function SwipeRow({ actions, children, className, inset = true }: { actions: SwipeAction[]; children: React.ReactNode; className?: string; inset?: boolean }) {
  const id = useRef(useId());
  const [x, setXState] = useState(0);
  // Position lue par les gestionnaires (l'état React peut ne pas être encore rendu).
  const xRef = useRef(0);
  const setX = useCallback((v: number) => {
    xRef.current = v;
    setXState(v);
  }, []);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horizontal?: boolean } | null>(null);
  const moved = useRef(false);
  const width = actions.length * ACTION_WIDTH;

  useEffect(() => {
    const close = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id.current) setX(0);
    };
    window.addEventListener(OPEN_EVENT, close);
    return () => window.removeEventListener(OPEN_EVENT, close);
  }, [setX]);

  const run = (a: SwipeAction) => {
    setX(0);
    a.onAction();
  };

  if (actions.length === 0) return <div className={className}>{children}</div>;

  return (
    <div className={cx("group relative overflow-hidden", inset && "-mx-5", className)}>
      <div className={cx("absolute inset-y-0 right-0 flex", x === 0 && !dragging && "invisible")} style={{ width: Math.max(width, -x) }} aria-hidden={x === 0}>
        {actions.map((a, i) => (
          <button
            key={a.label}
            type="button"
            tabIndex={x === 0 ? -1 : 0}
            onClick={() => run(a)}
            className={cx("flex h-full flex-1 flex-col items-center justify-center gap-1 px-2 text-[11.5px] font-semibold", TONES[a.tone ?? "neutral"], i === actions.length - 1 && -x > width + 40 && "flex-[3]")}
          >
            {a.icon}
            <span className="leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
      <div
        className={cx("relative", (x !== 0 || dragging) && "bg-card", inset && "px-5", !dragging && "transition-transform duration-200")}
        style={{ transform: `translateX(${x}px)`, touchAction: "pan-y" }}
        onDragStart={(e) => {
          // Pas de glisser natif des liens pendant un balayage (sauf poignée prévue pour).
          if (!(e.target as HTMLElement).closest?.("[data-drag]")) e.preventDefault();
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if ((e.target as HTMLElement).closest("input, textarea, select, [data-noswipe]")) return;
          start.current = { x: e.clientX, y: e.clientY, base: xRef.current };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (s.horizontal === undefined) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            s.horizontal = Math.abs(dx) > Math.abs(dy);
            if (s.horizontal) {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDragging(true);
              window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
            }
          }
          if (!s.horizontal) return;
          moved.current = true;
          setX(Math.min(0, s.base + dx));
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          setDragging(false);
          if (!s?.horizontal) return;
          const rowWidth = (e.currentTarget as HTMLElement).offsetWidth;
          const pos = -xRef.current;
          if (pos > rowWidth * 0.6) run(actions[actions.length - 1]);
          else setX(pos > width / 2 ? -width : 0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setX(0);
        }}
        onClickCapture={(e) => {
          // Un balayage n'est pas un appui ; une ligne ouverte se referme au toucher.
          if (moved.current) {
            // Fin d'un balayage : pas un appui.
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          } else if (xRef.current !== 0) {
            // Appui sur une ligne ouverte : elle se referme.
            e.preventDefault();
            e.stopPropagation();
            setX(0);
          }
        }}
      >
        {children}
        {/* Souris : bouton d'actions au survol (le balayage n'est pas évident sur ordinateur). */}
        {x === 0 && (
          <button
            type="button"
            aria-label="Actions"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
              setX(-width);
            }}
            className={cx("absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-soft text-ink-2 shadow-sm ring-1 ring-black/5 [@media(hover:hover)]:group-hover:flex", inset ? "right-3" : "right-2")}
          >
            <Ellipsis size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ——— Bandeau « Annuler » ———

export { toast } from "@/lib/toast";

export function ToastHost() {
  const t = useSyncExternalStore(subscribeToast, currentToast, () => null);
  if (!t) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[70] flex justify-center px-4 lg:bottom-6 lg:pl-64">
      <div key={t.id} className="animate-fade pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-[14px] text-white shadow-lg">
        <span className="min-w-0 flex-1">{t.message}</span>
        {t.undo && (
          <button
            onClick={() => {
              t.undo?.();
              dismissToast();
            }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-bold"
          >
            <RotateCcw size={14} /> Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// ——— Suppression annulable ———

/** Supprime des éléments et propose de les rétablir (ils sont remis à l'identique). */
export function useUndoableRemove() {
  const { data, removeMany, upsertMany } = useStore();
  return useCallback(
    (items: { coll: Collection; id: string }[], message = "Supprimé") => {
      // Règle unique (lib/removal) : dépendances supprimées, documents conservés et remontés.
      const plan = expandRemoval(data, items);
      const saved = removalBackup(data, { ...plan, counts: {}, keptDocuments: 0 });
      removeMany(plan.removes);
      if (plan.updates.length) upsertMany(plan.updates);
      toast(message, () => upsertMany(saved));
    },
    [data, removeMany, upsertMany],
  );
}

/** Modification annulable d'un élément (l'ancienne version est remise). */
export function useUndoableUpdate() {
  const { upsert, upsertMany } = useStore();
  return useCallback(
    <T extends { id: string }>(coll: Collection, before: T, after: T, message: string) => {
      upsert(coll, after);
      toast(message, () => upsertMany([{ coll, item: before }]));
    },
    [upsert, upsertMany],
  );
}

/** Rappel ignoré (annulable). */
export function useDismiss() {
  const { data, setSettings } = useStore();
  return useCallback(
    (id: string, message = "Rappel ignoré") => {
      const before = data.settings.dismissedReminders ?? [];
      setSettings({ dismissedReminders: [...before, id] });
      toast(message, () => setSettings({ dismissedReminders: before }));
    },
    [data.settings.dismissedReminders, setSettings],
  );
}

/** Ligne supprimable par balayage (annulable), avec éventuellement d'autres actions avant. */
export function SwipeDelete({
  items,
  message = "Supprimé",
  label = "Supprimer",
  extra = [],
  children,
  inset,
  className,
}: {
  items: { coll: Collection; id: string }[];
  message?: string;
  label?: string;
  extra?: SwipeAction[];
  children: React.ReactNode;
  inset?: boolean;
  className?: string;
}) {
  const removeUndoable = useUndoableRemove();
  return (
    <SwipeRow inset={inset} className={className} actions={[...extra, { label, icon: <Trash2 size={18} />, tone: "neg", onAction: () => removeUndoable(items, message) }]}>
      {children}
    </SwipeRow>
  );
}
