"use client";

import { ChevronRight, ListChecks, Package, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CarteAchat, CARTE, LigneZone } from "@/components/ag-v1-commun";
import { PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { FILTRES_V1, SIGNATURE, zoneLisible, type AchatV1, type BesoinV1, type EtatV1 } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

/** Le lien de « Rejoindre » d'un achat : le parcours direct prérempli avec SON produit exact. */
export const lienAchat = (a: AchatV1) => `/achats-groupes/nouveau?type=${encodeURIComponent(a.type)}&${Object.entries(a.attributs).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`;

/**
 * L'ACCUEIL DES ACHATS GROUPÉS (V5.2, écran 1) : la phrase, la recherche d'un matériau, de vrais filtres, le département
 * de l'entreprise (non modifiable en V1), « Depuis un quantitatif », « Mes besoins groupés », les achats ouverts.
 */
export function AccueilAchatsGroupesV1({ etat }: { etat: EtatV1 }) {
  const [lot, setLot] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const fetcher = useCallback((s: AbortSignal) => api<{ achats: AchatV1[] }>(`/v1/ag/achats${lot ? `?lot=${lot}` : ""}`, { signal: s }), [lot]);
  const { data } = useResource(fetcher);
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<{ aFaire: BesoinV1[]; enCours: BesoinV1[] }>("/v1/ag/besoins", { signal: s }).catch(() => ({ aFaire: [], enCours: [] })), []));
  const trouves = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return etat.produits.filter((p) => norm(`${p.libelle} ${p.lot}`).includes(norm(t)));
  }, [q, etat.produits]);
  const resume = mes ? [mes.aFaire.length ? `${mes.aFaire.length} action${mes.aFaire.length > 1 ? "s" : ""} à faire` : null, mes.enCours.length ? `${mes.enCours.length} en cours` : null].filter(Boolean).join(" · ") : "";

  return (
    <div className="flex flex-col gap-5 lg:mx-auto lg:w-full lg:max-w-[48rem]">
      <div className="flex flex-col gap-2">
        <PageTitle>Achats groupés</PageTitle>
        <p className="text-[16px] leading-relaxed text-muted">Regroupe tes besoins avec d&apos;autres entreprises pour présenter aux négoces des volumes clairs et mieux négocier les conditions.</p>
      </div>
      {/* Greg, 7 novembre 2026 : les deux entrées se voient tout de suite, écrites en toutes lettres. */}
      <div className="flex flex-col gap-2">
        <Link href="/achats-groupes/nouveau" className="pressable flex min-h-16 items-center gap-3 rounded-2xl bg-accent p-3.5 text-on-accent shadow-card">
          <Package size={22} aria-hidden="true" className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] leading-tight font-extrabold">Ajouter un matériau</span>
            <span className="text-[14px] leading-snug">Article par article : un produit précis, sa quantité, ta date.</span>
          </span>
          <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
        </Link>
        <Link href="/achats-groupes/quantitatif" className="pressable flex min-h-16 items-center gap-3 rounded-2xl border-2 border-ink bg-surface p-3.5 text-ink">
          <ListChecks size={22} aria-hidden="true" className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[17px] leading-tight font-extrabold">Depuis un quantitatif</span>
            <span className="text-[14px] leading-snug text-muted">Plusieurs articles déjà calculés ; chacun rejoint ou ouvre son propre achat groupé.</span>
          </span>
          <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="ag-recherche" className="text-[15px] font-bold">
          Ou cherche directement un matériau
        </label>
        <div className="flex min-h-13 items-center gap-2 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
          <Search size={20} aria-hidden="true" className="shrink-0" />
          <input id="ag-recherche" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Quel matériau veux-tu acheter en groupe ?" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted" />
        </div>
        {q.trim() ? (
          <ul aria-label="Produits" className={`${CARTE} flex flex-col`}>
            {trouves.length === 0 ? (
              <li className="p-4 text-[15px] text-muted">Pas encore ouvert aux achats groupés. Ce matériau reste dans ton quantitatif, pour une demande de prix à tes négoces.</li>
            ) : (
              trouves.map((p) => (
                <li key={p.type} className="border-b border-line last:border-b-0">
                  <Link href={`/achats-groupes/nouveau?type=${p.type}`} className="flex min-h-13 items-center gap-3 px-4 py-2 text-[16px] font-semibold">
                    <span className="flex-1">{p.libelle}</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <div role="group" aria-label="Filtrer par lot" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTRES_V1.map((f) => (
          <button key={f.id} type="button" aria-pressed={lot === f.id} onClick={() => setLot(lot === f.id ? null : f.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-[15px] font-semibold ${lot === f.id ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
            {f.libelle}
          </button>
        ))}
      </div>
      <div className={`${CARTE} flex flex-col`}>
        <div className="flex min-h-13 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="text-[15px] text-muted">Mon département</span>
          <span className="text-[16px] font-bold">{etat.zone ? zoneLisible(etat.zone) : "À renseigner"}</span>
        </div>
        <Link href="/achats-groupes/mes-besoins" className="flex min-h-13 items-center gap-3 px-4 py-3">
          <span className="flex flex-1 flex-col">
            <span className="text-[16px] font-semibold">Mes besoins groupés</span>
            {resume ? <span className="text-[14px] text-muted">{resume}</span> : null}
          </span>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      </div>
      {!etat.zone ? <LigneZone zone={null} /> : null}
      {data === null ? (
        <Skeleton card="h-24" lines={0} label="Chargement des achats groupés…" />
      ) : data.achats.length === 0 ? (
        <div className={`${CARTE} flex flex-col gap-2 p-4`}>
          <p className="text-[17px] font-bold">Aucun achat groupé ouvert{lot ? " dans ce lot" : ""} pour le moment</p>
          <p className="text-[15px] text-muted">Les premiers achats groupés se forment avec les premiers besoins ouverts. Touche « Ajouter un matériau » pour ouvrir le tien.</p>
        </div>
      ) : (
        <ul aria-label="Achats groupés ouverts" className="flex flex-col gap-3">
          {data.achats.map((a) => (
            <li key={a.id}>
              <CarteAchat achat={a} href={lienAchat(a)} />
            </li>
          ))}
        </ul>
      )}
      <p className="pt-2 text-center text-[13px] text-muted">{SIGNATURE}</p>
    </div>
  );
}
