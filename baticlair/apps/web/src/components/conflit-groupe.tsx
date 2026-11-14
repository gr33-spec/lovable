"use client";

import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";

/**
 * LE CYCLE DE VIE, À L'ÉCRAN (Greg, 6 novembre 2026, §19) : commander seul une ligne tenue par un achat groupé encore
 * ouvert est refusé par le serveur avec sa phrase ; l'artisan la retire LUI-MÊME de l'achat groupé, d'un geste explicite,
 * puis la commande part. Rien n'est retiré en silence.
 */
export function conflitGroupe(e: unknown): string | null {
  return e instanceof ApiError && e.reason === "dans_un_groupe" ? (e.phrase ?? "Une ligne est dans un achat groupé : retire-la d'abord de l'achat groupé.") : null;
}

export function ConflitGroupe({ phrase, pending, onRetirer, onAnnuler }: { phrase: string; pending: boolean; onRetirer: () => void; onAnnuler: () => void }) {
  return (
    <div role="alertdialog" aria-label="Ligne dans un achat groupé" className="flex flex-col gap-3 rounded-xl border-2 border-[var(--color-warn)] bg-surface p-4 shadow-card">
      <p className="text-[15px] font-semibold text-ink">{phrase}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onRetirer} pending={pending}>
          Retirer de l&apos;achat groupé et commander ici
        </Button>
        <Button variant="secondary" onClick={onAnnuler} disabled={pending}>
          Garder l&apos;achat groupé
        </Button>
      </div>
    </div>
  );
}
