"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Truck, UserRound, Users, Warehouse } from "lucide-react";
import { useCallback } from "react";
import { api, type Health } from "@/lib/api";
import { fr } from "@/lib/fr";
import { useTyping } from "@/lib/typing";
import { useResource } from "@/lib/use-resource";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  match: (p: string) => boolean;
}

const items: NavItem[] = [
  { href: "/", label: fr.nav.home, icon: Home, match: (p: string) => p === "/" },
  { href: "/chantiers", label: fr.nav.projects, icon: Warehouse, match: (p: string) => p.startsWith("/chantiers") },
  { href: "/fournisseurs", label: fr.nav.suppliers, icon: Truck, match: (p: string) => p.startsWith("/fournisseurs") },
  { href: "/compte", label: fr.nav.account, icon: UserRound, match: (p: string) => p.startsWith("/compte") },
];
/** BatiClair Groupé (demande du fondateur, 2026-10-20) : un onglet visible dès que le drapeau est allumé, même sans SIRET ni devis. */
const groupeItem: NavItem = { href: "/groupe", label: fr.nav.groupe, icon: Users, match: (p: string) => p.startsWith("/groupe") };

/** Le drapeau `groupe` de l'API (route de santé, publique) : éteint, l'onglet n'existe pas. */
export function useGroupeActif(): boolean {
  const fetchHealth = useCallback((signal: AbortSignal) => api<Health>("/v1/health", { signal }), []);
  const { data } = useResource(fetchHealth);
  return data?.features.groupe === true;
}

/**
 * Navigation principale : barre flottante en bas sur téléphone (pouce),
 * colonne à gauche sur ordinateur. Le « + » central crée un chantier, le
 * cœur de BatiClair : un appui, aucune question.
 */
export function AppNav() {
  const pathname = usePathname();
  const groupe = useGroupeActif();
  const [left, right] = [groupe ? [items[0]!, items[1]!, groupeItem] : items.slice(0, 2), items.slice(2)];
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
        <span>{item.label}</span>
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
        <div className={`pointer-events-auto grid h-(--nav-height) ${groupe ? "grid-cols-[1fr_1fr_1fr_56px_1fr_1fr]" : "grid-cols-[1fr_1fr_64px_1fr_1fr]"} items-center rounded-[28px] border border-white/70 bg-surface/95 p-1 shadow-[0_12px_32px_-8px_rgba(20,24,60,0.25)] backdrop-blur-xl lg:flex lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:p-3`}>
        <span className="hidden px-3 pt-2 pb-4 font-display text-xl font-extrabold text-ink lg:block">BatiClair</span>
        {left.map(link)}
        <Link
          href="/chantiers/nouveau"
          aria-label="Nouveau chantier"
          className={`flex ${groupe ? "size-12" : "size-13.5"} items-center justify-center justify-self-center rounded-full bg-cta text-white shadow-cta ring-4 ring-white lg:order-first lg:mb-3 lg:h-13 lg:w-full lg:gap-2 lg:rounded-2xl lg:font-extrabold`}
        >
          <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
          <span className="hidden lg:inline">Nouveau chantier</span>
        </Link>
        {right.map(link)}
        </div>
      </nav>
    </>
  );
}
