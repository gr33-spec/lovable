"use client";

import { Check, FileText, Tag, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EXEMPLE } from "@/lib/exemple";

/**
 * LA DÉMO GUIDÉE (plan 2 du 21 octobre 2026, bloc 3) : trois écrans qui montrent l'app avec un faux chantier, sans compte
 * ni API, données fictives marquées comme telles. Nouveau cap (22 octobre) : ta liste → le regroupement → ton prix
 * livré chez toi.
 *
 * DERRIÈRE UN BOUTON (Greg, 24 octobre 2026, capture iPhone : « la démo s'ouvre en plein écran dès l'arrivée, avant même
 * la promesse : c'est déroutant ») : la landing s'ouvre sur l'accroche ; la démo ne s'ouvre jamais d'elle-même, seulement
 * par « Voir comment ça marche (30 s) » sous l'accroche, ou par le lien « Revoir la démo » (`/?demo`). Elle s'ouvre alors
 * en plein écran (`top: 0; height: 100dvh`, page derrière figée), « Passer » ou Échap la referment.
 * MULTIMÉTIER (même jour) : l'écran 1 montre la remise au propre sur une liste de couverture, puis de plomberie, puis de
 * placo (`EXEMPLE.metiers`), qui défilent seules tant qu'on ne touche pas un métier.
 */
export function DemoSurBouton({ className = "" }: { className?: string }) {
  const [ouverte, setOuverte] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // « Revoir la démo » (`/?demo`) : une demande explicite, la démo s'ouvre.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).has("demo")) setOuverte(true);
  }, []);

  // Refermée, le doigt (ou le clavier) revient au bouton, une fois la page rendue de nouveau active.
  const etaitOuverte = useRef(false);
  useEffect(() => {
    if (etaitOuverte.current && !ouverte) bouton.current?.focus();
    etaitOuverte.current = ouverte;
  }, [ouverte]);
  const fermer = useCallback(() => setOuverte(false), []);

  return (
    <>
      <button ref={bouton} type="button" onClick={() => setOuverte(true)} aria-haspopup="dialog" className={className}>
        Voir comment ça marche (30&nbsp;s)
      </button>
      {ouverte ? <DemoPleinEcran onFermer={fermer} /> : null}
    </>
  );
}

function DemoPleinEcran({ onFermer }: { onFermer: () => void }) {
  const cadre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Une vraie fenêtre : la page derrière est figée et inerte (ni touchée, ni lue par un lecteur d'écran).
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const derriere = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== cadre.current && !el.inert);
    for (const el of derriere) {
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    }
    cadre.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = avant;
      for (const el of derriere) {
        el.inert = false;
        el.removeAttribute("aria-hidden");
      }
      window.removeEventListener("keydown", touche);
    };
  }, [onFermer]);
  return createPortal(
    <div ref={cadre} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Démo" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full justify-center overflow-y-auto overscroll-contain bg-night px-4 py-4 outline-none sm:items-center sm:py-8">
      <div className="w-full max-w-xl">
        <DemoGuidee onFermer={onFermer} />
      </div>
    </div>,
    document.body,
  );
}

type Ecran = 0 | 1 | 2;

export function DemoGuidee({ onFermer }: { onFermer: () => void }) {
  const [ecran, setEcran] = useState<Ecran>(0);
  const titres = ["Ta liste, remise au propre", "Le regroupement, tous ensemble", "Ton prix, livré chez toi"];
  return (
    <section data-demo aria-labelledby="demo-titre" className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4 rounded-xl border border-line bg-surface p-4 text-ink sm:min-h-0 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-bold tracking-[0.04em] text-muted">Démo · écran {ecran + 1} sur 3 · données fictives</span>
          <h2 id="demo-titre" className="text-[26px] leading-tight font-extrabold tracking-[-0.03em]">
            {titres[ecran]}
          </h2>
        </div>
        <button type="button" onClick={onFermer} className="pressable inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-[15px] font-semibold">
          Passer
        </button>
      </div>

      {ecran === 0 ? <EcranDevis /> : ecran === 1 ? <EcranLot /> : <EcranOffre />}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <ol aria-label="Écrans de la démo" className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <li key={i} aria-current={i === ecran ? "step" : undefined} className={`size-2.5 rounded-full ${i === ecran ? "bg-ink" : "bg-line"}`} />
          ))}
        </ol>
        {ecran < 2 ? (
          <button type="button" onClick={() => setEcran((ecran + 1) as Ecran)} className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
            Suivant
          </button>
        ) : (
          <Link href="/inscription" className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent hover:bg-accent-hover">
            Je rejoins le mouvement
          </Link>
        )}
      </div>
    </section>
  );
}

function Exemple() {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-bold text-muted">Exemple</span>;
}

/** Le temps de lire une liste avant la suivante (3 listes en ≈ 12 s : la démo entière tient en 30 s). */
const DEFILEMENT_MS = 4000;

/** Écran 1 : la liste donnée en photo et ce qui en sort, dans les mots du comptoir, métier par métier. */
function EcranDevis() {
  const [rang, setRang] = useState(0);
  const [touche, setTouche] = useState(false);
  useEffect(() => {
    if (touche || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setRang((r) => (r + 1) % EXEMPLE.metiers.length), DEFILEMENT_MS);
    return () => window.clearInterval(t);
  }, [touche]);
  const m = EXEMPLE.metiers[rang]!;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div role="tablist" aria-label="Métier de l'exemple" className="grid grid-cols-3 gap-1.5">
        {EXEMPLE.metiers.map((x, i) => (
          <button
            key={x.metier}
            type="button"
            role="tab"
            aria-selected={i === rang}
            onClick={() => {
              setTouche(true);
              setRang(i);
            }}
            className={`pressable inline-flex min-h-11 items-center justify-center rounded-full px-1 text-[13px] font-bold min-[400px]:text-[14px] ${i === rang ? "bg-ink text-white" : "border border-line text-ink"}`}
          >
            {x.metier}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-ground p-3">
        <FileText size={22} aria-hidden="true" className="shrink-0 text-accent-text" />
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-[14px] font-extrabold">
            {/* Plan « finition », bloc 4 : l'écran dit « ta liste, donnée en photo », la carte ne parle plus d'un devis. */}
            Photo de ta liste <Exemple />
          </span>
          <span className="truncate text-[13px] text-muted">{m.photo}</span>
        </div>
      </div>
      <p className="text-[14px] font-bold text-muted">Donnée en photo, remise au propre, ligne par ligne :</p>
      <ul aria-label={`Liste de fournitures (exemple ${m.metier.toLowerCase()})`} className="flex flex-col divide-y divide-line rounded-xl bg-ground">
        {m.liste.map((l) => (
          <li key={l.designation} className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-mark-ok text-white" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="min-w-0 grow text-[14px] font-bold">{l.designation}</span>
            <span className="shrink-0 text-right text-[14px] font-extrabold">{l.quantite}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">Couverture, plomberie, placo… : chaque ligne précise rejoint celles des artisans de ton métier et de ton secteur.</p>
    </div>
  );
}

/** Écran 2 : le regroupement du mois (Greg, 22 octobre 2026) : en quantités, le chrono ; jamais un nombre d'entreprises. */
function EcranLot() {
  const c = EXEMPLE.commande;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Users size={18} aria-hidden="true" className="text-accent-text" />
          {`Commande ${c.de}`} <Exemple />
        </span>
        <p className="text-[15px] font-extrabold text-accent-text">{c.cloture}</p>
        <p className="text-[15px] font-bold">{c.toi}</p>
        <p className="text-[15px] font-bold">{c.tout}</p>
        <ul className="flex flex-col gap-1 text-[14px]">
          <li>À la clôture, tout le volume part aux négoces de la région.</li>
          <li>Tu vois le meilleur prix et tu commandes si ça te plaît.</li>
        </ul>
      </div>
      <p className="text-[14px] font-bold text-muted">Personne ne voit ton nom ni tes chantiers.</p>
    </div>
  );
}

/** Écran 3 : l'offre personnelle, une information, pas une question. */
function EcranOffre() {
  const o = EXEMPLE.offre;
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold">
          <Tag size={18} aria-hidden="true" className="text-accent-text" />
          Ton prix · {EXEMPLE.lot.reference} <Exemple />
        </span>
        <span className="text-[17px] leading-snug font-extrabold">
          {o.quantite} à {o.prix} chez {o.negoce} ({o.baisse})
        </span>
        <span className="text-[15px] font-bold">
          Ton prix : {o.livre} (livraison {o.fraisLivraison}). Ton prix habituel : {o.habituel} l&apos;unité.
        </span>
        <span className="text-[14px] text-muted">Livraison le {o.livraison}, sur ton chantier, sur ton compte chez lui.</span>
        <span className="text-[15px] font-extrabold text-ok">Économie estimée : {o.economie}</span>
      </div>
      <p className="text-[14px] font-bold text-muted">Tu dis « Livré » quand c&apos;est arrivé.</p>
    </div>
  );
}
