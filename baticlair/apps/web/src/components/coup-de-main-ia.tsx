"use client";

import { X } from "lucide-react";
import { useState } from "react";

/**
 * « MA LISTE DE MATÉRIAUX », L'INFORMATION COURTE (Greg, 31 octobre 2026 : la grande carte « Besoin d'un coup de main ? »
 * inquiétait) : une phrase, et « Comment fonctionne l'analyse ? » qui ouvre le détail (limites, vérification). RÈGLE CHANGÉE
 * le 15 novembre 2026 : plus aucun compteur ni barre ici (avant : « Analyses disponibles », devis et photos) ; un compte
 * gratuit lit ce qui lui reste seulement dans la fenêtre « Analyser ce document ? », un abonné ne lit aucun nombre.
 */
export function InfoAnalyse() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex flex-col gap-1 text-[14px] leading-snug">
      <p className="text-ink">MOBIIZ prépare une première liste. Tu pourras tout vérifier et modifier.</p>
      <button type="button" onClick={() => setOuvert(true)} className="min-h-11 self-start font-semibold text-accent-text underline underline-offset-4">
        Comment fonctionne l&apos;analyse&nbsp;?
      </button>
      {ouvert ? (
        <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/40 p-4 lg:items-center" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-modal="true" aria-label="Comment fonctionne l'analyse ?" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)] text-[15px] leading-relaxed text-ink shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold">Comment fonctionne l&apos;analyse ?</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="grid size-10 place-items-center rounded-full">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <p>
              L&apos;IA peut t&apos;aider à extraire les matériaux de ton devis, mais le résultat dépend de la qualité et de la précision du document. Certaines informations peuvent être manquantes ou
              incorrectes. Pense à toujours vérifier et corriger ta liste avant de l&apos;utiliser.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-muted">
              <li>Un devis, une photo ou une liste : chaque document analysé compte pour une analyse. En Gratuit, tu en as 3 offertes en tout ; avec Pro, elles sont incluses.</li>
              <li>En Gratuit, un document de plus de 150 lignes compte pour 2 analyses : je te préviens avant.</li>
              <li>Une analyse ratée ne compte pas. Un document déjà analysé n&apos;est jamais recompté. Un devis de plus de 20 pages n&apos;est pas analysé.</li>
              <li>Saisir ta liste ou décrire ton chantier est gratuit.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
