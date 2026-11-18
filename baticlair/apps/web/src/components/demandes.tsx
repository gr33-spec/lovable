"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MesBesoinsV1 } from "@/components/ag-v1-besoins";
import { MesListes } from "@/components/mes-demandes-negoces";
import { PageTitle, Skeleton } from "@/components/ui";
import { useAgV1 } from "@/lib/ag-v1";

type Sorte = "negoces" | "groupees";
const SORTES: { value: Sorte; label: string }[] = [
  { value: "negoces", label: "Négoces" },
  { value: "groupees", label: "Groupées" },
];

/**
 * « DEMANDES » (Greg, 18 novembre 2026, navigation définitive du téléphone) : tout ce que j'ai lancé, au même endroit.
 * Deux filtres en haut : « Négoces » (mes demandes de prix, avec leurs états en filtres secondaires : à préparer, envoyées,
 * réponses reçues, terminées) et « Groupées » (mes besoins groupés, publiés ou rejoints). Chaque carte dit son état en une
 * phrase ; en l'ouvrant, on trouve les réponses des négoces et ce qu'il reste à faire. Le filtre vit dans l'adresse
 * (`?type=groupees`), les anciens liens (`/chantiers?vue=suivi`, `/achats-groupes/mes-besoins`) restent valables.
 */
function Demandes() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sorte: Sorte = params.get("type") === "groupees" ? "groupees" : "negoces";
  const { etat } = useAgV1();
  const choisir = (s: Sorte) => router.replace(s === "negoces" ? pathname : `${pathname}?type=${s}`, { scroll: false });
  return (
    <div className="flex flex-col gap-4">
      <span className="flex flex-col gap-1">
        <PageTitle>Demandes</PageTitle>
        <span className="text-[14px] text-muted">Tout ce que tu as lancé : tes demandes de prix et tes besoins groupés.</span>
      </span>
      <div role="tablist" aria-label="Sorte de demandes" className="grid grid-cols-2 gap-1 rounded-full bg-(--voile-1) p-1 ring-1 ring-line">
        {SORTES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={sorte === s.value}
            onClick={() => choisir(s.value)}
            className={`pressable min-h-11 rounded-full text-[15px] font-extrabold ${sorte === s.value ? "bg-surface text-ink shadow-card" : "text-muted"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={sorte === "negoces" ? "Négoces" : "Groupées"} className="flex flex-col gap-4">
        {sorte === "negoces" ? (
          <MesListes integre />
        ) : etat === undefined ? (
          <Skeleton card="h-32" lines={2} label="Chargement de tes besoins…" />
        ) : etat ? (
          <MesBesoinsV1 integre />
        ) : (
          <p className="text-[15px] text-muted">
            Tes besoins groupés se suivent dans{" "}
            <Link href="/achats-groupes?vue=mes-groupes" className="font-semibold underline underline-offset-4">
              Mes groupes
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

export function PageDemandes() {
  return (
    <Suspense fallback={<Skeleton card="h-32" lines={2} label="Chargement de tes demandes…" />}>
      <Demandes />
    </Suspense>
  );
}
