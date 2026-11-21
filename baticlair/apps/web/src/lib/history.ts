"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

/**
 * « Retour » suit le parcours réel : si l'on est arrivé ici en naviguant
 * dans l'application, on revient à l'écran précédent (avec sa recherche,
 * ses filtres et sa position). Si la page a été ouverte directement (lien,
 * notification), on remonte à son parent logique.
 */
const KEY = "baticlair.inAppNavigations";

export function useTrackNavigation(): void {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const count = Number(sessionStorage.getItem(KEY) ?? "0");
      sessionStorage.setItem(KEY, String(count + 1));
    } catch {
      /* ignore */
    }
  }, [pathname]);
}

export function useBack(fallback: string): () => void {
  const router = useRouter();
  return useCallback(() => {
    let count = 0;
    try {
      count = Number(sessionStorage.getItem(KEY) ?? "0");
    } catch {
      /* ignore */
    }
    if (count > 1 && window.history.length > 1) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
