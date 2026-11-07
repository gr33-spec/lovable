"use client";

import { useEffect, useRef } from "react";

/**
 * TURNSTILE (Cloudflare, gratuit ; Greg, 26 octobre 2026, feu vert sécurité) : le défi anti-robots de l'inscription, du
 * mot de passe oublié et des pages négoce. Le seul script d'un autre site, chargé seulement sur ces pages et seulement
 * quand la clé du site est posée (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) ; sans clé, rien ne s'affiche et rien n'est demandé.
 * Le jeton part dans l'en-tête `x-captcha-response` (`api(…, { captcha })`).
 */
export const CLE_SITE_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const TURNSTILE_ACTIF = CLE_SITE_TURNSTILE.length > 0;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(el: HTMLElement, o: { sitekey: string; language: string; callback: (t: string) => void; "expired-callback": () => void; "error-callback": () => void }): string;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let chargement: Promise<void> | null = null;
function charger(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  chargement ??= new Promise<void>((ok, ko) => {
    // Créé par le code de la page (qui porte le nonce) : la politique de sécurité l'accepte ('strict-dynamic').
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      chargement = null;
      ko(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return chargement;
}

export function Turnstile({ onToken }: { onToken: (jeton: string | null) => void }) {
  const boite = useRef<HTMLDivElement>(null);
  const rappel = useRef(onToken);
  useEffect(() => {
    rappel.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!TURNSTILE_ACTIF) return;
    let id: string | null = null;
    let fini = false;
    charger()
      .then(() => {
        if (fini || !boite.current || !window.turnstile) return;
        id = window.turnstile.render(boite.current, {
          sitekey: CLE_SITE_TURNSTILE,
          language: "fr",
          callback: (t) => rappel.current(t),
          "expired-callback": () => rappel.current(null),
          "error-callback": () => rappel.current(null),
        });
      })
      .catch(() => rappel.current(null));
    return () => {
      fini = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);
  if (!TURNSTILE_ACTIF) return null;
  return <div ref={boite} className="min-h-[65px]" aria-label="Vérification anti-robots" />;
}
