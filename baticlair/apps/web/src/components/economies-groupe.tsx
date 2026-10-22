"use client";

import { Users } from "lucide-react";
import { useCallback } from "react";
import { Card } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { nom, noms } from "@/lib/nom";

/**
 * Le compteur « Économisé grâce au groupé » (parcours groupé, étape 7, section 6) dans Compte : la somme des économies
 * des offres commandées ((prix de référence − prix groupé) × quantité). Absent tant que le groupé n'existe pas.
 */
export function EconomiesGroupeCard() {
  const fetchEconomies = useCallback(
    (signal: AbortSignal) => api<{ total: string; lots: number }>("/v1/groupe/economies", { signal }).catch((e: unknown) => (e instanceof ApiError && (e.status === 404 || e.status === 403) ? null : Promise.reject(e))),
    [],
  );
  const { data } = useResource(fetchEconomies);
  if (!data) return null;
  return (
    <section aria-label={`Économisé grâce à la ${nom}`}>
      <Card className="flex items-center gap-3 p-4">
        <Users size={22} aria-hidden="true" className="shrink-0 text-accent-text" />
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold text-muted">{`Économisé grâce à la ${nom}`}</span>
          <span className="text-xl font-extrabold">{Number(data.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          <span className="text-[12px] text-muted">{data.lots === 0 ? `Aucune ${nom} pour l'instant.` : `${data.lots} ${data.lots > 1 ? noms : nom}`}</span>
        </div>
      </Card>
    </section>
  );
}
