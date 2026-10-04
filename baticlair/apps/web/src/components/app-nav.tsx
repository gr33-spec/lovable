"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Truck, UserRound, Warehouse } from "lucide-react";
import { fr } from "@/lib/fr";

const items = [
  { href: "/", label: fr.nav.home, icon: Home, match: (p: string) => p === "/" },
  { href: "/chantiers", label: fr.nav.projects, icon: Warehouse, match: (p: string) => p.startsWith("/chantiers") },
  { href: "/fournisseurs", label: fr.nav.suppliers, icon: Truck, match: (p: string) => p.startsWith("/fournisseurs") },
  { href: "/compte", label: fr.nav.account, icon: UserRound, match: (p: string) => p.startsWith("/compte") },
];

/**
 * Navigation principale : barre flottante en bas sur téléphone (pouce),
 * colonne à gauche sur ordinateur. Le « + » central crée un chantier, le
 * cœur de BatiClair : un appui, aucune question.
 */
export function AppNav() {
  const pathname = usePathname();
  const [left, right] = [items.slice(0, 2), items.slice(2)];
  // Le chat d'un chantier se lit en plein écran sur téléphone (référentiel §21) : le menu laisse la place à la barre de message.
  const inChat = /^\/chantiers\/(?!nouveau$)[^/]+$/.test(pathname);

  const link = (item: (typeof items)[number]) => {
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
      <nav
        aria-label="Navigation principale"
        className={`${inChat ? "max-lg:hidden " : ""}fixed inset-x-2 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 grid grid-cols-[1fr_1fr_64px_1fr_1fr] items-center rounded-[28px] border border-white/70 bg-surface/95 p-1 shadow-[0_12px_32px_-8px_rgba(20,24,60,0.25)] backdrop-blur-xl lg:inset-x-auto lg:top-4 lg:bottom-4 lg:left-4 lg:flex lg:w-60 lg:flex-col lg:items-stretch lg:gap-1 lg:p-3`}
      >
        <span className="hidden px-3 pt-2 pb-4 font-display text-xl font-extrabold text-ink lg:block">BatiClair</span>
        {left.map(link)}
        <Link
          href="/chantiers/nouveau"
          aria-label="Nouveau chantier"
          className="flex size-13.5 items-center justify-center justify-self-center rounded-full bg-cta text-white shadow-cta ring-4 ring-white lg:order-first lg:mb-3 lg:h-13 lg:w-full lg:gap-2 lg:rounded-2xl lg:font-extrabold"
        >
          <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
          <span className="hidden lg:inline">Nouveau chantier</span>
        </Link>
        {right.map(link)}
      </nav>
    </>
  );
}
