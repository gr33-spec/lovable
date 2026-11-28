"use client";

import Link from "next/link";
import { useCallback } from "react";
import { api } from "@/lib/api";
import type { Brouillon } from "@/lib/brouillon";
import { useResource } from "@/lib/use-resource";

const LIBELLE: Record<Brouillon<unknown>["type"], { titre: string; bouton: string }> = {
  "achat-groupe": { titre: "Reprendre ton achat groupé", bouton: "Reprendre" },
  liste: { titre: "Reprendre ta liste", bouton: "Reprendre" },
  envoi: { titre: "Reprendre ta demande de prix", bouton: "Reprendre" },
};

/**
 * Correction après test de Greg (30 octobre 2026, point 2) : sur l'accueil, chaque parcours commencé et pas fini a sa
 * carte (« Reprendre ton achat groupé », ce qui est déjà saisi, un bouton) ; elle mène à l'étape quittée.
 */
export function CartesReprendre() {
  const charger = useCallback((signal: AbortSignal) => api<{ items: Brouillon<unknown>[] }>("/v1/brouillons", { signal }).catch(() => null), []);
  const { data } = useResource(charger);
  if (!data?.items.length) return null;
  return (
    <section aria-label="À reprendre" className="flex flex-col gap-2">
      {data.items.slice(0, 3).map((b) => (
        <div key={b.cle} className="flex flex-col gap-3 rounded-2xl bg-accent p-4 text-on-accent shadow-card">
          <div className="flex flex-col gap-0.5">
            <p className="text-[17px] font-extrabold">{LIBELLE[b.type].titre}</p>
            <p className="text-[15px]">{b.titre}</p>
          </div>
          <Link href={b.url} className="pressable inline-flex min-h-12 items-center justify-center self-start rounded-full bg-ink px-6 text-[15px] font-extrabold text-surface">
            {LIBELLE[b.type].bouton}
          </Link>
        </div>
      ))}
    </section>
  );
}
