"use client";

import { useEffect, useRef, useState } from "react";
import { messageInvitation, useLienInvitation } from "@/components/inviter";

/**
 * LES MOUVEMENTS DE LA LANDING (Greg, 26 octobre 2026 : « poussés mais sobres »). Sans JavaScript ou sous « réduire les
 * animations », la page est déjà dans son état final : rien n'est caché, rien ne bouge.
 */
const sobre = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Les sections apparaissent au défilement (300 ms, 12 px, sans rebond) et leurs lignes de cote se tracent. Ce qui est déjà à
 * l'écran au chargement est marqué vu avant d'être masqué : rien ne clignote.
 */
export function Apparition() {
  useEffect(() => {
    if (sobre() || !("IntersectionObserver" in window)) return;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-apparait]"));
    for (const e of elements) if (e.getBoundingClientRect().top < window.innerHeight) e.dataset.vu = "";
    document.documentElement.classList.add("mz-mouvement");
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const x of entrees) {
          if (!x.isIntersecting) continue;
          (x.target as HTMLElement).dataset.vu = "";
          obs.unobserve(x.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const e of elements) if (!("vu" in e.dataset)) obs.observe(e);
    return () => {
      obs.disconnect();
      document.documentElement.classList.remove("mz-mouvement");
    };
  }, []);
  return null;
}

/**
 * « 1 → 20 artisans » : le chiffre monte et les vingt cases se remplissent quand la phrase clé arrive à l'écran (1,2 s).
 * Rendu à 20 par le serveur ; il ne repart de 1 que s'il n'est pas encore visible.
 */
export function CompteurVingt() {
  const [n, setN] = useState(20);
  const cadre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cadre.current;
    if (!el || sobre() || !("IntersectionObserver" in window) || el.getBoundingClientRect().top < window.innerHeight) return;
    setN(1);
    let image = 0;
    const obs = new IntersectionObserver(
      ([x]) => {
        if (!x?.isIntersecting) return;
        obs.disconnect();
        const debut = performance.now();
        const pas = (t: number) => {
          const p = Math.min(1, (t - debut) / 1200);
          setN(1 + Math.round(19 * (1 - Math.pow(1 - p, 3))));
          if (p < 1) image = requestAnimationFrame(pas);
        };
        image = requestAnimationFrame(pas);
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(image);
    };
  }, []);
  return (
    <div ref={cadre} className="mz-compteur" role="img" aria-label="De 1 à 20 artisans du secteur">
      <p className="mz-compteur-ligne" aria-hidden="true">
        <span className="mz-titre mz-compteur-n">{n}</span>
        <span className="mz-compteur-u">
          {n === 1 ? "artisan" : "artisans"}
          <br />
          du secteur
        </span>
      </p>
      <span className="mz-cases" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} data-pleine={i < n ? "" : undefined} />
        ))}
      </span>
    </div>
  );
}

/**
 * Le partage de la landing : WhatsApp, SMS, lien copié, avec le message prérempli et la vraie adresse du site, écrite dès le
 * serveur (`origine`) pour qu'un aperçu ou un partage avant le chargement complet ne parte jamais avec un lien vide.
 */
export function PartageVitrine({ origine }: { origine: string }) {
  const lien = useLienInvitation(origine);
  const message = messageInvitation(lien);
  const [copie, setCopie] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }
  return (
    <section aria-label="Fais venir tes collègues" className="mz-partage">
      <p className="mz-partage-message">{message}</p>
      <div className="mz-boutons">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="mz-bouton" data-sombre="">
          Envoyer sur WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className="mz-bouton" data-contour="">
          Envoyer par SMS
        </a>
        <button type="button" onClick={copier} className="mz-bouton" data-contour="">
          {copie ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </section>
  );
}
