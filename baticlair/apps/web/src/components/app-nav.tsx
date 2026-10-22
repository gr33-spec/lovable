"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Users, Warehouse, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { api, type Health } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

/**
 * Simplification (21 octobre, demande du fondateur) : TROIS entrées seulement, une icône et un mot chacune.
 * « Mes chantiers » (l'accueil), au centre le gros bouton « + Nouvelle liste » (nouveau cap, 22 octobre ; avant « + Nouveau devis »), « Groupé ». Fournisseurs et Compte
 * vivent dans le menu derrière l'initiale de l'artisan, en haut à droite (`MenuArtisan`).
 */
const chantiersItem: NavItem = {
  href: "/",
  label: fr.nav.projects,
  icon: Warehouse,
  match: (p: string) => p === "/" || (p.startsWith("/chantiers") && p !== "/chantiers/nouveau"),
};
const groupeItem: NavItem = { href: "/groupe", label: fr.nav.groupe, icon: Users, match: (p: string) => p.startsWith("/groupe") };

/** Le drapeau `groupe` de l'API (route de santé, publique) : éteint, l'onglet n'existe pas. */
export function useGroupeActif(): boolean {
  const fetchHealth = useCallback((signal: AbortSignal) => api<Health>("/v1/health", { signal }), []);
  const { data } = useResource(fetchHealth);
  return data?.features.groupe === true;
}

/**
 * Navigation principale : barre flottante en bas sur téléphone (pouce),
 * colonne à gauche sur ordinateur. Le gros bouton central ouvre un nouveau devis :
 * un appui, aucune question.
 */
export function AppNav() {
  const pathname = usePathname();
  const groupe = useGroupeActif();
  // Le chat d'un chantier se lit en plein écran sur téléphone (référentiel §21) : le menu laisse la place à la barre de message.
  const inChat = /^\/chantiers\/(?!nouveau$)[^/]+$/.test(pathname);
  // La barre se cache pendant la saisie (`useTyping`). Elle n'est JAMAIS recalée en JavaScript (retour du fondateur,
  // 2026-10-12 : sur iPhone, l'ancien recalage sur visualViewport la plaçait au milieu de l'accueil) : `position: fixed;
  // bottom: 0`, la zone du geste en marge intérieure.
  const typing = useTyping();

  const link = (item: NavItem) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-3xl text-[11px] lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-[15px] ${
          active ? "bg-nav-active font-bold text-white shadow-[0_6px_16px_-6px_rgba(91,69,255,0.7)]" : "font-semibold text-muted hover:text-ink"
        }`}
      >
        <Icon size={21} aria-hidden="true" />
        <span className="text-center leading-tight">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Téléphone : figée en bas de l'écran (bottom: 0), la zone du geste de l'iPhone en marge intérieure ; ordinateur : colonne à gauche. */}
      <nav
        aria-label="Navigation principale"
        data-typing={typing || undefined}
        className={`${inChat ? "max-lg:hidden " : ""}${typing ? "max-lg:pointer-events-none max-lg:translate-y-full max-lg:opacity-0 " : ""}pointer-events-none fixed z-30 transition-[translate,opacity] duration-200 max-lg:inset-x-0 max-lg:bottom-0 max-lg:px-2 max-lg:pb-[max(12px,env(safe-area-inset-bottom))] lg:top-4 lg:bottom-4 lg:left-4 lg:w-60`}
      >
        <div className="pointer-events-auto grid h-(--nav-height) grid-cols-[1fr_auto_1fr] items-center rounded-[28px] border border-white/70 bg-surface/95 p-1 shadow-[0_12px_32px_-8px_rgba(20,24,60,0.25)] backdrop-blur-xl lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:p-3">
        <span className="hidden px-3 pt-2 pb-4 font-display text-xl font-extrabold text-ink lg:block">BatiClair</span>
        {link(chantiersItem)}
        <Link
          href="/chantiers/nouveau"
          className="flex min-h-13 items-center justify-center gap-1.5 justify-self-center rounded-full bg-cta px-4 text-[14px] font-extrabold text-white shadow-cta ring-4 ring-white lg:order-first lg:mb-3 lg:w-full lg:rounded-2xl lg:text-[15px]"
        >
          <Plus size={22} strokeWidth={2.8} aria-hidden="true" />
          <span>Nouvelle liste</span>
        </Link>
        {groupe ? link(groupeItem) : <span aria-hidden="true" />}
        </div>
      </nav>
    </>
  );
}
