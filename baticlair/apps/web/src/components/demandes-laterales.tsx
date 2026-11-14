"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api, type ProjectPage } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LISTE + DÉTAIL SUR ORDINATEUR (Greg, 6 novembre 2026, prompt maître point 18) : sur grand écran, les demandes restent
 * à gauche pendant qu'on lit l'une d'elles ; un clic change de demande sans repasser par « Demandes ». Rien sur
 * téléphone (la liste est la page « Demandes »).
 */
export function DemandesLaterales({ courant }: { courant: string }) {
  const { data } = useResource(useCallback((signal: AbortSignal) => api<ProjectPage>("/v1/projects?limit=30&resume=1", { signal }).catch(() => null), []));
  const items = (data?.items ?? []).filter((p) => p.status !== "archived");
  return (
    <nav aria-label="Mes demandes" className="hidden 2xl:sticky 2xl:top-8 2xl:flex 2xl:max-h-[calc(100dvh-4rem)] 2xl:flex-col 2xl:gap-2 2xl:overflow-y-auto">
      <Link href="/chantiers" className="px-2 text-[13px] font-bold tracking-wide text-muted uppercase">
        Mes demandes
      </Link>
      <ul className="flex flex-col gap-1">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/chantiers/${p.id}`}
              aria-current={p.id === courant ? "page" : undefined}
              className={`flex min-h-11 flex-col justify-center rounded-xl px-3 py-2 text-[14px] ${p.id === courant ? "bg-surface font-bold text-ink shadow-card" : "text-ink/85 hover:bg-surface/10"}`}
            >
              <span className="truncate">{p.name}</span>
              {p.resume?.statut ? <span className={`truncate text-[12px] ${p.id === courant ? "text-muted" : "opacity-75"}`}>{p.resume.statut}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
