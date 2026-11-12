"use client";

import { ClipboardList, PencilLine, Sparkles } from "lucide-react";
import { useCallback } from "react";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { CarteLien } from "./ux-kit";
import { BackButton } from "./ui";

/**
 * Direction A (Greg, 12 novembre 2026 : « Le quantitatif doit redevenir le cœur du parcours. L'IA doit être une assistance
 * facultative et accessible au bon moment ») : après « Créer un quantitatif », un choix clair, dit avec des mots. La saisie
 * à la main est le parcours principal (carte jaune) ; « Mobiiz m'aide » est le second, facultatif. Une liste commencée et
 * non terminée se reprend d'ici. Aucun quota sur cet écran : il se dit au moment d'analyser un document.
 */
export function ChoixCreation() {
  // Le brouillon de la saisie à la main (gardé sur le serveur) : s'il existe, il se reprend en premier.
  const { data } = useResource(
    useCallback((s: AbortSignal) => api<{ brouillon: { donnees: { lignes?: unknown[] } } | null }>(`/v1/brouillons/un?cle=${encodeURIComponent("liste:saisie")}`, { signal: s }).catch(() => ({ brouillon: null })), []),
  );
  const enCours = data?.brouillon?.donnees.lignes?.length ?? 0;
  return (
    <div className="flex flex-col gap-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:mx-auto lg:w-full lg:max-w-[40rem] lg:gap-5 lg:pb-0">
      <BackButton fallback="/chantiers" />
      <div className="flex flex-col gap-1">
        {/* Sur petit téléphone, le titre tient sur une ligne : les deux choix restent entiers au-dessus du menu. */}
        <h1 className="font-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em] min-[400px]:text-[36px]">Nouveau quantitatif</h1>
        <p className="text-[15px] text-muted">Comment veux-tu le préparer ?</p>
      </div>
      <div className="flex flex-col gap-3">
        {enCours > 0 ? (
          <CarteLien href="/chantiers/nouveau?mode=manuel" icone={ClipboardList} titre={`Reprendre ma liste en cours · ${enCours} matériau${enCours > 1 ? "x" : ""}`} sous="Tu la retrouves comme tu l'as laissée." />
        ) : null}
        <CarteLien jaune href="/chantiers/nouveau?mode=manuel" icone={PencilLine} titre="Je saisis ma liste" sous="Je choisis mes matériaux par métier et par famille, ou je les écris." />
        <CarteLien href="/chantiers/nouveau?mode=assistant" icone={Sparkles} titre="Mobiiz m'aide" sous="À partir d'une photo, d'un devis, d'un PDF, d'une liste ou de ce que je dis. Je vérifie tout." />
      </div>
      <p className="text-[13px] leading-relaxed text-muted">Tu peux changer en cours de route : l&apos;aide de Mobiiz reste disponible depuis ta liste, et rien n&apos;est ajouté sans ton accord.</p>
    </div>
  );
}
