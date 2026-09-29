"use client";

import { useEffect, useState } from "react";

/**
 * Brouillon conservé sur l'appareil pendant la saisie : un appel, un
 * changement d'application ou un rafraîchissement ne font rien perdre.
 */
export function useDraft<T extends Record<string, string>>(key: string, initial: T) {
  const storageKey = `baticlair.draft.${key}`;
  const [values, setValues] = useState<T>(initial);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      // Restauration unique au montage : sessionStorage n'existe pas au rendu serveur.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setValues({ ...initial, ...(JSON.parse(saved) as Partial<T>) });
    } catch {
      /* ignore */
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      /* ignore */
    }
  }, [values, restored, storageKey]);

  const clear = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  return { values, setValues, clear };
}
