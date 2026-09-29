"use client";

import { ExternalLink, Home, LayoutGrid, LogOut, MoreHorizontal, Package, Palette, Settings, ShoppingBag, Tags, Truck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { logoutAction } from "@/app/admin/auth-actions";

const ITEMS = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", icon: Home },
  { href: "/admin/produits", label: "Produits", short: "Produits", icon: Package },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes", icon: ShoppingBag },
  { href: "/admin/categories", label: "Catégories", short: "Catégories", icon: Tags },
  { href: "/admin/apparence", label: "Apparence", short: "Apparence", icon: Palette },
  { href: "/admin/livraison", label: "Livraison", short: "Livraison", icon: Truck },
  { href: "/admin/parametres", label: "Paramètres", short: "Paramètres", icon: Settings },
];

export function AdminNav({ shopName, toPrepare, adminName }: { shopName: string; toPrepare: number; adminName: string }) {
  const pathname = usePathname();
  const more = useRef<HTMLDialogElement>(null);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  useEffect(() => more.current?.close(), [pathname]);
  const badge = (href: string) =>
    href === "/admin/commandes" && toPrepare > 0 ? (
      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary" aria-label={`${toPrepare} à préparer`}>
        {toPrepare}
      </span>
    ) : null;

  return (
    <>
      {/* Ordinateur : colonne latérale */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-6 pt-7 pb-6">
          <p className="font-serif text-2xl leading-tight">{shopName}</p>
          <p className="mt-1 text-xs text-text-2">Administration</p>
        </div>
        <nav aria-label="Administration" className="flex-1 px-3">
          <ul className="space-y-1">
            {ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active(href) ? "page" : undefined}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium no-underline transition hover:bg-secondary aria-[current=page]:bg-primary-light aria-[current=page]:text-primary"
                >
                  <Icon size={19} aria-hidden="true" /> {label} {badge(href)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <a href="/" target="_blank" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm no-underline hover:bg-secondary">
            <ExternalLink size={17} aria-hidden="true" /> Voir la boutique
          </a>
          <form action={logoutAction}>
            <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-secondary">
              <LogOut size={17} aria-hidden="true" /> Se déconnecter
            </button>
          </form>
          <p className="truncate px-3 pt-1 text-xs text-text-2">{adminName}</p>
        </div>
      </aside>

      {/* Téléphone : barre du bas, comme une application */}
      <nav aria-label="Administration" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-4">
          {ITEMS.slice(0, 3).map(({ href, short, icon: Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={active(href) ? "page" : undefined} className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-2 no-underline aria-[current=page]:text-primary">
                <Icon size={22} aria-hidden="true" />
                {short}
                {href === "/admin/commandes" && toPrepare > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 rounded-full bg-primary px-1.5 text-[10px] font-bold text-on-primary">{toPrepare}</span>
                )}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => more.current?.showModal()}
              aria-current={ITEMS.slice(3).some((i) => active(i.href)) ? "page" : undefined}
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-2 aria-[current=page]:text-primary"
            >
              <MoreHorizontal size={22} aria-hidden="true" /> Plus
            </button>
          </li>
        </ul>
      </nav>
      <dialog
        ref={more}
        aria-label="Plus"
        className="mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-surface p-0 text-text"
        onClick={(e) => e.target === more.current && more.current?.close()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <p className="font-serif text-xl">{shopName}</p>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Fermer" onClick={() => more.current?.close()}>
            <X size={20} />
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {ITEMS.slice(3).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="card flex min-h-20 flex-col items-center justify-center gap-2 text-sm font-medium no-underline">
                <Icon size={22} className="text-primary" aria-hidden="true" /> {label}
              </Link>
            </li>
          ))}
          <li>
            <a href="/" target="_blank" className="card flex min-h-20 flex-col items-center justify-center gap-2 text-sm font-medium no-underline">
              <LayoutGrid size={22} className="text-primary" aria-hidden="true" /> Voir la boutique
            </a>
          </li>
          <li>
            <form action={logoutAction}>
              <button type="submit" className="card flex min-h-20 w-full flex-col items-center justify-center gap-2 text-sm font-medium">
                <LogOut size={22} className="text-primary" aria-hidden="true" /> Se déconnecter
              </button>
            </form>
          </li>
        </ul>
      </dialog>
    </>
  );
}
