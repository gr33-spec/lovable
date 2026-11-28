"use client";

import { useCallback } from "react";
import { styleLegal as s } from "@/components/legal-style";
import { ErrorNotice, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LES CONDITIONS POUR LES NÉGOCES, une seule source (le domaine, `CONDITIONS_NEGOCE`, servi par `GET /v1/negoce/conditions`) :
 * la page publique `/conditions-negoce` et celle de l'espace négoce montrent le même texte, versionné. À relire par l'avocat.
 */
interface Conditions {
  version: string;
  points: { titre: string; texte: string }[];
}

export function ConditionsNegoceListe() {
  const fetchConditions = useCallback((signal: AbortSignal) => api<Conditions>("/v1/negoce/conditions", { signal }), []);
  const { data, error, reload } = useResource(fetchConditions);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={6} label="Chargement des conditions…" />;
  return (
    <>
      <p className={s.p}>Ce qui s&apos;applique à un négoce qui crée son accès et répond aux grilles. Version du {data.version.split("-").reverse().join("/")}.</p>
      <ol className="flex flex-col gap-4">
        {data.points.map((c, i) => (
          <li key={c.titre} className="flex flex-col gap-1">
            <h2 className={s.h2}>{`${i + 1}. ${c.titre}`}</h2>
            <p className={s.p}>{c.texte}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
