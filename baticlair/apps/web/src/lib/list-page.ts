"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * LA PAGE DES FOURNITURES (retour du fondateur, 2026-10-05 : « passer sur une nouvelle page quand les matériaux
 * arrivent »). Une page à part du chat du chantier, dite dans l'adresse (`?vue=fournitures`) : le retour du téléphone
 * ramène au chantier et un rechargement garde la page ouverte.
 */
const PARAM = "vue";
const VALUE = "fournitures";
/** La page a été ouverte ici (une entrée d'historique ajoutée) : la fermer revient en arrière, sans doublon. */
let pushed = false;

export function useListPage(): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const open = params.get(PARAM) === VALUE;
  const setOpen = useCallback((next: boolean) => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get(PARAM) === VALUE) === next) return;
    if (next) {
      url.searchParams.set(PARAM, VALUE);
      window.history.pushState(null, "", url);
      pushed = true;
    } else if (pushed) {
      pushed = false;
      window.history.back();
      return;
    } else {
      url.searchParams.delete(PARAM);
      window.history.replaceState(null, "", url);
    }
    window.scrollTo({ top: 0 });
  }, []);
  return [open, setOpen];
}
