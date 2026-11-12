"use client";

import { Check, Moon, Smartphone, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { choisirTheme, useChoixTheme, type ChoixTheme } from "@/lib/theme";

/**
 * LE THÈME DEPUIS L'EN-TÊTE (Greg, 12 novembre 2026, dossier de corrections UX, point 14 : « le changement de thème est
 * trop difficile à trouver »). Un bouton rond discret à côté de la cloche, sur toutes les pages connectées ; un appui ouvre
 * trois choix : Automatique, Clair, Sombre. Le choix s'applique tout de suite et reste gardé sur l'appareil (le même
 * réglage que Profil › Apparence). Échap et un appui ailleurs referment ; le focus revient au bouton.
 */
const CHOIX: { theme: ChoixTheme; libelle: string; icone: typeof Sun }[] = [
  { theme: "auto", libelle: "Automatique", icone: Smartphone },
  { theme: "clair", libelle: "Clair", icone: Sun },
  { theme: "sombre", libelle: "Sombre", icone: Moon },
];

/** Largeur de la fenêtre des choix (w-52) et marge gardée au bord de l'écran, en pixels. */
const LARGEUR = 208;
const MARGE = 12;

export function BoutonTheme() {
  const choix = useChoixTheme();
  const [ouvert, setOuvert] = useState(false);
  // Sur un petit téléphone le bouton n'est pas au bord droit (la cloche et le compte le suivent) : la fenêtre des choix,
  // alignée sur lui, sortirait de l'écran à gauche. On la décale juste de ce qu'il faut.
  const [decalage, setDecalage] = useState(0);
  const boite = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const actuel = CHOIX.find((c) => c.theme === choix) ?? CHOIX[2]!;
  const Icone = actuel.icone;

  useEffect(() => {
    if (!ouvert) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    const ailleurs = (e: PointerEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("keydown", clavier);
    document.addEventListener("pointerdown", ailleurs);
    return () => {
      document.removeEventListener("keydown", clavier);
      document.removeEventListener("pointerdown", ailleurs);
    };
  }, [ouvert]);

  return (
    <div ref={boite} className="relative">
      <button ref={bouton} type="button" aria-label={`Apparence : ${actuel.libelle}`} aria-haspopup="true" aria-expanded={ouvert} onClick={() => {
          const droite = bouton.current?.getBoundingClientRect().right ?? LARGEUR + MARGE;
          setDecalage(Math.max(0, MARGE + LARGEUR - droite));
          setOuvert((o) => !o);
        }}
        className="pressable bouton-nuit flex size-11 shrink-0 items-center justify-center rounded-full">
        <Icone size={19} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div role="radiogroup" aria-label="Apparence de Mobiiz" style={{ right: -decalage }} className="animate-rise absolute top-13 z-40 flex w-52 flex-col gap-0.5 rounded-[18px] bg-surface p-1.5 text-[#130901] shadow-float ring-1 ring-black/10">
          {CHOIX.map(({ theme, libelle, icone: I }) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={choix === theme}
              onClick={() => {
                choisirTheme(theme);
                setOuvert(false);
                bouton.current?.focus();
              }}
              className={`pressable flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-extrabold ${choix === theme ? "bg-[#ffe98a]" : ""}`}
            >
              <I size={18} aria-hidden="true" className="shrink-0" />
              <span className="flex-1">{libelle}</span>
              {choix === theme ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
