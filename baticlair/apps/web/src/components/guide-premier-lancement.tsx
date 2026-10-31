"use client";

import { CalendarClock, FileUp, Truck, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { NOM_APP } from "@/lib/nom";
import { useSession } from "@/lib/session";
import { useProchaineCommande } from "./commande-du-mois";
import { useAncienMode } from "@/components/negocie";

/** Le menu (« Revoir le guide ») rouvre le guide par cet événement, sans rien changer au compte. */
export const EVENEMENT_REVOIR_GUIDE = "mobiiz:revoir-guide";
export const revoirLeGuide = () => window.dispatchEvent(new Event(EVENEMENT_REVOIR_GUIDE));
/** Le guide fermé sur ce navigateur (en plus de la note du compte, qui fait foi sur les autres appareils). */
const cleGuideVu = (userId: string) => `mobiiz.guideVu.${userId}`;
const dejaVuIci = (userId: string) => {
  try {
    return localStorage.getItem(cleGuideVu(userId)) === "1";
  } catch {
    return false;
  }
};

// Recentrage (Greg, 25 octobre 2026) : les trois étapes de la landing ; le groupe vient en plus.
const ETAPES = [
  { titre: "Dépose ton devis", texte: "Le PDF de ton devis client, tel quel : je remets chaque ligne au propre.", Icone: FileUp },
  { titre: `${NOM_APP} prépare ton quantitatif`, texte: "Une ligne par fourniture, prête à commander. Tu corriges d'un tap si besoin.", Icone: Users },
  { titre: "Envoie à tes négoces et compare", texte: "Leurs prix livraison comprise, côte à côte. Pour les gros matériaux, tente aussi un prix de groupe. Sans engagement.", Icone: Truck },
] as const;

/** « jeudi 31 octobre à 18 h », heure de Paris. */
export function dateDeCloture(iso: string): string {
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d);
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).split(":");
  return `${jour} à ${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
}

/**
 * LE GUIDE DU PREMIER LANCEMENT (Greg, 24 octobre 2026) : une fois inscrit, trois écrans plein écran, sautables à chaque
 * étape (« Passer le guide »), avec la date de la prochaine clôture, et pour finir « Déposer ma première liste ». Vu ou
 * passé, il est noté sur le compte (`POST /v1/me/guide/vu`) et ne revient plus d'office ; « Revoir le guide », dans le
 * menu, le rouvre. Rien d'autre ne s'ouvre par-dessus tant qu'il est là.
 */
export function GuidePremierLancement() {
  const { me, features } = useSession();
  const userId = me.user.id;
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState(0);
  const moisActif = useAncienMode() && features.commandeCommune !== "lots";
  const { prochaine } = useProchaineCommande(moisActif && ouvert);

  useEffect(() => {
    const controle = new AbortController();
    // Fermé sur ce navigateur juste avant un rechargement : la note du serveur n'est peut-être pas encore arrivée ; on
    // la renvoie, et le guide ne se rouvre pas.
    if (dejaVuIci(userId)) void api("/v1/me/guide/vu", { method: "POST" }).catch(() => undefined);
    else
      api<{ aMontrer: boolean }>("/v1/me/guide", { signal: controle.signal })
        .then((r) => {
          if (r.aMontrer && !dejaVuIci(userId)) setOuvert(true);
        })
        .catch(() => undefined);
    const revoir = () => {
      setEtape(0);
      setOuvert(true);
    };
    window.addEventListener(EVENEMENT_REVOIR_GUIDE, revoir);
    return () => {
      controle.abort();
      window.removeEventListener(EVENEMENT_REVOIR_GUIDE, revoir);
    };
  }, [userId]);

  const fermer = useCallback(() => {
    setOuvert(false);
    try {
      localStorage.setItem(cleGuideVu(userId), "1");
    } catch {
      // Sans stockage local, le serveur suffit.
    }
    void api("/v1/me/guide/vu", { method: "POST" }).catch(() => undefined);
  }, [userId]);

  if (!ouvert) return null;
  return <Fenetre etape={etape} setEtape={setEtape} fermer={fermer} cloture={prochaine?.clotureLe ?? null} />;
}

function Fenetre({ etape, setEtape, fermer, cloture }: { etape: number; setEtape: (n: number) => void; fermer: () => void; cloture: string | null }) {
  const cadre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Une vraie fenêtre : la page derrière est figée et inerte.
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const derriere = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== cadre.current && !el.inert);
    for (const el of derriere) {
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    }
    cadre.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
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
  }, [fermer]);

  const e = ETAPES[etape]!;
  const derniere = etape === ETAPES.length - 1;
  return createPortal(
    <div ref={cadre} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Guide" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full justify-center overflow-y-auto overscroll-contain bg-ground px-4 py-4 outline-none sm:items-center sm:py-8">
      <section aria-labelledby="guide-titre" className="flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-6 rounded-[20px] bg-surface p-5 text-ink shadow-card sm:min-h-0 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold tracking-[0.04em] text-muted">
            {etape + 1} sur {ETAPES.length}
          </span>
          <button type="button" onClick={fermer} className="pressable inline-flex min-h-11 items-center rounded-full border border-line px-4 text-[15px] font-semibold">
            Passer le guide
          </button>
        </div>
        <span className="flex size-14 items-center justify-center rounded-[16px] bg-accent text-on-accent" aria-hidden="true">
          <e.Icone size={28} />
        </span>
        <div className="flex flex-col gap-3">
          <h2 id="guide-titre" className="text-[28px] leading-[1.08] font-extrabold tracking-[-0.03em]">
            {e.titre}
          </h2>
          <p className="text-[16px] leading-relaxed text-muted">{e.texte}</p>
        </div>
        {cloture ? (
          <p className="flex items-center gap-3 rounded-[16px] bg-ground px-4 py-3 text-[15px] font-semibold">
            <CalendarClock size={20} aria-hidden="true" className="shrink-0 text-accent-text" />
            <span>
              Prochaine clôture : <span className="font-extrabold">{dateDeCloture(cloture)}</span>
            </span>
          </p>
        ) : null}
        <div className="mt-auto flex flex-col gap-4 pt-2">
          <ol aria-label="Étapes du guide" className="flex justify-center gap-1.5">
            {ETAPES.map((x, i) => (
              <li key={x.titre} aria-current={i === etape ? "step" : undefined} className={`size-2.5 rounded-full ${i === etape ? "bg-ink" : "bg-line"}`} />
            ))}
          </ol>
          {derniere ? (
            <Link href="/chantiers/nouveau" onClick={fermer} className="pressable inline-flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-6 text-[16px] font-semibold text-on-accent active:bg-accent-hover">
              Déposer mon premier devis
            </Link>
          ) : (
            <button type="button" onClick={() => setEtape(etape + 1)} className="pressable inline-flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-6 text-[16px] font-semibold text-on-accent active:bg-accent-hover">
              Suivant
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
