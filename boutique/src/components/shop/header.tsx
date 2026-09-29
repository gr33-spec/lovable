"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ImageRef } from "@/lib/image-ref";
import { imageSrc } from "@/lib/image-ref";
import { useCartCount } from "./cart-store";

interface NavCategory {
  slug: string;
  name: string;
}

function Brand({ name, logo }: { name: string; logo: ImageRef | null }) {
  // Logo horizontal (nom dessiné) : affiché seul, en grand. Logo rond ou carré : à côté du nom.
  const wide = logo ? logo.w / logo.h >= 1.6 : false;
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 no-underline" aria-label={`${name} — accueil`}>
      {logo &&
        (wide ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(logo, 640)} alt={name} height={44} className="h-9 w-auto max-w-[200px] object-contain sm:h-11 sm:max-w-[260px]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(logo, 320)} alt="" width={48} height={48} className="h-10 w-10 shrink-0 rounded-full object-cover shadow-soft ring-1 ring-border sm:h-12 sm:w-12" />
        ))}
      {!wide && <span className="truncate font-serif text-[1.2rem] leading-none font-semibold tracking-tight min-[400px]:text-[1.35rem] sm:text-2xl">{name}</span>}
    </Link>
  );
}

export function Header({ shopName, logo, categories }: { shopName: string; logo: ImageRef | null; categories: NavCategory[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const count = useCartCount();
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [bump, setBump] = useState(false);
  const previous = useRef(count);

  // Petite animation du panier quand un article est ajouté.
  useEffect(() => {
    if (count > previous.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      previous.current = count;
      return () => clearTimeout(t);
    }
    previous.current = count;
  }, [count]);

  useEffect(() => {
    menuRef.current?.close();
    searchRef.current?.close();
  }, [pathname]);

  const links = [
    { href: "/boutique", label: "Toutes les créations" },
    ...categories.map((c) => ({ href: `/boutique/${c.slug}`, label: c.name })),
    { href: "/boutique?tri=nouveautes", label: "Nouveautés" },
    { href: "/a-propos", label: "L'atelier" },
  ];
  const isActive = (href: string) => (href === "/boutique" ? pathname === "/boutique" : pathname === href.split("?")[0] && !href.includes("?"));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    searchRef.current?.close();
    router.push(value ? `/boutique?q=${encodeURIComponent(value)}` : "/boutique");
  };

  return (
    <>
      <a href="#contenu" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Aller au contenu
      </a>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/85 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
        <div className="container-page flex h-[var(--header-h)] items-center gap-2">
          <button type="button" className="btn btn-ghost btn-icon -ml-2 lg:hidden" aria-label="Ouvrir le menu" onClick={() => menuRef.current?.showModal()}>
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1 lg:flex-none">
            <Brand name={shopName} logo={logo} />
          </div>
          <nav aria-label="Navigation principale" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className="rounded-full px-3.5 py-2 text-[15px] font-medium no-underline transition-colors hover:bg-secondary aria-[current=page]:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center">
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Rechercher" onClick={() => searchRef.current?.showModal()}>
              <Search size={21} />
            </button>
            <Link href="/panier" className="btn btn-ghost btn-icon relative -mr-2" aria-label={count ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}>
              <ShoppingBag size={22} className={bump ? "animate-[rise_0.4s_ease]" : ""} />
              {count > 0 && (
                <span className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Menu mobile : panneau latéral (fermeture : bouton, touche Échap, clic à l'extérieur). */}
      <dialog
        ref={menuRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[min(86vw,360px)] max-w-none bg-surface p-0 text-text shadow-lift backdrop:bg-black/40 open:animate-[rise_0.25s_ease]"
        onClick={(e) => e.target === menuRef.current && menuRef.current?.close()}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[var(--header-h)] items-center justify-between border-b border-border px-4">
            <Brand name={shopName} logo={logo} />
            <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fermer le menu" onClick={() => menuRef.current?.close()}>
              <X size={22} />
            </button>
          </div>
          <nav aria-label="Menu mobile" className="flex-1 overflow-y-auto px-2 py-3">
            <ul>
              {[{ href: "/", label: "Accueil" }, ...links, { href: "/contact", label: "Contact" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-[52px] items-center rounded-xl px-4 font-serif text-[1.35rem] no-underline hover:bg-secondary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border p-4">
            <Link href="/panier" className="btn btn-primary w-full">
              <ShoppingBag size={18} /> Voir le panier{count ? ` (${count})` : ""}
            </Link>
          </div>
        </div>
      </dialog>

      <dialog
        ref={searchRef}
        aria-label="Rechercher"
        className="mx-auto mt-[12vh] w-[min(92vw,560px)] rounded-2xl bg-surface p-0 text-text shadow-lift"
        onClick={(e) => e.target === searchRef.current && searchRef.current?.close()}
      >
        <form role="search" onSubmit={submitSearch} className="flex items-center gap-2 p-3">
          <Search size={20} className="ml-2 shrink-0 text-text-2" aria-hidden="true" />
          <label htmlFor="header-search" className="sr-only">
            Rechercher une création
          </label>
          <input
            id="header-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Fleurs, doré, pendentif…"
            className="min-h-12 flex-1 bg-transparent px-2 outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={80}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Chercher
          </button>
        </form>
      </dialog>
    </>
  );
}
