"use client";

import { useEffect } from "react";

/**
 * Le service worker sur chaque page (revue du 26 octobre 2026) : les pages déjà vues se rouvrent hors connexion, et les
 * notifications arrivent. Pas en développement (le cache gênerait le rechargement à chaud).
 */
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/** À la déconnexion et à la suppression du compte : plus rien de ce compte ne reste sur l'appareil. */
export async function viderCacheAppareil(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage("vider");
    if (typeof caches !== "undefined") await Promise.all((await caches.keys()).map((c) => caches.delete(c)));
  } catch {
    /* navigation privée, ou cache indisponible : rien à vider */
  }
}
