"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * L'en-tête compact d'une rubrique : la flèche retour et le titre. La flèche mène TOUJOURS au sommaire « Profil et
 * paramètres » (son nom le dit), même arrivé par un lien direct.
 */
export function EnTeteRubrique({ titre, onRetour }: { titre: string; onRetour?: () => void }) {
  const router = useRouter();
  const back = () => router.push("/compte");
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onRetour ?? back} aria-label="Retour à Profil et paramètres" className="pressable bouton-nuit flex size-11 shrink-0 items-center justify-center rounded-full">
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em]">{titre}</h1>
    </div>
  );
}
