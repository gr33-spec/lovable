"use client";

import { useSearchParams } from "next/navigation";
import { ChevronRight, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { MesListes } from "@/components/mes-demandes-negoces";
import { PageTitle, Spinner } from "@/components/ui";

/**
 * L'ENTRÉE QUANTITATIFS, SIMPLIFIÉE (Greg, 15 novembre 2026, dossier UX mobile : « la page mélange création, négoces,
 * réponses, recherche, cinq états et liste […] l'intention principale n'est pas évidente »). Deux choix, un tap chacun :
 * « Créer un quantitatif » ouvre directement la création ; « Suivre mes demandes » ouvre le suivi, où vivent maintenant
 * Mes négoces, les réponses, la recherche et les filtres. RÈGLE CHANGÉE : avant, tout était sur cette page.
 */
function EntreeQuantitatifs() {
  const carte = "pressable flex min-h-[88px] items-center gap-4 rounded-[20px] p-5 text-left shadow-card";
  return (
    <div className="flex flex-col gap-4">
      <span className="flex flex-col gap-1">
        <PageTitle>Quantitatifs</PageTitle>
        <span className="text-[14px] text-muted">Tes listes de matériaux et tes demandes de prix.</span>
      </span>
      <nav aria-label="Quantitatifs" className="flex flex-col gap-3">
        <Link href="/chantiers/nouveau" className={`${carte} bg-accent text-on-accent`}>
          <Plus size={26} aria-hidden="true" className="shrink-0" />
          <span className="flex min-w-0 grow flex-col">
            <span className="text-[19px] leading-tight font-extrabold">Créer un quantitatif</span>
            <span className="text-[14px] leading-snug">Prépare une nouvelle liste de matériaux.</span>
          </span>
          <ChevronRight size={22} aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/chantiers?vue=suivi" className={`${carte} bg-surface text-ink`}>
          <FolderOpen size={26} aria-hidden="true" className="shrink-0" />
          <span className="flex min-w-0 grow flex-col">
            <span className="text-[19px] leading-tight font-extrabold">Suivre mes demandes</span>
            <span className="text-[14px] leading-snug text-muted">Brouillons, demandes envoyées, réponses reçues, terminées.</span>
          </span>
          <ChevronRight size={22} aria-hidden="true" className="shrink-0" />
        </Link>
      </nav>
    </div>
  );
}

/** Sans rien dans l'adresse : l'entrée simple. « ?vue=suivi », une recherche ou un filtre (anciens liens compris) : le suivi. */
function Aiguillage() {
  const params = useSearchParams();
  return params.get("vue") === "suivi" || params.has("q") || params.has("statut") ? <MesListes /> : <EntreeQuantitatifs />;
}

export default function ChantiersPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Aiguillage />
    </Suspense>
  );
}
