"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { formule, jour, jourEtHeure, metier, PUCE, RaccourcisAdmin } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, INPUT, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Artisan {
  id: string;
  entreprise: string;
  metiers: string[];
  departement: string | null;
  formule: string;
  paiementRefuse: boolean;
  codePromo: string | null;
  inscritLe: string;
  derniereConnexion: string | null;
}
const FILTRES = [
  { id: "", texte: "Tous" },
  { id: "payant", texte: "Payants" },
  { id: "decouverte", texte: "Découverte" },
  { id: "echec", texte: "Paiement refusé" },
];

/** LA LISTE DES ARTISANS (Greg, 14 novembre 2026) : une seule barre de recherche et quelques filtres simples. */
export default function AdminArtisansPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Artisans</PageTitle>
      <PorteAdmin>
        <Suspense fallback={<Spinner />}>
          <Liste />
        </Suspense>
      </PorteAdmin>
    </div>
  );
}

function Liste() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState(params.get("formule") ?? "");
  const recents = params.get("recents") === "1";
  const charger = useCallback(
    (signal: AbortSignal) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (filtre) p.set("formule", filtre);
      if (recents) p.set("recents", "1");
      return api<{ total: number; items: Artisan[] }>(`/v1/admin/vue/artisans${p.size ? `?${p}` : ""}`, { signal });
    },
    [q, filtre, recents],
  );
  const { data, error, reload } = useResource(charger);
  return (
    <>
      <RaccourcisAdmin ici="/admin/artisans" />
      <input type="search" aria-label="Rechercher un artisan" placeholder="Rechercher : entreprise, département, code promo" value={q} onChange={(e) => setQ(e.target.value)} className={INPUT} />
      <div role="group" aria-label="Filtrer par formule" className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)} className={PUCE(filtre === f.id)}>
            {f.texte}
          </button>
        ))}
      </div>
      {recents ? <p className="text-[15px] text-muted">Inscrits depuis 7 jours.</p> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Spinner /> : null}
      {data ? (
        <>
          <p role="status" className="text-[15px] text-muted">
            {data.total} artisan{data.total > 1 ? "s" : ""}
          </p>
          {data.items.length === 0 ? (
            <Card className="p-5 text-[16px]">Aucun artisan ne correspond.</Card>
          ) : (
            <ul aria-label="Artisans" className="flex flex-col gap-2">
              {data.items.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/artisans/${a.id}`} className="pressable flex flex-col gap-1 rounded-[20px] bg-surface p-4 shadow-card">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[17px] font-extrabold">{a.entreprise}</span>
                      <span className={`text-[14px] font-bold ${a.paiementRefuse ? "text-danger" : ""}`}>
                        {formule(a.formule)}
                        {a.paiementRefuse ? " · paiement refusé" : ""}
                      </span>
                    </span>
                    <span className="text-[14px] text-muted">
                      {[a.metiers.map(metier).join(", ") || "Métier non dit", a.departement ? `Département ${a.departement}` : "Département non dit", a.codePromo ? `Code ${a.codePromo}` : null].filter(Boolean).join(" · ")}
                    </span>
                    <span className="text-[14px] text-muted">
                      Inscrit le {jour(a.inscritLe)} · Dernière connexion : {jourEtHeure(a.derniereConnexion)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
