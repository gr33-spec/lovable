"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, House, Plus, UserRound, Users, type LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { FeuilleDeuxPortes } from "@/components/achat-groupe";
import { api, type Health } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

/**
 * ACHAT GROUPÉ (Greg, 27 octobre 2026, point 10) : Accueil, Achats groupés, le « + » jaune au centre (les deux portes),
 * Mes listes, Profil. « Mes prix » passe dans Profil. Barre en verre flottante sur téléphone, toujours `position: fixed;
 * bottom: 0` (jamais recalée en JavaScript) ; colonne à gauche sur ordinateur. Avant : Accueil, Chantiers, Regroupements,
 * Mes prix, Profil (25 octobre).
 */
const accueilItem: NavItem = { href: "/", label: fr.nav.home, icon: House, match: (p: string) => p === "/" };
const listesItem: NavItem = {
  href: "/chantiers",
  label: fr.nav.listes,
  icon: ClipboardList,
  match: (p: string) => p.startsWith("/chantiers"),
};
const groupeItem: NavItem = { href: "/achats-groupes", label: fr.nav.groupe, icon: Users, match: (p: string) => p.startsWith("/achats-groupes") || p.startsWith("/regroupements") || p.startsWith("/groupe") };
const profilItem: NavItem = { href: "/compte", label: fr.nav.profil, icon: UserRound, match: (p: string) => p.startsWith("/compte") || p.startsWith("/abonnement") || p.startsWith("/fournisseurs") || p.startsWith("/mes-prix") };

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
  const [portes, setPortes] = useState(false);

  const link = (item: NavItem) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold transition-[color,background-color] duration-150 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-[15px] ${
          active ? "text-accent-text lg:bg-accent-soft" : "text-muted active:text-ink lg:hover:bg-ground"
        }`}
      >
        <span className={`flex h-8 w-11 items-center justify-center rounded-full transition-[background-color] duration-150 lg:h-auto lg:w-auto lg:bg-transparent ${active ? "bg-accent-soft" : ""}`}>
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
      <div className={`mx-2.5 mb-[var(--nav-gap)] grid h-[var(--nav-height)] grid-flow-col items-center ${groupe ? "grid-cols-[1fr_1fr_auto_1fr_1fr]" : "grid-cols-[1fr_auto_1fr_1fr]"} rounded-full bg-glass px-1 shadow-float ring-1 ring-ink/5 lg:mx-0 lg:mb-0 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-3 lg:shadow-card lg:ring-0`}>
        <span className="hidden px-3 pt-2 pb-4 lg:block">
          <Logo hauteur={28} />
        </span>
        {link(accueilItem)}
        {groupe ? link(groupeItem) : null}
        <button type="button" onClick={() => setPortes(true)} aria-label="Nouveau : lancer un achat groupé ou faire ma liste" className="flex min-h-13 items-center justify-center px-1 lg:justify-start lg:px-0">
          <span className="pressable flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-float lg:h-12 lg:w-full lg:gap-2 lg:rounded-xl lg:text-[15px] lg:font-bold">
            <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
            <span className="hidden lg:inline">Nouveau</span>
          </span>
        </button>
        {link(listesItem)}
        {link(profilItem)}
      </div>
      {portes ? <FeuilleDeuxPortes onFermer={() => setPortes(false)} /> : null}
    </nav>
  );
}
