"use client";

import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type Project } from "@/lib/api";

/**
 * « MES LISTES » (Greg, 1er novembre 2026) : la carte d'une liste (entièrement cliquable, avec un vrai bouton « … », jamais
 * un geste caché), le menu (Ouvrir, Marquer terminée ou Remettre en cours, Supprimer définitivement en rouge), la
 * confirmation et l'explication d'un refus. Le serveur décide de tout (`/v1/listes/suppression`).
 */

export interface Refus {
  id: string;
  nom: string;
  phrase: string;
}

const jour = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(new Date(iso));

export function CarteListe({
  projet,
  selection,
  occupe,
  onSupprimer,
  onTerminer,
}: {
  projet: Project;
  selection: { coche: boolean; basculer: () => void } | null;
  occupe: boolean;
  onSupprimer: () => void;
  onTerminer: () => void;
}) {
  const r = projet.resume ?? null;
  const lieu = [projet.clientName, projet.address].filter(Boolean).join(" · ");
  const meta = [r ? (r.lignes > 1 ? `${r.lignes} lignes` : `${r.lignes} ligne`) : null, r?.origine ?? null, `Modifiée le ${jour(projet.lastActivityAt)}`].filter(Boolean).join(" · ");
  const statut = r?.statut ?? (projet.status === "archived" ? "Terminée" : null);
  const ton = statut && /réponse|retenu|Prête|Terminée/.test(statut) ? "bg-ok-bg text-ok" : statut && /vérifier|Brouillon/.test(statut) ? "bg-accent/35 text-ink" : "bg-ground text-ink";
  // Téléphone (375 px) : le statut passe sous le nom, à côté de la ligne d'infos ; rien ne déborde sur le « … ».
  const corps = (
    <span className="flex min-w-0 grow flex-col gap-1">
      <span className="truncate text-[16px] font-extrabold">{projet.name}</span>
      {lieu ? <span className="truncate text-[14px] text-muted">{lieu}</span> : null}
      <span className="flex min-w-0 items-center gap-2">
        {statut ? <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap ${ton}`}>{statut}</span> : null}
        <span className="min-w-0 truncate text-[13px] text-muted">{meta}</span>
      </span>
    </span>
  );
  if (selection) {
    return (
      <label className={`flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-2xl bg-surface p-3.5 text-ink shadow-card ${selection.coche ? "ring-2 ring-danger" : ""}`}>
        <input type="checkbox" checked={selection.coche} onChange={selection.basculer} aria-label={`Choisir : ${projet.name}`} className="size-6 shrink-0 accent-[var(--color-danger)]" />
        {corps}
      </label>
    );
  }
  return (
    <div className="relative flex items-center rounded-2xl bg-surface text-ink shadow-card">
      <Link href={`/chantiers/${projet.id}`} className="pressable flex min-h-[4.5rem] min-w-0 grow items-center gap-3 rounded-2xl p-3.5 pr-1 focus-visible:outline-2 focus-visible:outline-accent">
        {corps}
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted" />
      </Link>
      <MenuListe projet={projet} occupe={occupe} onSupprimer={onSupprimer} onTerminer={onTerminer} />
    </div>
  );
}

function MenuListe({ projet, occupe, onSupprimer, onTerminer }: { projet: Project; occupe: boolean; onSupprimer: () => void; onTerminer: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => !boite.current?.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  const item = "flex min-h-12 w-full items-center px-4 text-left text-[15px] font-semibold hover:bg-ground focus-visible:bg-ground focus-visible:outline-none";
  return (
    <div ref={boite} className="relative shrink-0 pr-1.5">
      <button type="button" aria-label={`Actions : ${projet.name}`} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="pressable flex size-11 items-center justify-center rounded-full text-muted hover:bg-ground focus-visible:outline-2 focus-visible:outline-accent">
        <MoreHorizontal size={22} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div role="menu" aria-label={`Actions : ${projet.name}`} className="animate-rise absolute top-12 right-1.5 z-30 flex w-64 flex-col overflow-hidden rounded-xl border border-line bg-surface py-1 text-ink shadow-card">
          <Link role="menuitem" href={`/chantiers/${projet.id}`} className={item}>
            Ouvrir
          </Link>
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => {
              setOuvert(false);
              onTerminer();
            }}
          >
            {projet.status === "archived" ? "Remettre en cours" : "Marquer terminée"}
          </button>
          <button
            role="menuitem"
            type="button"
            disabled={occupe}
            className={`${item} text-danger`}
            onClick={() => {
              setOuvert(false);
              onSupprimer();
            }}
          >
            Supprimer définitivement
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Fenetre({ titre, children, onFermer }: { titre: string; children: React.ReactNode; onFermer: () => void }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [onFermer]);
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/50 p-4 lg:items-center" onClick={onFermer}>
      <div role="alertdialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()} className="flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)] text-ink shadow-card">
        <h2 className="text-[19px] leading-tight font-extrabold">{titre}</h2>
        {children}
      </div>
    </div>
  );
}

/** La confirmation, mot pour mot ; le bouton rouge ne part qu'une fois (double clic, double tap). */
export function ConfirmerSuppression({ listes, onAnnuler, onFait }: { listes: Project[]; onAnnuler: () => void; onFait: (ids: string[]) => void }) {
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const une = listes.length === 1;
  const titre = une ? "Supprimer définitivement cette liste ?" : `Supprimer définitivement ${listes.length} listes ?`;
  async function supprimer() {
    if (pending) return;
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ supprimees: string[] }>("/v1/listes/suppression", { method: "POST", body: { ids: listes.map((l) => l.id) } });
      onFait(r.supprimees);
    } catch (e) {
      setErreur(e instanceof ApiError && e.phrase ? e.phrase : "La suppression n'a pas abouti. Rien n'a été supprimé : réessaie dans un instant.");
      setPending(false);
    }
  }
  return (
    <Fenetre titre={titre} onFermer={() => !pending && onAnnuler()}>
      <p className="text-[15px] leading-snug">
        {une ? <>« {listes[0]!.name} » et ses données associées seront supprimées. Cette action est irréversible.</> : <>Ces listes et leurs données associées seront supprimées. Cette action est irréversible.</>}
      </p>
      {!une ? (
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-[14px] text-muted">
          {listes.map((l) => (
            <li key={l.id}>{l.name}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-[14px] text-muted">Les crédits d&apos;analyse déjà utilisés ne seront pas recrédités.</p>
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-[14px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={onAnnuler} className="pressable min-h-12 rounded-xl border border-line px-3 text-[15px] font-semibold disabled:opacity-50">
          Annuler
        </button>
        <button type="button" disabled={pending} aria-busy={pending} onClick={() => void supprimer()} className="pressable min-h-12 rounded-xl bg-danger px-3 text-[15px] font-bold text-white disabled:opacity-60">
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
      </div>
    </Fenetre>
  );
}

/**
 * Le refus, dit avant toute action : la raison précise de chaque liste ; « Marquer terminée » quand c'est la seule
 * action utile ; dans une sélection, les autres ne partent que sur un geste explicite (jamais en silence).
 */
export function ListeNonSupprimable({ refus, autres, onFermer, onTerminer, onSupprimerAutres }: { refus: Refus[]; autres: Project[]; onFermer: () => void; onTerminer: (() => void) | undefined; onSupprimerAutres: () => void }) {
  const une = refus.length === 1;
  return (
    <Fenetre titre={une ? "Cette liste ne peut pas être supprimée" : `${refus.length} listes ne peuvent pas être supprimées`} onFermer={onFermer}>
      {une && autres.length === 0 ? (
        <p className="text-[15px] leading-snug">{refus[0]!.phrase}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {refus.map((r) => (
            <li key={r.id} className="text-[15px] leading-snug">
              <span className="font-bold">{r.nom}</span> : {r.phrase}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 flex flex-col gap-2">
        {autres.length > 0 ? (
          <button type="button" onClick={onSupprimerAutres} className="pressable min-h-12 rounded-xl bg-danger px-3 text-[15px] font-bold text-white">
            {autres.length > 1 ? `Supprimer les ${autres.length} autres listes` : "Supprimer l'autre liste"}
          </button>
        ) : null}
        {onTerminer ? (
          <button type="button" onClick={onTerminer} className="pressable min-h-12 rounded-xl border border-line px-3 text-[15px] font-semibold">
            Marquer terminée
          </button>
        ) : null}
        <button type="button" onClick={onFermer} className="pressable min-h-12 rounded-xl border border-line px-3 text-[15px] font-semibold">
          Fermer
        </button>
      </div>
    </Fenetre>
  );
}
