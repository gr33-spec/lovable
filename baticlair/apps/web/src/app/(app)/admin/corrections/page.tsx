"use client";

import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { jour } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Correction {
  geste: string;
  cause: string | null;
  metier: string | null;
  fois: number;
  entreprises: number;
  proposee: string | null;
  corrigee: string | null;
  dernierLe: string;
}

const GESTES: Record<string, string> = { edit: "Ligne modifiée", delete: "Ligne retirée", add: "Ligne ajoutée" };

/**
 * LES CORRECTIONS LES PLUS FRÉQUENTES (Greg, 16 novembre 2026) : ce que les artisans corrigent le plus souvent sur leurs
 * listes, pour améliorer les règles et les prompts. La ligne proposée par Mobiiz, la ligne corrigée par l'artisan, combien
 * de fois, chez combien d'entreprises. Des matériaux seulement : jamais un nom d'entreprise ni de chantier.
 */
export default function AdminCorrectionsPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Corrections les plus fréquentes</PageTitle>
      <PorteAdmin>
        <Corrections />
      </PorteAdmin>
    </div>
  );
}

function Corrections() {
  const charger = useCallback((signal: AbortSignal) => api<{ depuis: string; total: number; corrections: Correction[] }>("/v1/admin/vue/corrections", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <>
      <p className="text-[15px] text-muted">
        {data.total} correction{data.total > 1 ? "s" : ""} depuis le {jour(data.depuis)}. Les confirmations ne comptent pas.
      </p>
      {data.corrections.length === 0 ? <p className="text-[15px]">Aucune correction pour le moment.</p> : null}
      <ul aria-label="Corrections les plus fréquentes" className="flex flex-col gap-3">
        {data.corrections.map((c, i) => (
          <li key={i}>
            <Card className="flex flex-col gap-1.5 p-4">
              <p className="text-[15px] font-bold">
                {GESTES[c.geste] ?? c.geste} · {c.fois} fois · {c.entreprises} entreprise{c.entreprises > 1 ? "s" : ""}
              </p>
              {c.proposee ? (
                <p className="text-[15px] break-words">
                  <span className="text-muted">Proposé : </span>
                  {c.proposee}
                </p>
              ) : null}
              {c.corrigee ? (
                <p className="text-[15px] break-words">
                  <span className="text-muted">Corrigé : </span>
                  {c.corrigee}
                </p>
              ) : null}
              <p className="text-[13px] text-muted">{[c.metier, c.cause, `dernière le ${jour(c.dernierLe)}`].filter(Boolean).join(" · ")}</p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
