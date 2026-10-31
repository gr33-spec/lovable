"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * LES RÉFÉRENCES DU CATALOGUE SOUS UNE RÉPONSE ÉCRITE (catalogue métier, Greg, 31 octobre 2026 : « Tuile rouge, 250
 * unités » → « Quel modèle de tuile ? », l'artisan tape « H14 » et choisit la référence). Sur une question de modèle ou de
 * référence, le même moteur que « Écris ta liste » propose ses références pendant la frappe ; un tap en prend une ; ce
 * qui s'écrit librement reste toujours possible (jamais une référence imposée).
 */
export const QUESTION_DE_MODELE = /mod[eè]le|r[ée]f[ée]rence|quelle tuile|quel produit|quelle ardoise/i;

export function useReferencesCatalogue(texte: string, actif: boolean): string[] {
  const [refs, setRefs] = useState<string[]>([]);
  useEffect(() => {
    const q = texte.trim();
    if (!actif || q.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      api<{ resultats: { designation: string; precisions?: string[] }[] | null }>(`/v1/catalogue?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => setRefs((r.resultats ?? []).slice(0, 4).map((x) => [x.designation, ...(x.precisions ?? [])].join(" "))))
        .catch(() => setRefs([]));
    }, 200);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [texte, actif]);
  return actif && texte.trim().length >= 2 ? refs.filter((r) => r.toLowerCase() !== texte.trim().toLowerCase()) : [];
}

export function ReferencesCatalogue({ question, references, onChoisir }: { question: string; references: readonly string[]; onChoisir: (r: string) => void }) {
  if (!references.length) return null;
  return (
    <ul aria-label={`Références du catalogue : ${question}`} className="flex basis-full flex-wrap gap-2">
      {references.map((r) => (
        <li key={r}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onChoisir(r)} className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3 text-left text-[14px] font-semibold active:scale-[0.98]">
            {r}
          </button>
        </li>
      ))}
    </ul>
  );
}
