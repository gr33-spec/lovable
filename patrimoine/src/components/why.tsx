"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { explain, type ExplainKind } from "@/lib/engine/explain";
import { eur } from "@/lib/format";
import { Sheet, cx } from "./ui";

// Feuille « Pourquoi ce chiffre ? » : le calcul détaillé d'un chiffre clé,
// ligne par ligne, avec l'origine de chaque montant.

const fmt = (n: number | undefined, unit: "eur" | "eur/mois") => (n === undefined ? "—" : `${n < 0 ? "−" : ""}${eur(Math.round(Math.abs(n)))}${unit === "eur/mois" ? " / mois" : ""}`);

export function WhySheet({ kind, onClose }: { kind: ExplainKind | null; onClose: () => void }) {
  const { data, projection } = useStore();
  const e = kind ? explain(kind, data, projection.snapshot) : undefined;
  return (
    <Sheet open={!!e} onClose={onClose} title={e ? `Pourquoi ce chiffre ?` : ""}>
      {e && (
        <div className="pb-4">
          <div className="rounded-2xl bg-soft px-4 py-3">
            <div className="text-[13px] text-muted">{e.title}</div>
            <div className="tabular text-[26px] font-extrabold text-navy">{e.total === undefined ? "Données insuffisantes" : fmt(e.total, e.unit)}</div>
            <div className="mt-0.5 text-[13px] font-medium text-ink-2">= {e.formula}</div>
          </div>
          {e.groups.map((g) => (
            <div key={g.title} className="mt-4">
              <div className="flex items-baseline justify-between px-1 pb-1">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">{g.title}</span>
                {g.subtotal !== undefined && <span className="tabular text-[14px] font-bold text-ink">{fmt(g.subtotal, e.unit)}</span>}
              </div>
              {g.lines.length === 0 ? (
                <div className="px-1 py-2 text-[13.5px] text-muted">Aucun</div>
              ) : (
                <div className="divide-y divide-line rounded-2xl bg-card px-3 shadow-sm">
                  {g.lines.map((l, i) => {
                    const body = (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] text-ink">{l.label}</span>
                          {l.source && <span className={cx("block truncate text-[12px]", l.amount === undefined ? "text-warn" : "text-muted")}>{l.source}</span>}
                        </span>
                        <span className={cx("tabular shrink-0 text-[14.5px] font-semibold", l.amount === undefined ? "text-warn" : l.amount < 0 ? "text-neg" : "text-ink")}>
                          {l.amount === undefined ? "manquant" : `${l.amount < 0 ? "−" : ""}${eur(Math.round(Math.abs(l.amount)))}`}
                        </span>
                        {l.href && <ChevronRight size={15} className="shrink-0 text-muted" />}
                      </>
                    );
                    return l.href ? (
                      <Link key={i} href={l.href} onClick={onClose} className="flex items-center gap-2 py-2.5 active:opacity-60">
                        {body}
                      </Link>
                    ) : (
                      <div key={i} className="flex items-center gap-2 py-2.5">
                        {body}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {e.notes.length > 0 && (
            <ul className="mt-4 space-y-1 px-1 text-[13px] text-ink-2">
              {e.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
