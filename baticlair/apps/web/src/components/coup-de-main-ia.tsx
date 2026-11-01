"use client";

import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { phraseQuota, type Quotas } from "../../../../packages/domain/src/groupe/tarifs";

interface Jauge {
  limite: number;
  utilisees: number;
  restantes: number;
  parMois: boolean;
}

/** La phrase de la jauge, avec les règles en vigueur (aucun droit changé) ; null quand rien n'est limité. */
export function phraseJauge(j: Jauge | null): string | null {
  if (!j) return null;
  const periode = j.parMois ? " ce mois-ci" : "";
  if (j.restantes <= 0)
    return `${j.limite > 1 ? `Tes ${j.limite} listes préparées offertes sont utilisées` : "Ta liste préparée offerte est utilisée"}${periode}. La saisie à la main reste gratuite.`;
  return `Encore ${j.restantes} ${j.restantes > 1 ? "listes préparées offertes" : "liste préparée offerte"} sur ${j.limite}${periode}.`;
}

/**
 * « BESOIN D'UN COUP DE MAIN ? » (Greg, 30 octobre 2026, « évolution stratégique », point 10) : avant de déposer un devis
 * ou une photo, l'artisan sait que la lecture est une aide, pas une garantie, et qu'il vérifie sa liste. Ses mots, mot
 * pour mot. Un encadré, jamais une fenêtre de plus à fermer : le parcours ne change pas. Dessous, la jauge des listes
 * préparées offertes (point 8, « des jauges d'utilisation », aucun paiement surprise).
 */
export function CoupDeMainIa() {
  const lire = useCallback((signal: AbortSignal) => api<{ jauge: Jauge | null; quotas?: Quotas | null }>("/v1/ai-usage/jauge", { signal }), []);
  const { data } = useResource(lire);
  // Greg, 30 octobre 2026 (décisions 2 et 3) : la jauge de la formule, analyses de devis et scans de liste.
  const quotas = data?.quotas ?? null;
  const jauge = quotas ? null : phraseJauge(data?.jauge ?? null);
  return (
    <section aria-labelledby="coup-de-main-ia" className="rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed">
      <h2 id="coup-de-main-ia" className="text-[17px] font-extrabold">
        Besoin d&apos;un coup de main ?
      </h2>
      <p className="mt-1 text-muted">
        L&apos;IA peut t&apos;aider à extraire les matériaux de ton devis, mais le résultat dépend de la qualité et de la précision du document. Certaines informations peuvent être manquantes ou
        incorrectes. Pense à toujours vérifier et corriger ta liste avant de l&apos;utiliser.
      </p>
      {quotas ? (
        <ul role="status" aria-label="Ce qu'il te reste" className="mt-2 flex flex-col gap-0.5 font-semibold">
          <li>{phraseQuota(quotas, "analyses")}</li>
          <li>{phraseQuota(quotas, "scans")}</li>
          <li className="font-normal text-muted">Un devis de plus de 150 lignes compte pour 2 analyses.</li>
        </ul>
      ) : jauge ? (
        <p role="status" className="mt-2 font-semibold">
          {jauge}
        </p>
      ) : null}
    </section>
  );
}

/**
 * « MA LISTE DE MATÉRIAUX », L'INFORMATION COURTE (Greg, 31 octobre 2026 : la grande carte « Besoin d'un coup de main ? »
 * inquiétait) : une phrase, le compteur discret, et « Comment fonctionne l'analyse ? » qui ouvre le détail (limites,
 * vérification, décompte). Les deux crédits existants (analyses de devis, scans de photo) restent séparés : aucun
 * décompte n'est fusionné ; le compteur unique est une proposition à valider (`docs/ma-liste-de-materiaux.md`).
 */
export function compteurAnalyses(quotas: Quotas | null, jauge: Jauge | null): string | null {
  if (quotas) {
    const a = quotas.analyses.restantes;
    const s = quotas.scans.restantes;
    return `Il te reste ${a} analyse${a > 1 ? "s" : ""} de devis (PDF) et ${s} analyse${s > 1 ? "s" : ""} de photo.`;
  }
  return phraseJauge(jauge);
}

/**
 * LES DEUX COMPTEURS (Greg, 1er novembre 2026 : « Je ne choisis ni l'option A ni l'option B ») : les deux quotas, séparés
 * comme ils le sont techniquement, jamais un total qui pourrait ensuite refuser un devis.
 */
export function CompteursAnalyses({ quotas }: { quotas: Quotas }) {
  return (
    <div role="status" aria-label="Analyses disponibles">
    <dl className="my-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[14px] text-muted">
      <dt className="col-span-2 font-semibold text-ink">Analyses disponibles</dt>
      <dt>Devis PDF :</dt>
      <dd className="font-semibold text-ink">{quotas.analyses.restantes}</dd>
      <dt>Photos et listes :</dt>
      <dd className="font-semibold text-ink">{quotas.scans.restantes}</dd>
      <dt>Saisie manuelle et description :</dt>
      <dd className="font-semibold text-ink">gratuites</dd>
    </dl>
    </div>
  );
}

export function InfoAnalyse() {
  const lire = useCallback((signal: AbortSignal) => api<{ jauge: Jauge | null; quotas?: Quotas | null }>("/v1/ai-usage/jauge", { signal }), []);
  const { data } = useResource(lire);
  const [ouvert, setOuvert] = useState(false);
  const quotas = data?.quotas ?? null;
  // Sans quotas (formule sans limite, mode négocié) : l'ancienne phrase de la jauge, s'il y en a une.
  const compteur = data && !quotas ? compteurAnalyses(null, data.jauge ?? null) : null;
  return (
    <div className="flex flex-col gap-1 text-[14px] leading-snug">
      <p className="text-ink">MOBIIZ prépare une première liste. Tu pourras tout vérifier et modifier.</p>
      {quotas ? <CompteursAnalyses quotas={quotas} /> : null}
      {compteur ? (
        <p role="status" className="text-muted">
          {compteur}
        </p>
      ) : null}
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
              <li>Un devis (PDF ou photo) compte pour une analyse de devis ; une liste (photo, capture ou PDF), pour une analyse de photo ou de liste. Je te dis lequel avant d&apos;analyser.</li>
              <li>Un document de plus de 150 lignes compte pour 2 analyses : je te préviens avant.</li>
              <li>Une analyse ratée ne compte pas. Un document déjà analysé n&apos;est jamais recompté.</li>
              <li>Saisir ta liste ou décrire ton chantier est gratuit.</li>
            </ul>
            {quotas ? (
              <ul role="status" aria-label="Ce qu'il te reste" className="flex flex-col gap-0.5 font-semibold">
                <li>{phraseQuota(quotas, "analyses")}</li>
                <li>{phraseQuota(quotas, "scans")}</li>
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
