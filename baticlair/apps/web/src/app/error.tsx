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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="font-display text-[26px] leading-tight font-extrabold">Oups, cet écran a eu un souci</h1>
      <p className="text-[15px] text-muted">Rien n&apos;est perdu : ton chantier est enregistré. On est prévenus.</p>
      <button type="button" onClick={() => retry()} className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-cta px-5 text-base font-extrabold text-white">
        Réessayer
      </button>
      {/* Un rechargement complet, voulu : après une erreur, on repart d'un état propre. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex min-h-11 items-center justify-center text-[15px] font-bold text-accent-text">
        Retour à l&apos;accueil
      </a>
    </main>
  );
}
