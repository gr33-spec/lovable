"use client";

import { useSyncExternalStore } from "react";

/**
 * LE DÉPARTEMENT TOUCHÉ SUR LA CARTE (pages régionales, Greg, 19 novembre 2026) : il est retenu sur l'appareil (préférence
 * d'affichage, rien côté serveur tant que l'artisan ne s'inscrit pas), suit chaque bouton « Commencer » de la page et se
 * retrouve rempli à l'inscription. Stockage refusé (navigation privée) : il vaut pour la page ouverte.
 */
const CLE = "mobiiz-departement";
const EVENEMENT = "mobiiz-departement";
let enMemoire: string | null = null;

export function lireDepartement(): string | null {
  try {
    return window.localStorage.getItem(CLE) ?? enMemoire;
  } catch {
    return enMemoire;
  }
}

export function choisirDepartement(code: string | null) {
  enMemoire = code;
  try {
    if (code) window.localStorage.setItem(CLE, code);
    else window.localStorage.removeItem(CLE);
  } catch {
    // Stockage refusé : la valeur en mémoire suffit pour la page ouverte.
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVENEMENT, rappel);
    window.removeEventListener("storage", rappel);
  };
}

/** Le département retenu, parmi ceux de la page (`codes`) ; `null` avant le premier toucher ou s'il est d'ailleurs. */
export function useDepartementChoisi(codes: readonly string[]): string | null {
  const v = useSyncExternalStore(abonner, lireDepartement, () => null);
  return v && codes.includes(v) ? v : null;
}

/** L'adresse d'inscription d'une page : le métier, le département s'il est choisi, et la page d'où l'on vient. */
export function lienInscription(metier: string, departement: string | null, depuis: string): string {
  const p = new URLSearchParams({ metier });
  if (departement) p.set("departement", departement);
  p.set("depuis", depuis);
  return `/inscription?${p.toString()}`;
}
