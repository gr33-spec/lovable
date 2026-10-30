"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

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
  const lire = useCallback((signal: AbortSignal) => api<{ jauge: Jauge | null }>("/v1/ai-usage/jauge", { signal }), []);
  const { data } = useResource(lire);
  const jauge = phraseJauge(data?.jauge ?? null);
  return (
    <section aria-labelledby="coup-de-main-ia" className="rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed">
      <h2 id="coup-de-main-ia" className="text-[17px] font-extrabold">
        Besoin d&apos;un coup de main ?
      </h2>
      <p className="mt-1 text-muted">
        L&apos;IA peut t&apos;aider à extraire les matériaux de ton devis, mais le résultat dépend de la qualité et de la précision du document. Certaines informations peuvent être manquantes ou
        incorrectes. Pense à toujours vérifier et corriger ta liste avant de l&apos;utiliser.
      </p>
      {jauge ? (
        <p role="status" className="mt-2 font-semibold">
          {jauge}
        </p>
      ) : null}
    </section>
  );
}
