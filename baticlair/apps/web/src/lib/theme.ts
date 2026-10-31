"use client";

import { useSyncExternalStore } from "react";

/**
 * CLAIR / SOMBRE (Greg, 31 octobre 2026 : « pour Mobiiz dans son intégralité, deux options : Clair / Sombre (c'est
 * l'existant) »). Sombre par défaut : la nuit chaude du 29 octobre (`app-nuit`). Clair : les jetons de base de l'app, ceux
 * d'avant le 29 octobre. Le choix est gardé sur l'appareil (préférence d'affichage, rien côté serveur).
 */
export type Theme = "sombre" | "clair";
const CLE = "mobiiz-theme";
const EVENEMENT = "mobiiz-theme";

function lire(): Theme {
  try {
    return window.localStorage.getItem(CLE) === "clair" ? "clair" : "sombre";
  } catch {
    return "sombre";
  }
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVENEMENT, rappel);
    window.removeEventListener("storage", rappel);
  };
}

export function choisirTheme(t: Theme) {
  try {
    window.localStorage.setItem(CLE, t);
  } catch {
    // Stockage refusé (navigation privée) : le choix vaut pour la page ouverte.
  }
  document.documentElement.dataset.theme = t;
  window.dispatchEvent(new Event(EVENEMENT));
}

export function useTheme(): Theme {
  return useSyncExternalStore(abonner, lire, () => "sombre");
}

/** La classe racine de l'app selon le thème. */
export const classeTheme = (t: Theme) => (t === "clair" ? "app-clair" : "app-nuit");
