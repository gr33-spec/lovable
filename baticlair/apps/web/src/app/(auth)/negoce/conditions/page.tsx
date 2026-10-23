"use client";

import Link from "next/link";
import { useCallback } from "react";
import { LiensLegaux, styleLegal as s } from "@/components/legal";
import { ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { NOM } from "@/lib/nom";
import { useResource } from "@/lib/use-resource";

/**
 * LES CONDITIONS DE LA COMMANDE COMMUNE POUR UN NÉGOCE (Greg, 23 octobre 2026, point 7) : dix points, en français simple,
 * vouvoyés. Le texte vit dans le domaine (`CONDITIONS_NEGOCE`, versionné, servi par `GET /v1/negoce/conditions`) :
 * l'inscription enregistre la version acceptée. À relire par l'avocat (`docs/A-FAIRE-RELIRE.md`).
 */
interface Conditions {
  version: string;
  points: { titre: string; texte: string }[];
}

export default function ConditionsNegoceCommandePage() {
  const fetchConditions = useCallback((signal: AbortSignal) => api<Conditions>("/v1/negoce/conditions", { signal }), []);
  const { data, error, reload } = useResource(fetchConditions);
  return (
    <article className="flex flex-col gap-5">
      <PageTitle>Conditions de la {NOM}</PageTitle>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Skeleton lines={6} label="Chargement des conditions…" /> : null}
      {data ? (
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
      ) : null}
      <p className={s.p}>
        Une question : répondez à un e-mail reçu de BatiClair. Votre espace :{" "}
        <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">
          me connecter
        </Link>
        .
      </p>
      <LiensLegaux sauf="/conditions-negoce" />
    </article>
  );
}
