"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { FormulaireAchatGroupe } from "@/components/achat-groupe";
import { BackButton, PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { AchatOuvert } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * « Lancer un achat groupé » (Greg, 27 octobre 2026, point 1) : le catalogue et la recherche, la quantité, la commune, la
 * date, ses négoces. « Rejoindre » (une carte, une alerte) arrive ici avec le matériau déjà rempli.
 */
function Lancer() {
  const params = useSearchParams();
  const id = params.get("rejoindre");
  // Depuis une alerte (notification, e-mail), seul l'identifiant vient : le matériau se relit dans les achats du secteur.
  const sansLibelle = !!id && !params.get("libelle");
  const fetcher = useCallback((signal: AbortSignal) => (sansLibelle ? api<{ achats: AchatOuvert[] }>("/v1/achats-groupes/pres-de-chez-moi", { signal }) : Promise.resolve(null)), [sansLibelle]);
  const { data } = useResource(fetcher);
  const ouvert = data?.achats.find((a) => a.id === id);
  if (sansLibelle && !data) return <Skeleton card="h-56" lines={2} label="Chargement de l'achat groupé…" />;
  const rejoindre = id && (ouvert || !sansLibelle) ? { id, libelle: ouvert?.libelle ?? params.get("libelle") ?? "", unite: ouvert?.unite ?? params.get("unite") ?? "" } : null;
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <PageTitle>{rejoindre ? "Rejoindre l'achat groupé" : "Lancer un achat groupé"}</PageTitle>
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
