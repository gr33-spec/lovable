"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { NOM_APP } from "@/lib/nom";

/**
 * « INVITER UN COLLÈGUE » (Greg, 22 octobre : « L'union fait la force : fais venir tes collègues »). Le même bloc sur la
 * page publique, sur l'accueil après l'inscription et sur l'écran Regroupement : WhatsApp, SMS et copier le lien, avec
 * le message prérempli. Rien ne part tout seul : chaque bouton ouvre l'appli du téléphone, l'artisan choisit à qui.
 */
export const messageInvitation = (lien: string) =>
  `Je me suis inscrit sur ${NOM_APP}, on regroupe nos commandes de matériaux pour payer moins cher. Plus on est nombreux, plus on négocie. Rejoins-nous : ${lien}`;

const bouton = "pressable inline-flex min-h-12 items-center justify-center rounded-full px-5 text-[15px] font-semibold";

/**
 * Le lien à partager : l'adresse du site lue dans le navigateur ; côté serveur, celle de la requête quand la page la donne
 * (`origine`). Avant (26 octobre 2026), le serveur écrivait « Rejoins-nous : / » dans la page.
 */
export function useLienInvitation(origine?: string): string {
  return useSyncExternalStore(
    () => () => undefined,
    () => `${window.location.origin}/`,
    () => (origine ? `${origine}/` : ""),
  );
}

export function InviterCollegue({ titre = "Inviter un collègue", texte, grand = false }: { titre?: string; texte?: string; grand?: boolean }) {
  const lien = useLienInvitation();
  const [copie, setCopie] = useState(false);
  const message = messageInvitation(lien);

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
    <section aria-label={titre} className={grand ? "flex flex-col gap-8 rounded-2xl bg-night-2 p-6 text-white ring-1 ring-white/10 sm:p-12 lg:p-16" : "flex flex-col gap-4 rounded-xl border border-line bg-surface p-4"}>
      <div className="flex flex-col gap-2">
        <h2 className={grand ? "font-display max-w-[20ch] text-[40px] leading-[0.98] font-extrabold tracking-[-0.03em] sm:text-[64px]" : "text-[18px] font-extrabold tracking-[-0.01em]"}>{titre}</h2>
        {texte ? <p className={grand ? "max-w-[48ch] text-[18px] leading-relaxed text-white/75" : "text-[14px] leading-relaxed text-muted"}>{texte}</p> : null}
      </div>
      <p className={grand ? "max-w-[64ch] rounded-xl bg-white/10 px-4 py-3 text-[15px] leading-relaxed text-white/90" : "rounded-xl bg-ground px-4 py-3 text-[14px] leading-relaxed"}>{message}</p>
      <div className="flex flex-wrap gap-3">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={`${bouton} bg-accent text-on-accent hover:bg-accent-hover`}>
          Envoyer sur WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={`${bouton} ${grand ? "border border-white/40 text-white hover:border-white" : "border border-line bg-surface text-ink hover:border-ink"}`}>
          Envoyer par SMS
        </a>
        <button type="button" onClick={copier} className={`${bouton} ${grand ? "border border-white/40 text-white hover:border-white" : "border border-line bg-surface text-ink hover:border-ink"}`}>
          {copie ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </section>
  );
}

/**
 * Le compteur de la page publique : « X couvreurs déjà inscrits dans les Côtes-d'Armor », le vrai chiffre de la base
 * (`GET /v1/public/compteur`), rien sous 10 (l'API rend alors `null`). `surAccent` : posé sur le bloc jaune de la landing.
 */
export function CompteurInscrits({ surAccent = false }: { surAccent?: boolean }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch("/v1/public/compteur", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { artisans: number | null } | null) => {
        if (vivant && b && typeof b.artisans === "number") setN(b.artisans);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  if (n === null) return null;
  return (
    <p role="status" aria-label={`${n} artisans déjà inscrits dans les Côtes-d'Armor`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display text-[88px] leading-none font-extrabold tracking-[-0.04em] text-ink tabular-nums sm:text-[128px]">{n.toLocaleString("fr-FR")}</span>
      <span className={`text-[18px] font-semibold ${surAccent ? "text-ink/70" : "text-muted"}`}>artisans déjà inscrits dans les Côtes-d&apos;Armor</span>
    </p>
  );
}
