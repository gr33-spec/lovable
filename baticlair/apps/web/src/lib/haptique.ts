"use client";

import { useSyncExternalStore } from "react";

/**
 * LES RETOURS HAPTIQUES (Greg, 20 novembre 2026 : « des retours haptiques sur la carte, mais aussi dans l'application ») :
 * une petite vibration quand on touche un bouton, un choix ou une case. Sans bibliothèque.
 * - Android (et tout navigateur qui l'a) : `navigator.vibrate`, une impulsion courte.
 * - iPhone : Safari ne donne pas `vibrate` aux sites ; depuis iOS 18, toucher un interrupteur natif
 *   (`<input type="checkbox" switch>`) donne le petit « clic » du système. On en touche un, invisible, le temps du geste.
 * Coupable dans Profil › Apparence (« Vibrations au toucher », gardé sur l'appareil) ; rien ne vibre sans un vrai toucher.
 */
const CLE = "mobiiz-vibrations";
const EVENEMENT = "mobiiz-vibrations";

export function vibrationsActives(): boolean {
  try {
    return window.localStorage.getItem(CLE) !== "non";
  } catch {
    return true;
  }
}

export function choisirVibrations(oui: boolean) {
  try {
    window.localStorage.setItem(CLE, oui ? "oui" : "non");
  } catch {
    // Stockage refusé : le réglage vaut pour la page ouverte seulement.
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

export function useVibrations(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      window.addEventListener(EVENEMENT, rappel);
      window.addEventListener("storage", rappel);
      return () => {
        window.removeEventListener(EVENEMENT, rappel);
        window.removeEventListener("storage", rappel);
      };
    },
    vibrationsActives,
    () => true,
  );
}

/** « Léger » pour un choix (région, métier, case), « appui » pour un bouton d'action. */
export function vibrer(force: "leger" | "appui" = "leger") {
  if (typeof window === "undefined" || !vibrationsActives()) return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(force === "appui" ? 14 : 8);
    return;
  }
  // iPhone : l'interrupteur natif, touché puis retiré aussitôt (le clic produit n'est pas un « vrai » toucher : il ne
  // relance jamais ce retour, voir `isTrusted` dans `RetoursHaptiques`).
  try {
    const etiquette = document.createElement("label");
    etiquette.setAttribute("aria-hidden", "true");
    etiquette.style.display = "none";
    const interrupteur = document.createElement("input");
    interrupteur.type = "checkbox";
    interrupteur.setAttribute("switch", "");
    etiquette.appendChild(interrupteur);
    document.head.appendChild(etiquette);
    etiquette.click();
    etiquette.remove();
  } catch {
    // Pas d'interrupteur natif (iOS d'avant 18, autre navigateur) : rien, en silence.
  }
}

/** Ce qui vibre quand on le touche : boutons, choix, cases ; jamais un simple lien de navigation ni un élément désactivé. */
const CIBLES = 'button, [role="button"], [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], input[type="checkbox"], input[type="radio"], summary';

export function cibleHaptique(el: EventTarget | null): "leger" | "appui" | null {
  if (!(el instanceof Element)) return null;
  const c = el.closest(CIBLES);
  if (!c || c.closest('[aria-disabled="true"], :disabled')) return null;
  // Un choix (pressé ou non, coché ou non) : léger. Un bouton d'action : un appui.
  if (c.matches('[aria-pressed], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], input, summary, [data-departement], [data-region]')) return "leger";
  return "appui";
}
