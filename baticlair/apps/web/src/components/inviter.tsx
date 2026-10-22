"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * « INVITER UN COLLÈGUE » (Greg, 22 octobre : « L'union fait la force : fais venir tes collègues »). Le même bloc sur la
 * page publique, sur l'accueil après l'inscription et sur l'écran Commande commune : WhatsApp, SMS et copier le lien, avec
 * le message prérempli. Rien ne part tout seul : chaque bouton ouvre l'appli du téléphone, l'artisan choisit à qui.
 */
export const messageInvitation = (lien: string) =>
  `Je me suis inscrit sur BatiClair, on regroupe nos commandes de matériaux pour payer moins cher. Plus on est nombreux, plus on négocie. Rejoins-nous : ${lien}`;

const bouton = "inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-[15px] font-bold transition";

export function InviterCollegue({ titre = "Inviter un collègue", texte, grand = false }: { titre?: string; texte?: string; grand?: boolean }) {
  // L'adresse du site se lit dans le navigateur (production, prévisualisation ou local) ; avant, un lien relatif.
  const lien = useSyncExternalStore(
    () => () => undefined,
    () => `${window.location.origin}/`,
    () => "/",
  );
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
    <section aria-label={titre} className={`flex flex-col gap-4 rounded-2xl border border-[#e3e6ea] bg-surface ${grand ? "p-6 sm:p-10" : "p-4"}`}>
      <div className="flex flex-col gap-2">
        <h2 className={grand ? "font-display text-[30px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[40px]" : "text-[17px] font-extrabold"}>{titre}</h2>
        {texte ? <p className={`${grand ? "text-[17px]" : "text-[14px]"} leading-relaxed text-muted`}>{texte}</p> : null}
      </div>
      <p className="rounded-xl bg-ground px-4 py-3 text-[14px] leading-relaxed">{message}</p>
      <div className="flex flex-wrap gap-2.5">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={`${bouton} bg-accent text-white hover:bg-accent-text`}>
          Envoyer sur WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={`${bouton} border border-[#d9dde3] bg-surface text-ink hover:border-ink`}>
          Envoyer par SMS
        </a>
        <button type="button" onClick={copier} className={`${bouton} border border-[#d9dde3] bg-surface text-ink hover:border-ink`}>
          {copie ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
    </section>
  );
}

/**
 * Le compteur de la page publique : « X couvreurs déjà inscrits dans les Côtes-d'Armor », le vrai chiffre de la base
 * (`GET /v1/public/compteur`), rien sous 10 (l'API rend alors `null`).
 */
export function CompteurInscrits() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let vivant = true;
    fetch("/v1/public/compteur", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { couvreurs: number | null } | null) => {
        if (vivant && b && typeof b.couvreurs === "number") setN(b.couvreurs);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  if (n === null) return null;
  return (
    <p role="status" aria-label={`${n} couvreurs déjà inscrits dans les Côtes-d'Armor`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display text-[56px] leading-none font-bold tracking-[-0.04em] text-accent-text tabular-nums sm:text-[72px]">{n.toLocaleString("fr-FR")}</span>
      <span className="text-[18px] font-semibold">couvreurs déjà inscrits dans les Côtes-d&apos;Armor</span>
    </p>
  );
}
