"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { TRADES } from "@/lib/trades";

/** Les métiers montrés d'emblée ; les autres se déplient (l'inscription tenait sur trois écrans d'iPhone, 21 octobre 2026). */
const VISIBLES = 6;

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
  const [tous, setTous] = useState(false);
  const montres = tous ? TRADES : TRADES.filter((t, i) => i < VISIBLES || value.includes(t.id));
  const caches = TRADES.length - montres.length;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-semibold">
        {label} <span className="font-normal text-muted">(un ou plusieurs)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {montres.map((t) => {
          const on = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t.id)}
              className={`pressable inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold ${
                on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink active:bg-ground"
              }`}
            >
              {on ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
              {t.label}
            </button>
          );
        })}
        {caches > 0 ? (
          <button type="button" onClick={() => setTous(true)} className="pressable inline-flex min-h-11 items-center rounded-full border border-dashed border-line px-4 text-[14px] font-semibold text-accent-text">
            Voir les {caches} autres métiers
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
