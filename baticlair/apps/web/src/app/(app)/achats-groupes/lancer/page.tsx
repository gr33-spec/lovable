"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { FormulaireAchatGroupe } from "@/components/achat-groupe";
import { BackButton, PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { AchatOuvert } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * Ajouter sa liste à un achat groupé (Greg, 27 octobre 2026, 2e message) : les matériaux du catalogue et leurs quantités,
 * la commune, la date, ses négoces, l'engagement. « Ajouter ma liste » (une carte, une alerte) arrive ici avec l'achat.
 */
function Lancer() {
  const params = useSearchParams();
  const id = params.get("rejoindre");
  // Depuis une alerte (notification, e-mail), seul l'identifiant vient : le titre se relit dans les achats du secteur.
  const sansTitre = !!id && !params.get("titre");
  const fetcher = useCallback((signal: AbortSignal) => (sansTitre ? api<{ achats: AchatOuvert[] }>("/v1/achats-groupes/pres-de-chez-moi", { signal }) : Promise.resolve(null)), [sansTitre]);
  const { data } = useResource(fetcher);
  const ouvert = data?.achats.find((a) => a.id === id);
  if (sansTitre && !data) return <Skeleton card="h-56" lines={2} label="Chargement de l'achat groupé…" />;
  const rejoindre = id && (ouvert || !sansTitre) ? { id, titre: ouvert?.titre ?? params.get("titre") ?? "" } : null;
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <PageTitle>{rejoindre ? "Ajouter ma liste" : "Achat groupé de ton métier"}</PageTitle>
      <FormulaireAchatGroupe key={id ?? "nouveau"} rejoindre={rejoindre} />
    </>
  );
}

export default function LancerPage() {
  return (
    <Suspense>
      <Lancer />
    </Suspense>
  );
}
