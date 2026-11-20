"use client";

import { useEffect, useState } from "react";

/**
 * L'ÉCRAN D'ORDINATEUR (Greg, 31 octobre 2026, soir : « on a de la place sur l'écran ») : vrai à partir de 1024 px, comme
 * les classes `lg:`. Sert seulement à ne charger qu'à l'ordinateur ce qui ne s'affiche que là (le résumé d'une liste) ;
 * le rendu, lui, se règle en CSS.
 */
export function useOrdinateur(): boolean {
  const [oui, setOui] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const maj = () => setOui(m.matches);
    maj();
    m.addEventListener("change", maj);
    return () => m.removeEventListener("change", maj);
  }, []);
  return oui;
}
