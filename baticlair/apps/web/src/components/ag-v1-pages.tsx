"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BesoinV1Detail, MesBesoinsV1 } from "@/components/ag-v1-besoins";
import { ParcoursDirectV1 } from "@/components/ag-v1-direct";
import { ChoixDuQuantitatif, DepuisQuantitatifV1 } from "@/components/ag-v1-quantitatif";
import { BackButton, EmptyState, Skeleton } from "@/components/ui";
import { useAgV1, type EtatV1 } from "@/lib/ag-v1";

/** Les pages du parcours V1 : rien quand le réglage est coupé (l'ancien parcours reste celui de l'application). */
function AvecV1({ children }: { children: (etat: EtatV1) => React.ReactNode }) {
  const { etat } = useAgV1();
  if (etat === undefined) return <Skeleton card="h-56" lines={2} label="Chargement…" />;
  if (etat === null) return <EmptyState icon={null} title="Page indisponible">Cette page n&apos;est pas encore ouverte.</EmptyState>;
  return <Suspense fallback={<Skeleton card="h-56" lines={2} label="Chargement…" />}>{children(etat)}</Suspense>;
}

export function PageNouveauV1() {
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <AvecV1>{(etat) => <NouveauV1 etat={etat} />}</AvecV1>
    </>
  );
}

/**
 * UN SEUL OUTIL DE SAISIE (Greg, 16 novembre 2026 : « "Saisir un nouveau besoin" doit ouvrir exactement le même outil que
 * "Nouveau quantitatif", pas un parcours à part »). RÈGLE CHANGÉE : avant, sans produit choisi, une conversation propre aux
 * achats groupés ; maintenant, l'outil commun (« Je saisis ma liste » ou « Mobiiz m'aide »), puis l'écran où l'on coche les
 * lignes à grouper. Un produit déjà choisi (la carte d'un achat ouvert) ouvre toujours son parcours : rejoindre cet achat.
 */
function NouveauV1({ etat }: { etat: EtatV1 }) {
  const params = useSearchParams();
  const router = useRouter();
  const type = params.get("type");
  useEffect(() => {
    if (!type) router.replace("/achats-groupes/publier");
  }, [type, router]);
  return type ? <ParcoursDirectV1 etat={etat} /> : null;
}

export function PageMesBesoinsV1() {
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <AvecV1>{() => <MesBesoinsV1 />}</AvecV1>
    </>
  );
}

export function PageChoixQuantitatifV1() {
  return (
    <>
      <BackButton fallback="/achats-groupes" compact />
      <AvecV1>{() => <ChoixDuQuantitatif />}</AvecV1>
    </>
  );
}

export function PageQuantitatifV1() {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <>
      <BackButton fallback="/achats-groupes/quantitatif" compact />
      <AvecV1>{(etat) => <DepuisQuantitatifV1 etat={etat} projectId={projectId} />}</AvecV1>
    </>
  );
}

export function PageBesoinV1() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <BackButton fallback="/achats-groupes/mes-besoins" compact />
      <AvecV1>{(etat) => <BesoinV1Detail id={id} etat={etat} />}</AvecV1>
    </>
  );
}
