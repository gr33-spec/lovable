"use client";

import { cn } from "@/lib/utils";
import type { AnalysisType } from "@/lib/ai/types";

interface SegmentedToggleProps {
  value: AnalysisType;
  onChange: (value: AnalysisType) => void;
}

/** Bascule "Comparer des devis" / "Vérifier une facture" (design system §6). */
export function SegmentedToggle({ value, onChange }: SegmentedToggleProps) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "devis"}
        onClick={() => onChange("devis")}
        className={cn(
          "tap-target rounded-xl font-display text-sm font-bold transition-colors",
          value === "devis" ? "bg-accent text-white shadow-soft" : "text-ink hover:bg-paper"
        )}
      >
        Comparer des devis
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "facture"}
        onClick={() => onChange("facture")}
        className={cn(
          "tap-target rounded-xl font-display text-sm font-bold transition-colors",
          value === "facture" ? "bg-accent text-white shadow-soft" : "text-ink hover:bg-paper"
        )}
      >
        Vérifier une facture
      </button>
    </div>
  );
}
