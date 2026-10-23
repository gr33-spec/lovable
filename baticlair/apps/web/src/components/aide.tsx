"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { AIDES, type SujetAide } from "@/lib/aide";

/** Le « ? » d'un écran : un tap ouvre trois lignes au plus, un tap les ferme (plan du 20 octobre 2026, bloc 10). */
export function AideBouton({ sujet, className = "" }: { sujet: SujetAide; className?: string }) {
  const id = useId();
  const [ouverte, setOuverte] = useState(false);
  const aide = AIDES[sujet];
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={ouverte ? "Fermer l'aide" : "Aide"}
        aria-expanded={ouverte}
        aria-controls={id}
        onClick={() => setOuverte(!ouverte)}
        className={`pressable flex size-11 items-center justify-center rounded-full border text-[17px] font-extrabold ${ouverte ? "border-ink bg-ink text-white" : "border-line bg-surface text-accent-text active:bg-ground"}`}
      >
        {ouverte ? <X size={18} aria-hidden="true" /> : "?"}
      </button>
      {ouverte ? (
        <div id={id} role="dialog" aria-label={`Aide : ${aide.titre}`} className="animate-rise absolute top-13 right-0 z-20 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl bg-ink p-4 text-white shadow-card">
          <p className="text-[13px] font-extrabold text-accent-on-dark">{aide.titre}</p>
          <ol className="flex flex-col gap-1.5 text-[14px] leading-snug">
            {aide.lignes.filter((l): l is string => !!l).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <button type="button" onClick={() => setOuverte(false)} className="min-h-10 self-end text-[14px] font-extrabold text-accent-on-dark">
            Compris
          </button>
        </div>
      ) : null}
    </span>
  );
}
