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
 * « Mes chantiers » (l'accueil), au centre le rond « + Nouvelle liste » (nouveau cap, 22 octobre), « Commande commune ».
 * Fournisseurs et Compte vivent dans le menu derrière l'initiale de l'artisan, en haut à droite (`MenuArtisan`).
 * Passe UI/UX (23 octobre) : trois entrées égales, l'active en accent, le rond accent au centre. Retour de Greg le soir
 * (« tendance et moderne ») : la barre redevient une capsule flottante, en verre translucide (flou derrière), posée à
 * 12 px du bas ; l'icône active sur une pastille d'accent pâle. Toujours `position: fixed; bottom: 0` sur le conteneur
 * (jamais recalée en JavaScript) : la marge est à l'intérieur.
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
 * Navigation principale : barre figée en bas sur téléphone (pouce), colonne à gauche sur ordinateur. Le rond central
 * ouvre une nouvelle liste : un appui, aucune question.
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
        className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-[color,background-color] duration-150 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px] ${
          active ? "text-accent-text lg:bg-accent-soft" : "text-muted active:text-ink lg:hover:bg-ground"
        }`}
      >
        <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-[background-color] duration-150 lg:h-auto lg:w-auto lg:bg-transparent ${active ? "bg-accent-soft" : ""}`}>
          <Icon size={22} aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="text-center leading-tight whitespace-nowrap">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      data-typing={typing || undefined}
      className={`${inChat ? "max-lg:hidden " : ""}${typing ? "max-lg:pointer-events-none max-lg:translate-y-full max-lg:opacity-0 " : ""}fixed z-30 transition-[translate,opacity] duration-200 max-lg:inset-x-0 max-lg:bottom-0 lg:top-4 lg:bottom-4 lg:left-4 lg:w-60`}
    >
      {/* Téléphone : une capsule en verre, à 16 px des bords et 12 px du bas (zone du geste comprise) ; ordinateur : colonne à gauche. */}
      <div className="mx-2.5 mb-[var(--nav-gap)] grid h-[var(--nav-height)] grid-cols-3 items-center rounded-full bg-glass px-1 shadow-float ring-1 ring-ink/5 lg:mx-0 lg:mb-0 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-3 lg:shadow-card lg:ring-0">
        <span className="hidden px-3 pt-2 pb-4 text-[20px] font-extrabold tracking-[-0.02em] text-ink lg:block">BatiClair</span>
        {link(chantiersItem)}
        <Link
          href="/chantiers/nouveau"
          className="pressable flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-accent-text lg:order-first lg:mb-3 lg:min-h-13 lg:flex-row lg:gap-2 lg:rounded-full lg:bg-accent lg:text-[16px] lg:text-white"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_6px_16px_rgba(13,15,20,0.25)] lg:size-auto lg:bg-transparent lg:shadow-none" aria-hidden="true">
            <Plus size={24} strokeWidth={2.6} />
          </span>
          <span className="leading-tight">Nouvelle liste</span>
        </Link>
        {groupe ? link(groupeItem) : <span aria-hidden="true" />}
      </div>
    </nav>
  );
}
