"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChoixCreation } from "@/components/choix-creation";
import { NouveauQuantitatif } from "@/components/nouveau-quantitatif";
import { SaisirMaListe } from "@/components/saisir-ma-liste";
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
  return (
    <Suspense>
      <Porte />
    </Suspense>
  );
}

/**
 * Direction A (Greg, 12 novembre 2026) : « Créer un quantitatif » n'ouvre plus l'assistant d'office. Sans mode : le choix
 * (« Je crée ma liste » ou « Mobiiz m'aide »). `?mode=manuel` (et l'ancien `?liste=1`) : la saisie à la main.
 * `?mode=assistant` : l'assistant, avec ses façons d'entrer visibles.
 */
function Porte() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode") ?? (params.get("liste") === "1" ? "manuel" : null);
  if (mode === "manuel") return <SaisirMaListe onFermer={() => router.push("/chantiers/nouveau")} />;
  if (mode === "assistant") return <NouveauQuantitatif />;
  return <ChoixCreation />;
}

