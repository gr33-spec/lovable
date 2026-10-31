"use client";

import { useEffect, useState } from "react";

/** La phrase de possibilité, mot pour mot (Greg, 24 octobre 2026) ; remplacée par la vraie moyenne dès 3 cycles publiés. */
export const ARGUMENT_PAR_DEFAUT = "Gratuit pour tes listes, tes négoces et les achats groupés. Dès 19,90 € HT par mois pour plus d'analyses de devis.";

/** L'argument phare des tarifs : la phrase de l'API (`/v1/public/tarif`), la phrase de possibilité en attendant. */
export function ArgumentTarif({ className = "" }: { className?: string }) {
  const [texte, setTexte] = useState(ARGUMENT_PAR_DEFAUT);
  useEffect(() => {
    let vivant = true;
    fetch("/v1/public/tarif", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { argument?: string } | null) => {
        if (vivant && b?.argument) setTexte(b.argument);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  return <p className={className}>{texte}</p>;
}
