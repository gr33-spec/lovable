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
      className="grid grid-cols-2 gap-1 rounded-xl border-2 border-ink bg-card p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "devis"}
        onClick={() => onChange("devis")}
        className={cn(
          "tap-target rounded-lg font-display text-sm font-bold transition-colors",
          value === "devis" ? "bg-blue text-white" : "text-ink"
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
          "tap-target rounded-lg font-display text-sm font-bold transition-colors",
          value === "facture" ? "bg-blue text-white" : "text-ink"
        )}
      >
        Vérifier une facture
      </button>
    </div>
  );
}
