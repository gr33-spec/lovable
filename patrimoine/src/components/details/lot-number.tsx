"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, GripVertical, Hash } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { eur } from "@/lib/format";
import { renumber, swappedNames, tenantLabel } from "@/lib/lots";
import { toast } from "@/components/swipe";
import { Button, SelectField, Sheet, cx } from "@/components/ui";

// Correction d'un numéro de lot : on attrape le lot et on le lâche sur le bon
// numéro (souris sur ordinateur, appui long puis glisser au doigt). Seuls les
// deux numéros s'échangent : logement, locataire, bail, loyer et documents
// restent ensemble. La liste reste dans l'ordre des numéros.

const lotNo = (name: string) => name.split(/\s[·(-]/)[0].trim();

/** Échange les numéros de deux lots, avec « Annuler ». */
export function useSwapNumbers() {
  const { data, upsertMany } = useStore();
  return (from: Unit, to: Unit) => {
    const changes = renumber(data, from, to);
    if (changes.length === 0) return;
    const before = changes
      .map((c) => ({ coll: c.coll, item: (data[c.coll] as { id: string }[]).find((x) => x.id === c.item.id) }))
      .filter((c): c is { coll: typeof c.coll; item: NonNullable<typeof c.item> } => !!c.item);
    upsertMany(changes);
    const [na] = swappedNames(from, to);
    toast(`${lotNo(from.name)} devient ${lotNo(na)} (et ${lotNo(to.name)} devient ${lotNo(from.name)})`, () => upsertMany(before as typeof changes));
  };
}

// ——— Glisser-déposer (souris et doigt) ———

interface DragState {
  id: string;
  group: string;
  label: string;
  x: number;
  y: number;
}

const LONG_PRESS_MS = 350;
const EDGE = 70;

export interface TenantDnd {
  drag: DragState | null;
  overId: string | null;
  start: (s: DragState) => void;
  move: (x: number, y: number) => void;
  end: (drop: boolean) => void;
}

/** Suivi du glisser : lot survolé, défilement automatique près des bords, dépôt. */
export function useTenantDnd(onDrop: (fromId: string, toId: string) => void): TenantDnd {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const cur = useRef<{ drag: DragState | null; over: string | null; raf: number }>({ drag: null, over: null, raf: 0 });
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  const target = (x: number, y: number) => {
    const d = cur.current.drag;
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-unit]");
    const id = el?.dataset.dropUnit;
    const over = d && id && id !== d.id && el?.dataset.dropGroup === d.group ? id : null;
    if (over !== cur.current.over) {
      cur.current.over = over;
      setOverId(over);
    }
  };

  const scrollLoop = () => {
    const d = cur.current.drag;
    if (!d) return;
    const h = window.innerHeight;
    const speed = d.y < EDGE ? -Math.ceil((EDGE - d.y) / 6) : d.y > h - EDGE ? Math.ceil((d.y - (h - EDGE)) / 6) : 0;
    if (speed) {
      window.scrollBy(0, speed);
      target(d.x, d.y);
    }
    cur.current.raf = requestAnimationFrame(scrollLoop);
  };

  return {
    drag,
    overId,
    start: (s) => {
      cur.current.drag = s;
      setDrag(s);
      document.body.style.userSelect = "none";
      navigator.vibrate?.(12);
      cur.current.raf = requestAnimationFrame(scrollLoop);
    },
    move: (x, y) => {
      const d = cur.current.drag;
      if (!d) return;
      const next = { ...d, x, y };
      cur.current.drag = next;
      setDrag(next);
      target(x, y);
    },
    end: (drop) => {
      const d = cur.current.drag;
      const over = cur.current.over;
      cancelAnimationFrame(cur.current.raf);
      cur.current = { drag: null, over: null, raf: 0 };
      setDrag(null);
      setOverId(null);
      document.body.style.userSelect = "";
      if (!d) return;
      // Le relâchement ne doit pas ouvrir la fiche du lot.
      const block = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      window.addEventListener("click", block, true);
      setTimeout(() => window.removeEventListener("click", block, true), 400);
      if (drop && over) dropRef.current(d.id, over);
    },
  };
}

/** Attributs d'un lot qui peut recevoir un locataire. */
export function dropTarget(dnd: TenantDnd, unitId: string, group: string) {
  const d = dnd.drag;
  return {
    "data-drop-unit": unitId,
    "data-drop-group": group,
    className: cx(
      "relative rounded-xl transition",
      d && d.group === group && d.id !== unitId && "ring-1 ring-dashed ring-series-1/40",
      dnd.overId === unitId && "bg-series-1/10 !ring-2 !ring-series-1",
      d?.id === unitId && "opacity-40",
    ),
  };
}

/** Numéro du lot, à attraper pour le lâcher sur le bon numéro. */
export function LotHandle({ dnd, unitId, group, label, className }: { dnd: TenantDnd; unitId: string; group: string; label: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const api = useRef(dnd);
  useEffect(() => {
    api.current = dnd;
  });

  // Doigt : appui long, puis glisser. Écouteurs natifs (non passifs) pour bloquer le défilement pendant le glisser.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let origin: { x: number; y: number } | null = null;
    let active = false;
    const reset = () => {
      clearTimeout(timer);
      origin = null;
      active = false;
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return reset();
      const t = e.touches[0];
      origin = { x: t.clientX, y: t.clientY };
      timer = window.setTimeout(() => {
        if (!origin) return;
        active = true;
        api.current.start({ id: unitId, group, label, x: origin.x, y: origin.y });
      }, LONG_PRESS_MS);
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!origin || !t) return;
      if (active) {
        e.preventDefault();
        api.current.move(t.clientX, t.clientY);
      } else if (Math.hypot(t.clientX - origin.x, t.clientY - origin.y) > 10) reset();
    };
    const onEnd = (e: TouchEvent) => {
      if (active) {
        e.preventDefault();
        api.current.end(e.type === "touchend");
      }
      reset();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      reset();
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [unitId, group, label]);

  return (
    <span
      ref={ref}
      data-noswipe
      data-tenant-handle
      title="Glisser sur le bon numéro pour corriger la numérotation"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        // Souris : le glisser commence dès que la souris bouge, bouton enfoncé.
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        e.preventDefault();
        const origin = { x: e.clientX, y: e.clientY };
        let active = false;
        const move = (ev: PointerEvent) => {
          if (!active) {
            if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 5) return;
            active = true;
            api.current.start({ id: unitId, group, label, x: ev.clientX, y: ev.clientY });
          }
          api.current.move(ev.clientX, ev.clientY);
        };
        const up = (ev: PointerEvent) => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          if (active) api.current.end(ev.type === "pointerup");
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      }}
      className={cx(
        "-ml-1 inline-flex max-w-full cursor-grab select-none items-center gap-1 rounded-lg px-1 align-middle [-webkit-touch-callout:none] hover:bg-series-1/10 active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical size={14} className="shrink-0 text-muted/70" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Étiquette qui suit le doigt ou la souris pendant le glisser. */
export function DragGhost({ dnd, units }: { dnd: TenantDnd; units: Unit[] }) {
  const d = dnd.drag;
  if (!d || typeof document === "undefined") return null;
  const over = units.find((u) => u.id === dnd.overId);
  return createPortal(
    <div className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-[130%]" style={{ left: d.x, top: d.y }}>
      <div className="flex items-center gap-2 whitespace-nowrap rounded-full bg-navy px-3.5 py-2 text-[13.5px] font-semibold text-white shadow-xl">
        <Hash size={15} className="text-gold" />
        {d.label}
        <span className="font-normal text-white/70">{over ? `→ devient ${lotNo(over.name)}` : "→ choisir le bon numéro"}</span>
      </div>
    </div>,
    document.body,
  );
}

// ——— Sans glisser : choisir le lot puis son vrai numéro ———

export function SwapNumbersSheet({ units, open, onClose }: { units: Unit[]; open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const swap = useSwapNumbers();
  const ua = units.find((u) => u.id === a);
  const ub = units.find((u) => u.id === b);
  const names = ua && ub ? swappedNames(ua, ub) : undefined;
  const label = (u: Unit) => [u.name, u.status === "vacant" ? "vacant" : tenantLabel(data, u), u.rent ? eur(u.rent) : undefined].filter(Boolean).join(" · ");

  const submit = () => {
    if (!ua || !ub) return;
    swap(ua, ub);
    setA(undefined);
    setB(undefined);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Corriger un numéro de lot"
      footer={
        <Button full disabled={!names} onClick={submit} icon={<ArrowRightLeft size={18} />}>
          Échanger les numéros
        </Button>
      }
    >
      <div className="space-y-3 pb-2">
        <p className="text-[14px] text-ink-2">
          Seul le numéro change : chaque logement garde son locataire, son bail, son loyer et ses documents. Astuce : vous pouvez aussi faire glisser le lot directement sur le bon numéro.
        </p>
        <SelectField label="Lot mal numéroté" value={a} options={units.map((u) => ({ value: u.id, label: label(u) }))} onChange={setA} />
        <SelectField label="Son vrai numéro" value={b} options={units.filter((u) => u.id !== a).map((u) => ({ value: u.id, label: lotNo(u.name) }))} onChange={setB} />
        {ua && ub && names && (
          <div className="rounded-2xl bg-soft px-4 py-3 text-[14px] text-ink">
            <div>
              {label(ua)} <span className="text-muted">devient</span> <b>{lotNo(names[0])}</b>
            </div>
            <div className="mt-1">
              {label(ub)} <span className="text-muted">devient</span> <b>{lotNo(names[1])}</b>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
