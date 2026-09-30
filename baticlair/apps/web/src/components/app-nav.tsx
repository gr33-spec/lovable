"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Truck, UserRound, Warehouse } from "lucide-react";
import { useState } from "react";
import { fr } from "@/lib/fr";
import { AddSheet } from "./add-sheet";

const items = [
  { href: "/", label: fr.nav.home, icon: Home, match: (p: string) => p === "/" },
  { href: "/chantiers", label: fr.nav.projects, icon: Warehouse, match: (p: string) => p.startsWith("/chantiers") },
  { href: "/fournisseurs", label: fr.nav.suppliers, icon: Truck, match: (p: string) => p.startsWith("/fournisseurs") },
  { href: "/compte", label: fr.nav.account, icon: UserRound, match: (p: string) => p.startsWith("/compte") },
];

/**
 * Navigation principale : barre flottante en bas sur téléphone (pouce),
 * colonne à gauche sur ordinateur. Même organisation partout ; le « + »
 * central ouvre toujours la même feuille.
 */
export function AppNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [left, right] = [items.slice(0, 2), items.slice(2)];

  const link = (item: (typeof items)[number]) => {
    const active = item.match(pathname);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-3xl text-[11px] lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-[15px] ${
          active ? "bg-white/12 font-bold text-white" : "font-semibold text-subtle hover:text-white"
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
        className="fixed inset-x-2 bottom-3 z-30 grid grid-cols-[1fr_1fr_64px_1fr_1fr] items-center rounded-[28px] bg-ink p-1 shadow-float lg:inset-x-auto lg:top-4 lg:bottom-4 lg:left-4 lg:flex lg:w-60 lg:flex-col lg:items-stretch lg:gap-1 lg:p-3"
      >
        <span className="hidden px-3 pt-2 pb-4 font-display text-xl font-extrabold text-white lg:block">BatiClair</span>
        {left.map(link)}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Ajouter : nouveau chantier ou fournisseur"
          aria-haspopup="dialog"
          className="flex size-13.5 items-center justify-center justify-self-center rounded-full bg-accent text-white shadow-[0_6px_16px_rgba(255,90,31,0.45)] lg:order-first lg:mb-3 lg:h-13 lg:w-full lg:gap-2 lg:rounded-2xl lg:font-extrabold"
        >
          <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
          <span className="hidden lg:inline">{fr.nav.add}</span>
        </button>
        {right.map(link)}
      </nav>
      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
