"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AnalysisScope } from "@/lib/analysis/types";
import { scopeHref } from "./view";

// Accès à l'analyse IA depuis un écran (accueil, immeuble, société) : une
// seule logique, la page Plus › Analyse IA, ouverte sur le bon périmètre.

export function AnalysisEntry({ scope, title, compact }: { scope: AnalysisScope; title?: string; compact?: boolean }) {
  const { data, role } = useStore();
  if (role !== "owner") return null;
  const last = (data.settings.analyses ?? []).find((a) => JSON.stringify(a.scope) === JSON.stringify(scope));
  const top = last?.result.pistes[0];
  return (
    <Link href={scopeHref(scope)} className={compact ? "flex items-center gap-3 py-3 active:opacity-60" : "soft-card mt-4 flex items-center gap-3 rounded-[24px] px-4 py-3.5 active:scale-[0.99]"}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy text-gold">
        <Sparkles size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title ?? "Analyse IA"}</span>
        <span className="block truncate text-[13px] text-muted">
          {top ? `Piste n° 1 : ${top.titre}` : "Diagnostic et pistes de réinvestissement, à la demande"}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted/70" />
    </Link>
  );
}
