"use client";

import { Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

const CLE = "baticlair.ecranAccueil";

type Appareil = "iphone" | "android" | null;

/** Sur quel téléphone, hors de l'écran d'accueil ; null sur ordinateur ou déjà installé. */
function appareilAInstaller(): Appareil {
  if (typeof window === "undefined") return null;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return null;
}

/**
 * « AJOUTER À L'ÉCRAN D'ACCUEIL » (plan du 20 octobre 2026, bloc 7) : expliqué une fois, sur le téléphone, à l'accueil de
 * l'app ; « Compris » le range pour de bon (réglage gardé sur l'appareil). Sur l'écran d'accueil, BatiClair s'ouvre en
 * plein écran et peut prévenir quand une liste est prête.
 */
export function InstallHint() {
  const [appareil, setAppareil] = useState<Appareil>(null);
  useEffect(() => {
    let vu = false;
    try {
      vu = localStorage.getItem(CLE) === "vu";
    } catch {
      vu = false;
    }
    // Lu après le rendu : le serveur ne connaît ni l'appareil ni le réglage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!vu) setAppareil(appareilAInstaller());
  }, []);
  if (!appareil) return null;
  const fermer = () => {
    try {
      localStorage.setItem(CLE, "vu");
    } catch {
      // Sans stockage (navigation privée) : l'écran reviendra, sans gêner.
    }
    setAppareil(null);
  };
  return (
    <section aria-label="Ajouter à l'écran d'accueil" className="flex flex-col gap-3 rounded-[20px] bg-ink p-4 text-white shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-extrabold">
          <Smartphone size={18} aria-hidden="true" className="text-accent-on-dark" />
          Mets BatiClair sur ton écran d&apos;accueil
        </p>
        <button type="button" onClick={fermer} aria-label="Fermer" className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-white/70">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="text-[14px] leading-snug text-white/80">Elle s&apos;ouvre comme une app, en plein écran, et te prévient quand ta liste est prête.</p>
      <ol className="flex flex-col gap-1.5 text-[14px] leading-snug">
        {appareil === "iphone" ? (
          <>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">1.</span> Dans Safari, touche <Share size={16} aria-label="Partager" className="inline" /> Partager, en bas de l&apos;écran.
            </li>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">2.</span> Choisis « Sur l&apos;écran d&apos;accueil ».
            </li>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">3.</span> Touche « Ajouter ». C&apos;est tout.
            </li>
          </>
        ) : (
          <>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">1.</span> Dans Chrome, ouvre le menu ⋮ en haut à droite.
            </li>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">2.</span> Choisis « Ajouter à l&apos;écran d&apos;accueil » (ou « Installer l&apos;application »).
            </li>
            <li className="flex items-center gap-2">
              <span className="font-extrabold text-accent-on-dark">3.</span> Confirme. C&apos;est tout.
            </li>
          </>
        )}
      </ol>
      <Button variant="secondary" className="min-h-10 self-start px-4 text-[14px]" onClick={fermer}>
        Compris
      </Button>
    </section>
  );
}
