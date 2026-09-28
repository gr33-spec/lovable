"use client";

import { useState } from "react";
import { BadgeEuro, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { SaleAction } from "@/lib/types";
import { eur, eurCompact } from "@/lib/format";
import { monthLabel } from "@/lib/engine/dates";
import { saleLabel, salePrice } from "@/lib/engine/sale";
import { SwipeDelete } from "@/components/swipe";
import { Pill } from "@/components/ui";
import { SaleSheet } from "./sheet";

/** Ventes prévues (toutes, ou celles d'un immeuble) : appui = modifier, balayage = supprimer. */
export function SalesList({ buildingId, openId }: { buildingId?: string; openId?: string }) {
  const { data, projection } = useStore();
  const [editing, setEditing] = useState<string | null>(openId ?? null);
  const sales = data.plans.filter((p): p is SaleAction => p.type === "sale" && (!buildingId || p.buildingId === buildingId));
  if (sales.length === 0) return null;
  return (
    <>
      <div className="divide-y divide-line">
        {sales.map((s) => {
          const r = projection.sales.find((x) => x.actionId === s.id);
          const price = salePrice(s);
          return (
            <SwipeDelete key={s.id} items={[{ coll: "plans", id: s.id }]} message="Vente prévue supprimée">
              <button onClick={() => setEditing(s.id)} className="flex w-full items-center gap-3 py-3 text-left active:opacity-60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pos/10 text-pos">
                  <BadgeEuro size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-ink">{buildingId ? (s.lots ? `${s.lots.length} lot${s.lots.length > 1 ? "s" : ""}` : "Tout l'immeuble") : saleLabel(data, s)}</span>
                    {s.underOffer && <Pill tone="pos">Compromis</Pill>}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {r ? monthLabel(r.month) : s.year}
                    {r?.netCash !== undefined ? ` · net ${eurCompact(r.netCash)}` : ""}
                    {r && r.rentLostMonthly > 0 ? ` · −${eur(Math.round(r.rentLostMonthly))} de loyers/mois` : ""}
                  </span>
                </span>
                <span className="tabular shrink-0 text-[15px] font-semibold text-ink">{price !== undefined ? eurCompact(price) : "Prix ?"}</span>
                <ChevronRight size={16} className="shrink-0 text-muted/70" />
              </button>
            </SwipeDelete>
          );
        })}
      </div>
      <SaleSheet sale={sales.find((s) => s.id === editing)} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}
