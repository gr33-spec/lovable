"use client";

import { useSyncExternalStore } from "react";

/**
 * AUTOMATIQUE / CLAIR / SOMBRE (Greg, 10 novembre 2026, capture 20 ; avant : Clair / Sombre, 31 octobre). Sombre par défaut
 * tant que l'artisan n'a rien choisi (le noir profond des captures). « Automatique » suit le réglage du téléphone ou de
 * l'ordinateur. Le choix est gardé sur l'appareil (préférence d'affichage, rien côté serveur).
 */
export type Theme = "sombre" | "clair";
export type ChoixTheme = Theme | "auto";
const CLE = "mobiiz-theme";
const EVENEMENT = "mobiiz-theme";

function lireChoix(): ChoixTheme {
  try {
    const v = window.localStorage.getItem(CLE);
    return v === "clair" || v === "auto" ? v : "sombre";
  } catch {
    return "sombre";
  }
}
const systemeClair = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches;
const resoudre = (c: ChoixTheme): Theme => (c === "auto" ? (systemeClair() ? "clair" : "sombre") : c);

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel);
  window.addEventListener("storage", rappel);
  const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: light)") : null;
  media?.addEventListener("change", rappel);
  return () => {
    window.removeEventListener(EVENEMENT, rappel);
    window.removeEventListener("storage", rappel);
    media?.removeEventListener("change", rappel);
  };
}

export function choisirTheme(t: ChoixTheme) {
  try {
    window.localStorage.setItem(CLE, t);
  } catch {
    // Stockage refusé (navigation privée) : le choix vaut pour la page ouverte.
  }
  document.documentElement.dataset.theme = resoudre(t);
  window.dispatchEvent(new Event(EVENEMENT));
}

/** Le thème affiché (jamais « auto » : il est résolu). */
export function useTheme(): Theme {
  return useSyncExternalStore(abonner, () => resoudre(lireChoix()), () => "sombre");
}
/** Ce que l'artisan a choisi (« auto » compris), pour l'écran Apparence. */
export function useChoixTheme(): ChoixTheme {
  return useSyncExternalStore(abonner, lireChoix, () => "sombre");
}

/** La classe racine de l'app selon le thème. */
export const classeTheme = (t: Theme) => (t === "clair" ? "app-clair" : "app-nuit");
