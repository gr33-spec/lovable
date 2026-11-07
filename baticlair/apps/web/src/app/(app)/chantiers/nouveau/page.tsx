"use client";

import { Suspense } from "react";
import { NouveauQuantitatif } from "@/components/nouveau-quantitatif";
import { Paywall, useBilling } from "@/components/paywall";
import { BackButton } from "@/components/ui";

/**
 * ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message, point 31) : trois choix, « Depuis mon devis — on t'avance »,
 * « Photo de ma liste », « Je la note moi-même ». Avant, NOUVEAU CAP (22 octobre 2026) : UN GROS BOUTON « Donne ta liste de matériaux » (liste remise au propre) et, en petit
 * dessous, « Je n'ai qu'un devis » (« On t'avance la liste, sans garantie, tu la peaufines. »). Avant (21 octobre) : deux
 * gros boutons, « J'ai un devis » (déposer le PDF, parcours §48, étape 1) et « J'ai déjà ma liste » (photo d'une liste écrite à la main, d'un bon ou d'un devis de négoce, PDF ou
 * capture : l'artisan a déjà compté, les lignes sont lues telles qu'écrites, sans calcul ni question). Le chantier se crée
 * au dépôt, sous un nom d'attente ; la lecture d'un devis lui donne le nom du client, l'adresse et le métier. Les deux
 * chemins arrivent sur le même écran de liste. Rien à taper.
 */
export default function NouveauChantierPage() {
  const billing = useBilling();
  if (billing.data?.limitReached) {
    return (
      <>
        <BackButton fallback="/chantiers" />
        <Paywall status={billing.data} onChange={billing.setData} />
      </>
    );
  }
  // Deux parcours reliés (Greg, 7 novembre 2026) : une seule porte, la conversation (écrire, dicter, photos, document, catalogue).
  return (
    <Suspense>
      <NouveauQuantitatif />
    </Suspense>
  );
}

