"use client";

import { Check } from "lucide-react";
import { TRADES } from "@/lib/trades";

/**
 * Choix du métier : un appui par métier, plusieurs possibles. C'est la
 * seule question métier posée à l'artisan ; BatiClair adapte ensuite la
 * lecture des devis sans rien lui demander d'autre (PD-033).
 */
export function TradePicker({ value, onChange, label = "Ton métier" }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (id === "other") onChange(["other"]);
    else onChange([...value.filter((v) => v !== "other"), id]);
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-bold">
        {label} <span className="font-normal text-muted">(un ou plusieurs)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {TRADES.map((t) => {
          const on = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${
                on ? "bg-ink text-white" : "bg-surface text-ink shadow-card"
              }`}
            >
              {on ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
