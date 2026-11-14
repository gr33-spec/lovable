"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AIDES, type SujetAide } from "@/lib/aide";

/**
 * Le « ? » d'un écran : un appui ouvre trois lignes au plus, un appui les ferme (plan du 20 octobre 2026, bloc 10).
 * Greg, 12 novembre 2026 (capture) : la fenêtre sortait de l'écran quand le « ? » était à gauche. Elle ne dépend plus de
 * la place du bouton : sur téléphone elle est posée au-dessus du menu du bas, avec des marges fixes, une hauteur
 * maximale et son propre défilement ; « Compris » et la croix restent toujours visibles. Échap la ferme et rend le focus
 * au « ? ».
 */
export function AideBouton({ sujet, className = "" }: { sujet: SujetAide; className?: string }) {
  const id = useId();
  const [ouverte, setOuverte] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const fenetre = useRef<HTMLDivElement>(null);
  const aide = AIDES[sujet];
  const fermer = () => {
    setOuverte(false);
    bouton.current?.focus();
  };
  useEffect(() => {
    if (!ouverte) return;
    fenetre.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuverte(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [ouverte]);
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <button
        ref={bouton}
        type="button"
        aria-label={ouverte ? "Fermer l'aide" : "Aide"}
        aria-expanded={ouverte}
        aria-controls={id}
        onClick={() => setOuverte(!ouverte)}
        className={`pressable flex size-11 items-center justify-center rounded-full border text-[17px] font-extrabold ${ouverte ? "border-ink bg-ink text-ground" : "bouton-nuit"}`}
      >
        {ouverte ? <X size={18} aria-hidden="true" /> : "?"}
      </button>
      {ouverte ? (
        <div
          id={id}
          ref={fenetre}
          tabIndex={-1}
          role="dialog"
          aria-label={`Aide : ${aide.titre}`}
          className="animate-rise fixed inset-x-4 bottom-[calc(var(--nav-height)+var(--nav-gap)+12px)] z-40 mx-auto flex max-h-[min(60dvh,26rem)] max-w-[26rem] flex-col rounded-[20px] border border-accent/40 bg-[#160d04] text-white shadow-card outline-none lg:inset-x-auto lg:right-8 lg:bottom-8 lg:w-[24rem]"
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <p className="pt-2 text-[14px] font-extrabold text-accent-on-dark">{aide.titre}</p>
            <button type="button" onClick={fermer} aria-label="Fermer" className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-white">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-1 text-[15px] leading-snug break-words">
            {aide.lignes.filter((l): l is string => !!l).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <button type="button" onClick={fermer} className="pressable mx-4 my-3 min-h-11 shrink-0 self-end rounded-full px-3 text-[15px] font-extrabold text-accent-on-dark">
            Compris
          </button>
        </div>
      ) : null}
    </span>
  );
}
