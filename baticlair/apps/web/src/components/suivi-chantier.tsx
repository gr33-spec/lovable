"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/** Ce que l'API rend (`GET /v1/projects/:id/suivi`). */
interface Suivi {
  etape: number;
  etapes: { nom: string; fait: boolean }[];
  phrase: string;
  aFaire: string | null;
}

/**
 * LE SUIVI FAÇON COLIS (nouveau cap du 22 octobre 2026) : sur chaque chantier, « Liste prête → Prix demandés → Prix reçus
 * → Commandé », avec une phrase sur ce qui se passe et ce qu'il faut faire. Relu quand l'artisan revient sur l'écran.
 */
export function SuiviChantier({ projectId }: { projectId: string }) {
  const fetchSuivi = useCallback((signal: AbortSignal) => api<Suivi>(`/v1/projects/${encodeURIComponent(projectId)}/suivi`, { signal }), [projectId]);
  const { data, reload } = useResource(fetchSuivi);
  useEffect(() => {
    const relire = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", relire);
    window.addEventListener("focus", relire);
    const t = setInterval(relire, 15_000);
    return () => {
      document.removeEventListener("visibilitychange", relire);
      window.removeEventListener("focus", relire);
      clearInterval(t);
    };
  }, [reload]);
  if (!data) return null;
  return (
    <section aria-label="Suivi du chantier" className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card">
      <ol aria-label="Étapes" className="grid grid-cols-4 gap-1">
        {data.etapes.map((e, i) => (
          <li key={e.nom} aria-current={i === data.etape ? "step" : undefined} className="flex flex-col items-center gap-1 text-center">
            <span className="flex w-full items-center">
              <span className={`h-[3px] grow rounded-full ${i === 0 ? "opacity-0" : e.fait ? "bg-mark-ok" : "bg-line"}`} />
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${e.fait ? "bg-mark-ok text-white" : "border-2 border-line bg-surface"}`}>
                {e.fait ? <Check size={14} strokeWidth={3.5} aria-hidden="true" /> : null}
              </span>
              <span className={`h-[3px] grow rounded-full ${i === data.etapes.length - 1 ? "opacity-0" : data.etapes[i + 1]?.fait ? "bg-mark-ok" : "bg-line"}`} />
            </span>
            <span className={`text-[12px] leading-tight ${i === data.etape ? "font-extrabold text-ink" : e.fait ? "font-bold text-muted" : "font-semibold text-muted"}`}>{e.nom}</span>
          </li>
        ))}
      </ol>
      <p className="text-[15px] leading-snug font-bold">{data.phrase}</p>
      {data.aFaire ? <p className="text-[14px] leading-snug text-muted">{data.aFaire}</p> : null}
    </section>
  );
}
