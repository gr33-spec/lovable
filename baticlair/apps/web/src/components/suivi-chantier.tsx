"use client";

import { Check } from "lucide-react";
import { useCallback, useContext, useEffect, useRef } from "react";
import { ProgressTickContext } from "@/components/project-progress";
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
 * → Commandé », avec une phrase sur ce qui se passe et ce qu'il faut faire. Relu quand l'artisan revient sur l'écran, et
 * à chaque changement signalé par le chantier (liste arrivée, envoi…) : sans cela, il disait « Ta liste se prépare » au-dessus
 * d'une liste déjà là, jusqu'à 15 s (plan « finition », bloc 5, capture iPhone SE).
 */
export function SuiviChantier({ projectId }: { projectId: string }) {
  const fetchSuivi = useCallback((signal: AbortSignal) => api<Suivi>(`/v1/projects/${encodeURIComponent(projectId)}/suivi`, { signal }), [projectId]);
  const { data, reload } = useResource(fetchSuivi);
  const tick = useContext(ProgressTickContext);
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    reload();
  }, [tick, reload]);
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
    <section aria-label="Suivi du chantier" className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <ol aria-label="Étapes" className={`grid gap-1 ${data.etapes.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {data.etapes.map((e, i) => (
          <li key={e.nom} aria-current={i === data.etape ? "step" : undefined} className="flex flex-col items-center gap-1 text-center">
            <span className="flex w-full items-center">
              <span className={`h-0.5 grow rounded-full ${i === 0 ? "opacity-0" : e.fait ? "bg-mark-ok" : "bg-line"}`} />
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${e.fait ? "bg-mark-ok text-white" : "border-2 border-line bg-surface"}`}>
                {e.fait ? <Check size={14} strokeWidth={3.5} aria-hidden="true" /> : null}
              </span>
              <span className={`h-0.5 grow rounded-full ${i === data.etapes.length - 1 ? "opacity-0" : data.etapes[i + 1]?.fait ? "bg-mark-ok" : "bg-line"}`} />
            </span>
            <span className={`text-[12px] leading-tight ${i === data.etape ? "font-semibold text-ink" : "text-muted"}`}>{e.nom}</span>
          </li>
        ))}
      </ol>
      <p className="text-[16px] leading-snug font-semibold">{data.phrase}</p>
      {data.aFaire ? <p className="text-[14px] leading-snug text-muted">{data.aFaire}</p> : null}
    </section>
  );
}
