"use client";

import { useEffect } from "react";
import { cibleHaptique, vibrer } from "@/lib/haptique";

/**
 * Posé une fois dans la mise en page racine : chaque VRAI toucher (`isTrusted`) sur un bouton, un choix ou une case donne
 * son retour haptique, dans toute l'application, l'onboarding et sa carte compris. Rien à ajouter écran par écran.
 */
export function RetoursHaptiques() {
  useEffect(() => {
    const surClic = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      const force = cibleHaptique(e.target);
      if (force) vibrer(force);
    };
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, []);
  return null;
}
