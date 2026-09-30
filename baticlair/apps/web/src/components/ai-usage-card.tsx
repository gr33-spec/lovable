"use client";

import { useCallback } from "react";
import { Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, type AiUsageReport } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

const euros = (v: string) =>
  Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Consommation IA du mois (propriétaire et administrateurs) : coût réel des
 * appels, budget, et volume de documents lus avec leur coût estimé.
 */
export function AiUsageCard({ companyId }: { companyId: string }) {
  const fetchUsage = useCallback(
    (signal: AbortSignal) => api<AiUsageReport>("/v1/ai-usage", { signal }),
    // L'entreprise active fait partie de la requête (en-tête) : on recharge quand elle change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId],
  );
  const { data, error, reload } = useResource(fetchUsage);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-[15px] font-bold">Consommation IA ce mois-ci</h2>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Spinner /> : null}
      {data ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 flex flex-col">
            <dt className="text-muted">Analyses de devis ce mois-ci</dt>
            <dd className="text-lg font-extrabold">
              {data.analyses.used}
              <span className="text-sm font-bold text-muted">
                {data.analyses.limit === null ? " · sans plafond pendant l'essai" : ` sur ${data.analyses.limit} (reste ${data.analyses.remaining})`}
              </span>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted">Coût réel</dt>
            <dd className="text-lg font-extrabold">{euros(data.actual.costEur)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted">Budget prévu</dt>
            <dd className="text-lg font-extrabold">
              {euros(data.budgetEur)} <span className="text-sm font-bold text-muted">({data.actual.budgetUsedPercent} %)</span>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted">Documents lus</dt>
            <dd className="font-bold">
              {data.reading.documents} · {data.reading.pagesTotal} pages
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-muted">Coût estimé de l&apos;analyse</dt>
            <dd className="font-bold">{euros(data.reading.estimatedCostEur)}</dd>
          </div>
          {data.byUser.length > 0 ? (
            <div className="col-span-2 flex flex-col gap-1">
              <dt className="text-muted">Par personne</dt>
              {data.byUser.map((u) => (
                <dd key={u.userId ?? "auto"} className="flex justify-between gap-2">
                  <span className="font-bold">{u.userName ?? "Traitement automatique"}</span>
                  <span>
                    {u.analyses} analyse{u.analyses > 1 ? "s" : ""} · {euros(u.costEur)}
                  </span>
                </dd>
              ))}
            </div>
          ) : null}
          <p className="col-span-2 text-[13px] text-muted">
            {data.actual.calls === 0
              ? "Aucune analyse par l'IA pour l'instant : la lecture des devis est gratuite. L'estimation indique ce que coûtera l'extraction de ces documents."
              : `${data.actual.calls} appels, dont ${data.actual.retries} nouvelles tentatives. Pages : ${data.reading.pagesText} en texte, ${data.reading.pagesVision} en image, ${data.reading.pagesSkipped} ignorées.`}
          </p>
        </dl>
      ) : null}
    </Card>
  );
}
