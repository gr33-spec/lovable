"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * CE QUI N'EST PAS ENCORE PASSÉ (revue du 26 octobre 2026, file de reprise) : une lecture de devis ou un e-mail qui a
 * échoué une fois repart seul. L'artisan le sait, en français simple, avec l'heure du prochain essai ; après 3 échecs, il
 * sait quoi faire. Rien ne s'affiche quand tout va bien.
 */
interface Reprise {
  sorte: string;
  etat: "en_attente" | "abandonnee";
  prochaineLe: string | null;
}

const heure = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", " h ");

export function phraseReprise(r: Reprise): string {
  const quoi = r.sorte === "lecture_ia" ? "La lecture de ton devis" : "Un e-mail";
  if (r.etat === "en_attente") return `${quoi} n'a pas marché du premier coup. Je réessaie tout seul${r.prochaineLe ? ` vers ${heure(r.prochaineLe)}` : ""}, tu n'as rien à faire.`;
  return r.sorte === "lecture_ia"
    ? "La lecture de ton devis n'a pas marché, même après trois essais. Redépose-le depuis ton chantier, ou écris-nous à contact@mobiiz.fr."
    : "Un e-mail n'a pas pu partir, même après trois essais. Écris-nous à contact@mobiiz.fr : on regarde tout de suite.";
}

export function BandeauReprises() {
  const { data } = useResource(useCallback((signal: AbortSignal) => api<{ reprises: Reprise[] }>("/v1/reprises", { signal }), []));
  const reprises = data?.reprises ?? [];
  if (reprises.length === 0) return null;
  return (
    <ul aria-label="Ce qui n'est pas encore passé" className="flex flex-col gap-2">
      {reprises.map((r, i) => (
        <li key={i} role="status" className={`rounded-xl p-4 text-[15px] leading-snug font-semibold ${r.etat === "abandonnee" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"}`}>
          {phraseReprise(r)}
        </li>
      ))}
    </ul>
  );
}
