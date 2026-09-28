"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, GripVertical, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Unit } from "@/lib/types";
import { eur } from "@/lib/format";
import { hasTenant, moveTenant, tenantLabel } from "@/lib/move-tenant";
import { toast } from "@/components/swipe";
import { Button, SelectField, Sheet, cx } from "@/components/ui";

// Déplacement d'un locataire vers un autre lot : on attrape son nom et on le
// lâche sur le bon lot (souris sur ordinateur, appui long puis glisser au
// doigt). Les lots ne bougent jamais ; lot occupé = échange des locataires.

/** Déplace (ou échange) un locataire, avec « Annuler ». */
export function useMoveTenant() {
  const { data, upsertMany } = useStore();
  return (from: Unit, to: Unit) => {
    const who = tenantLabel(data, from) || "Le locataire";
    const other = tenantLabel(data, to);
    const { changes, swap } = moveTenant(data, from, to);
    if (changes.length === 0) return;
    const before = changes
      .map((c) => ({ coll: c.coll, item: (data[c.coll] as { id: string }[]).find((x) => x.id === c.item.id) }))
      .filter((c): c is { coll: typeof c.coll; item: NonNullable<typeof c.item> } => !!c.item);
    upsertMany(changes);
    const lot = (u: Unit) => u.name.split(" · ")[0];
    toast(swap ? `Échange : ${who} → ${lot(to)}, ${other || "l'autre locataire"} → ${lot(from)}` : `${who} → ${lot(to)} (${lot(from)} libre)`, () => upsertMany(before as typeof changes));
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

/** Nom du locataire, à attraper pour le déplacer vers un autre lot. */
export function TenantHandle({ dnd, unitId, group, label, className }: { dnd: TenantDnd; unitId: string; group: string; label: string; className?: string }) {
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
      title="Glisser vers un autre lot pour déplacer le locataire"
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
        "inline-flex max-w-full cursor-grab select-none items-center gap-1 rounded-full bg-soft py-0.5 pl-1 pr-2 align-middle text-ink-2 ring-1 ring-line [-webkit-touch-callout:none] hover:bg-series-1/10 hover:text-navy active:cursor-grabbing",
        className,
      )}
    >
      <GripVertical size={13} className="shrink-0 text-muted" />
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
        <UserRound size={15} className="text-gold" />
        {d.label}
        <span className="font-normal text-white/70">{over ? `→ ${over.name.split(/\s[·(-]/)[0]}` : "→ choisir un lot"}</span>
      </div>
    </div>,
    document.body,
  );
}

// ——— Sans glisser : choisir le locataire puis son lot ———

export function MoveTenantSheet({ units, open, onClose }: { units: Unit[]; open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const move = useMoveTenant();
  const ua = units.find((u) => u.id === a);
  const ub = units.find((u) => u.id === b);
  const swap = ub ? hasTenant(data, ub) : false;
  const from = units.filter((u) => hasTenant(data, u)).map((u) => ({ value: u.id, label: `${tenantLabel(data, u) || "Locataire"} · ${u.name}${u.rent ? ` · ${eur(u.rent)}` : ""}` }));
  const to = units.filter((u) => u.id !== a).map((u) => ({ value: u.id, label: `${u.name} · ${hasTenant(data, u) ? tenantLabel(data, u) || "occupé" : "libre"}` }));

  const submit = () => {
    if (!ua || !ub) return;
    move(ua, ub);
    setA(undefined);
    setB(undefined);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Déplacer un locataire"
      footer={
        <Button full disabled={!ua || !ub} onClick={submit} icon={<ArrowRightLeft size={18} />}>
          {swap ? "Échanger les deux locataires" : "Déplacer le locataire"}
        </Button>
      }
    >
      <div className="space-y-3 pb-2">
        <p className="text-[14px] text-ink-2">
          Les lots ne bougent pas : seul le locataire change de lot, avec son bail, son loyer, ses encaissements, ses garants et ses documents. Astuce : vous pouvez aussi faire glisser son nom directement sur le bon lot.
        </p>
        <SelectField label="Locataire" value={a} options={from} onChange={setA} />
        <SelectField label="Vers le lot" value={b} options={to} onChange={setB} />
        {ua && ub && (
          <div className="rounded-2xl bg-soft px-4 py-3 text-[14px] text-ink">
            <div>
              <b>{tenantLabel(data, ua) || "Le locataire"}</b> <span className="text-muted">passe au</span> <b>{ub.name}</b>
            </div>
            <div className="mt-1">
              {swap ? (
                <>
                  <b>{tenantLabel(data, ub) || "Son locataire"}</b> <span className="text-muted">passe au</span> <b>{ua.name}</b>
                </>
              ) : (
                <>
                  <b>{ua.name}</b> <span className="text-muted">devient libre</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
