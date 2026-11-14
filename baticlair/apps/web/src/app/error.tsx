"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/**
 * UN ÉCRAN QUI CASSE (audit avant commercialisation, 2026-10-11) : au lieu de la page blanche « Application error » en
 * anglais, une phrase, « Réessayer » et le retour à l'accueil ; l'équipe est prévenue (`reportError`).
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    // Recette du 13 novembre 2026 (G38) : l'écran porte ses propres couleurs (ivoire, encre), quel que soit le thème
    // resté sur la page : la phrase ne peut plus sortir noire sur fond noir.
    <main className="fixed inset-0 z-50 flex flex-col justify-center overflow-y-auto bg-[#FBF8F3] px-5 text-[#130901] [color-scheme:light]">
     <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h1 className="font-display text-[26px] leading-tight font-extrabold">Oups, cet écran a eu un souci</h1>
      <p className="text-[15px] text-[#614822]">Rien n&apos;est perdu : ton chantier est enregistré. On est prévenus.</p>
      <button type="button" onClick={() => retry()} className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#FFC800] px-5 text-base font-extrabold text-[#130901]">
        Réessayer
      </button>
      {/* Un rechargement complet, voulu : après une erreur, on repart d'un état propre. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex min-h-11 items-center justify-center text-[15px] font-bold text-[#130901] underline">
        Retour à l&apos;accueil
      </a>
     </div>
    </main>
  );
}
