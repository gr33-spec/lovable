"use client";

import { ClipboardList, Mic, PencilLine, Sparkles } from "lucide-react";
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
export function ChoixCreation({ pour = null }: { /** Venu de « Publier un besoin » (achats groupés) : le même outil, puis l'écran où l'on coche les lignes à grouper. */ pour?: "achat-groupe" | null } = {}) {
  // Lot E : venu des achats groupés, tout le parcours reste sous « Achats groupés » (`/achats-groupes/publier`).
  const base = pour ? "/achats-groupes/publier" : "/chantiers/nouveau";
  // Le brouillon de la saisie à la main (gardé sur le serveur) : s'il existe, il se reprend en premier.
  const { data } = useResource(
    useCallback((s: AbortSignal) => api<{ brouillon: { donnees: { lignes?: unknown[] } } | null }>(`/v1/brouillons/un?cle=${encodeURIComponent("liste:saisie")}`, { signal: s }).catch(() => ({ brouillon: null })), []),
  );
  const enCours = data?.brouillon?.donnees.lignes?.length ?? 0;
  return (
    <div className="flex flex-col gap-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:w-full lg:max-w-[68rem] lg:gap-6 lg:pb-0">
      <BackButton fallback={pour ? "/achats-groupes" : "/chantiers"} />
      <div className="flex flex-col gap-1">
        {/* Sur petit téléphone, le titre tient sur une ligne : les deux choix restent entiers au-dessus du menu. */}
        <h1 className="font-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em] min-[400px]:text-[36px]">{pour ? "Publier un besoin groupé" : "Nouveau quantitatif"}</h1>
        <p className="text-[15px] text-muted">{pour ? "Prépare les matériaux que tu souhaites acheter avec d'autres artisans. Tu vérifieras tout avant la publication." : "Comment veux-tu le préparer ?"}</p>
      </div>
      {/* Ordinateur (Greg, 27 novembre 2026) : les choix côte à côte, en grandes cartes ; le téléphone garde sa colonne. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-4">
        {enCours > 0 ? (
          <div className="lg:col-span-3"><CarteLien remplace href={`${base}?mode=manuel`} icone={ClipboardList} titre={`Reprendre ma liste en cours · ${enCours} matériau${enCours > 1 ? "x" : ""}`} sous="Tu la retrouves comme tu l'as laissée." /></div>
        ) : null}
        <CarteLien remplace jaune href={`${base}?mode=manuel`} icone={PencilLine} colonne titre="Je saisis ma liste" sous="Je choisis mes matériaux par métier et par famille, ou je les écris." />
        <CarteLien remplace href={`${base}?mode=assistant`} icone={Sparkles} colonne titre="Mobiiz m'aide" sous="À partir d'une photo, d'un devis, d'un PDF, d'une liste ou de ce que je dis. Je vérifie tout." />
        {/* « À la voix » (Greg, 27 novembre 2026) : décrire son chantier en parlant, à côté de la photo et du texte. */}
        <CarteLien remplace href={`${base}?mode=assistant&entree=voix`} icone={Mic} colonne titre="À la voix" sous="Je décris mon chantier en parlant. Je relis le texte avant de l'envoyer." />
      </div>
      <p className="text-[13px] leading-relaxed text-muted">Tu peux changer en cours de route : l&apos;aide de Mobiiz reste disponible depuis ta liste, et rien n&apos;est ajouté sans ton accord.</p>
    </div>
  );
}
