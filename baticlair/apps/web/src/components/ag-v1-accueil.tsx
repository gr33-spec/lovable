"use client";

import { ChevronRight, Package, Plus, Sparkles, Timer, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { CARTE, LigneZone } from "@/components/ag-v1-commun";
import { PageTitle, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { FILTRES_V1, SIGNATURE, zoneLisible, type AchatV1, type BesoinV1, type EtatV1 } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

/**
 * Le lien de « Rejoindre » d'un achat : le parcours direct prérempli avec SON produit exact. `achat` verrouille le produit
 * (Greg, 8 novembre 2026 : « je dois pouvoir ajouter des choses mais pas les modifier si c'étaient de vraies demandes
 * d'autres artisans ») : on ajoute sa quantité, on ne change jamais le produit des autres.
 */
export const lienAchat = (a: AchatV1) => `/achats-groupes/nouveau?type=${encodeURIComponent(a.type)}&${Object.entries(a.attributs).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}&reception=${a.reception}&achat=${encodeURIComponent(a.id)}`;

/** Greg, 8 novembre 2026 (« mets que quelques exemples, là c'est trop ») : les 5 qui se terminent le plus tôt d'abord. */
export const ACHATS_VISIBLES = 5;

/** Le temps qui reste avant la fin des inscriptions (« Se termine dans 21 jours »). */
export function finDans(ouvertJusquau: string, maintenant = new Date()): string {
  const fin = new Date(ouvertJusquau.length === 10 ? `${ouvertJusquau}T23:59:59` : ouvertJusquau);
  const jours = Math.ceil((fin.getTime() - maintenant.getTime()) / 86_400_000);
  if (jours <= 0) return "Se termine aujourd'hui";
  if (jours === 1) return "Se termine demain";
  return `Se termine dans ${jours} jours`;
}

/**
 * L'ACCUEIL DES ACHATS GROUPÉS (V5.2, écran 1 ; RÈGLE CHANGÉE, Greg, 8 novembre 2026, capture : « des filtres mais pas plein
 * de boutons… les vignettes beaucoup trop grosses… uniquement le nom du produit avec une sorte de chronomètre… un bouton
 * flottant ») : « Mes besoins groupés » et le département en une ligne, UN filtre (« Métier »), la liste des achats ouverts
 * réduite au nom du produit et au temps qui reste, et le bouton flottant « Ajouter un matériau » (Mobiiz, ou depuis un
 * quantitatif).
 */
export function AccueilAchatsGroupesV1({ etat }: { etat: EtatV1 }) {
  const [lot, setLot] = useState<string>("");
  const [choix, setChoix] = useState(false);
  const [tout, setTout] = useState(false);
  const fetcher = useCallback((s: AbortSignal) => api<{ achats: AchatV1[] }>(`/v1/ag/achats${lot ? `?lot=${lot}` : ""}`, { signal: s }), [lot]);
  const { data } = useResource(fetcher);
  const { data: mes } = useResource(useCallback((s: AbortSignal) => api<{ aFaire: BesoinV1[]; enCours: BesoinV1[] }>("/v1/ag/besoins", { signal: s }).catch(() => ({ aFaire: [], enCours: [] })), []));
  const resume = mes ? [mes.aFaire.length ? `${mes.aFaire.length} action${mes.aFaire.length > 1 ? "s" : ""} à faire` : null, mes.enCours.length ? `${mes.enCours.length} en cours` : null].filter(Boolean).join(" · ") : "";
  // Seuls les métiers qui ont des produits ouverts sont proposés.
  const metiers = FILTRES_V1.filter((f) => etat.produits.some((p) => p.lot === f.id));

  return (
    <div className="flex flex-col gap-4 pb-24 lg:mx-auto lg:w-full lg:max-w-[48rem]">
      <div className="flex flex-col gap-1">
        <PageTitle>Achats groupés</PageTitle>
        <p className="text-[15px] leading-relaxed text-muted">Regroupe tes besoins avec d&apos;autres entreprises de ton département pour mieux négocier.</p>
      </div>
      <Link href="/achats-groupes/mes-besoins" className={`${CARTE} pressable flex min-h-14 items-center gap-3 px-4 py-3`}>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[16px] font-bold">Mes besoins groupés</span>
          <span className="text-[14px] text-muted">{[resume, etat.zone ? zoneLisible(etat.zone) : null].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
      </Link>
      {!etat.zone ? <LigneZone zone={null} /> : null}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-extrabold whitespace-nowrap">Achats ouverts</h2>
        <label className="flex min-w-0 items-center gap-2 text-[15px]">
          <span className="text-muted">Métier</span>
          <select aria-label="Filtrer par métier" value={lot} onChange={(e) => setLot(e.target.value)} className="min-h-11 max-w-[11rem] min-w-0 truncate rounded-full border border-line bg-surface px-3 text-[15px] font-semibold">
            <option value="">Tous</option>
            {metiers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data === null ? (
        <Skeleton card="h-24" lines={0} label="Chargement des achats groupés…" />
      ) : data.achats.length === 0 ? (
        // Revue UX (8 novembre 2026) : liste vide, l'action vit dans la carte (le bouton flottant recouvrait ce texte).
        <div className={`${CARTE} flex flex-col items-start gap-3 p-4`}>
          <p className="text-[15px] text-muted">Aucun achat groupé ouvert{lot ? " pour ce métier" : ""} pour le moment. Ajoute ton matériau : il ouvre le premier.</p>
          <BoutonAjouter onClick={() => setChoix(true)} />
        </div>
      ) : (
        <ul aria-label="Achats groupés ouverts" className={`${CARTE} flex flex-col`}>
          {[...data.achats].sort((x, y) => x.ouvertJusquau.localeCompare(y.ouvertJusquau)).slice(0, tout ? undefined : ACHATS_VISIBLES).map((a) => (
            <li key={a.id} className="border-b border-line last:border-b-0">
              <Link href={lienAchat(a)} className="pressable flex min-h-14 items-center gap-3 px-4 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[16px] leading-snug font-semibold break-words">{a.nom}</span>
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Timer size={14} aria-hidden="true" className="shrink-0" />
                    {finDans(a.ouvertJusquau)}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && data.achats.length > ACHATS_VISIBLES ? (
        <button type="button" onClick={() => setTout(!tout)} className="min-h-11 self-center py-2 text-[15px] font-semibold underline underline-offset-4">
          {tout ? "Voir moins" : `Voir les ${data.achats.length - ACHATS_VISIBLES} autres achats ouverts`}
        </button>
      ) : null}
      <p className="pt-2 text-center text-[13px] text-muted">{SIGNATURE}</p>
      {data && data.achats.length > 0 ? <BoutonAjouter flottant onClick={() => setChoix(true)} /> : null}
      {choix ? <ChoixAjout onFermer={() => setChoix(false)} /> : null}
    </div>
  );
}

/** Les deux façons d'ajouter un matériau (Greg, 8 novembre 2026 : « soit par la liste, soit par l'IA » ; le catalogue est retiré, il y manquera toujours des produits). */
function ChoixAjout({ onFermer }: { onFermer: () => void }) {
  const option = "pressable flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left";
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/50 lg:items-center" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Ajouter un matériau" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-lg flex-col gap-3 rounded-t-[24px] bg-ground p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-ink lg:rounded-[24px]">
        <div className="flex items-center justify-between">
          <p className="text-[18px] font-extrabold">Ajouter un matériau</p>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="grid size-11 place-items-center rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <Link href="/achats-groupes/nouveau" className={option}>
          <Sparkles size={22} aria-hidden="true" className="shrink-0" />
          <span className="flex flex-col">
            <span className="text-[16px] font-bold">Parler à Mobiiz</span>
            <span className="text-[14px] text-muted">Dis ton besoin comme au comptoir, Mobiiz complète avec toi.</span>
          </span>
        </Link>
        <Link href="/achats-groupes/quantitatif" className={option}>
          <Package size={22} aria-hidden="true" className="shrink-0" />
          <span className="flex flex-col">
            <span className="text-[16px] font-bold">Depuis un quantitatif</span>
            <span className="text-[14px] text-muted">Plusieurs articles déjà calculés, chacun dans son achat groupé.</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

/** « Ajouter un matériau » : flottant au-dessus de la liste, ou dans la carte quand aucun achat n'est ouvert. */
function BoutonAjouter({ flottant = false, onClick }: { flottant?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pressable flex min-h-13 items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent ${flottant ? "fixed right-4 bottom-[calc(var(--nav-height)+var(--nav-gap)+12px)] z-30 shadow-float lg:bottom-8" : "shadow-card"}`}
    >
      <Plus size={20} aria-hidden="true" /> Ajouter un matériau
    </button>
  );
}
