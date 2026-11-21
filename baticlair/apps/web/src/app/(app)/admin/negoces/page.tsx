"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { famille, jourEtHeure, PUCE, RaccourcisAdmin } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, INPUT, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Negoce {
  id: string;
  nom: string;
  familles: string[];
  zone: string[];
  verifie: boolean;
  demandesRecues: number;
  tauxReponse: number | null;
  derniereConnexion: string | null;
}
const FILTRES = [
  { id: "", texte: "Tous" },
  { id: "oui", texte: "Vérifiés" },
  { id: "non", texte: "À vérifier" },
];

/** LA LISTE DES NÉGOCES (Greg, 14 novembre 2026) : familles cochées, zone, vérifié ou non, demandes reçues, taux de réponse. */
export default function AdminNegocesPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Négoces</PageTitle>
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
  const [verifie, setVerifie] = useState(params.get("verifie") ?? "");
  const charger = useCallback(
    (signal: AbortSignal) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (verifie) p.set("verifie", verifie);
      return api<{ total: number; items: Negoce[] }>(`/v1/admin/vue/negoces${p.size ? `?${p}` : ""}`, { signal });
    },
    [q, verifie],
  );
  const { data, error, reload } = useResource(charger);
  return (
    <>
      <RaccourcisAdmin ici="/admin/negoces" />
      <input type="search" aria-label="Rechercher un négoce" placeholder="Rechercher : nom ou département" value={q} onChange={(e) => setQ(e.target.value)} className={INPUT} />
      <div role="group" aria-label="Filtrer par vérification" className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button key={f.id} type="button" aria-pressed={verifie === f.id} onClick={() => setVerifie(f.id)} className={PUCE(verifie === f.id)}>
            {f.texte}
          </button>
        ))}
      </div>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Spinner /> : null}
      {data ? (
        <>
          <p role="status" className="text-[15px] text-muted">
            {data.total} négoce{data.total > 1 ? "s" : ""}
          </p>
          {data.items.length === 0 ? (
            <Card className="p-5 text-[16px]">Aucun négoce ne correspond.</Card>
          ) : (
            <ul aria-label="Négoces" className="flex flex-col gap-2">
              {data.items.map((n) => (
                <li key={n.id}>
                  <Link href={`/admin/negoces/${n.id}`} className="pressable flex flex-col gap-1 rounded-[20px] bg-surface p-4 shadow-card">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[17px] font-extrabold">{n.nom}</span>
                      <span className={`text-[14px] font-bold ${n.verifie ? "text-ok" : "text-warn"}`}>{n.verifie ? "Vérifié" : "À vérifier"}</span>
                    </span>
                    <span className="text-[14px] text-muted">
                      {[n.familles.map(famille).join(", ") || "Aucune famille cochée", n.zone.length ? `Zone : ${n.zone.join(", ")}` : "Zone non dite"].join(" · ")}
                    </span>
                    <span className="text-[14px] text-muted">
                      {n.demandesRecues} demande{n.demandesRecues > 1 ? "s" : ""} reçue{n.demandesRecues > 1 ? "s" : ""} · Taux de réponse : {n.tauxReponse === null ? "pas encore" : `${n.tauxReponse} %`} · Dernière connexion : {jourEtHeure(n.derniereConnexion)}
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
