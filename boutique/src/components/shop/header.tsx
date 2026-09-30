"use client";

import { ChevronRight, Home, Mail, Menu, Search, ShoppingBag, Sparkles, Store, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ImageRef } from "@/lib/image-ref";
import { imageSrc } from "@/lib/image-ref";
import type { ShopSettings } from "@/lib/server/settings";
import { Img } from "../ui/img";
import { plainText } from "../ui/sparkle";
import { RESERVATION_MODE } from "@/lib/sales-mode";
import { useCartCount } from "./cart-store";
import { SocialLinks } from "./footer";

interface NavCategory {
  slug: string;
  name: string;
  cover: ImageRef | null;
}

function Brand({ name, logo, center = false }: { name: string; logo: ImageRef | null; center?: boolean }) {
  // Logo horizontal (nom dessiné) : affiché seul. Logo rond : sur téléphone, le
  // logo seul (le nom y est écrit) ; sur ordinateur, le logo et le nom.
  const wide = logo ? logo.w / logo.h >= 1.6 : false;
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 no-underline" aria-label={`${name} — accueil`}>
      {logo &&
        (wide ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(logo, 640)} alt={name} height={44} className="h-10 w-auto max-w-[190px] object-contain sm:h-11 sm:max-w-[260px]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(logo, 320)} alt="" width={52} height={52} className="h-12 w-12 shrink-0 rounded-full object-cover shadow-soft ring-1 ring-border lg:h-11 lg:w-11" />
        ))}
      {!wide && (
        <span className={`truncate font-serif leading-none tracking-[-0.01em] ${logo && center ? "hidden lg:inline lg:text-[1.6rem]" : "text-[1.25rem] min-[400px]:text-[1.4rem] sm:text-[1.6rem]"}`}>{name}</span>
      )}
    </Link>
  );
}

export function Header({
  shopName,
  logo,
  tagline = "",
  socials = [],
  categories,
}: {
  shopName: string;
  logo: ImageRef | null;
  tagline?: string;
  socials?: ShopSettings["socials"];
  categories: NavCategory[];
}) {
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

  // Accueil sur téléphone : le logo de l'en-tête reste discret tant que le grand logo est visible.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const hideBrand = pathname === "/" && Boolean(logo) && !scrolled;

  const links = [
    { href: "/boutique", label: "Toutes les créations" },
    ...categories.map((c) => ({ href: `/boutique/${c.slug}`, label: c.name })),
    { href: "/boutique?tri=nouveautes", label: "Nouveautés" },
    { href: "/a-propos", label: "L'atelier" },
  ];
  // Au-delà de 3 catégories, la barre du haut (ordinateur) n'affiche que les
  // 3 premières ; toutes restent dans le menu, dont le bouton reste visible.
  const MAX_TOP = 3;
  const many = categories.length > MAX_TOP;
  const topLinks = many ? links.filter((l) => !categories.slice(MAX_TOP).some((c) => l.href === `/boutique/${c.slug}`)) : links;
  // Une famille reste « active » dans ses sous-catégories (/boutique/pampilles/coeurs → Pampilles).
  const isActive = (href: string) =>
    href === "/boutique" ? pathname === "/boutique" : !href.includes("?") && (pathname === href || (href.startsWith("/boutique/") && pathname.startsWith(`${href}/`)));

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
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/90 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/75">
        <div className="container-page relative flex h-[var(--header-h)] items-center gap-2">
          <button type="button" className={`btn btn-ghost btn-icon -ml-2 ${many ? "" : "lg:hidden"}`} aria-label="Ouvrir le menu" onClick={() => menuRef.current?.showModal()}>
            <Menu size={22} strokeWidth={1.6} />
          </button>
          {/* Logo : centré sur téléphone. Sur l'accueil, il apparaît quand le grand logo du haut a défilé. */}
          <div
            className={`absolute left-1/2 min-w-0 -translate-x-1/2 transition-all duration-500 lg:static lg:flex-none lg:translate-x-0 lg:opacity-100 ${hideBrand ? "pointer-events-none -translate-y-1 opacity-0 lg:pointer-events-auto lg:translate-y-0" : "opacity-100"}`}
            aria-hidden={hideBrand || undefined}
          >
            <Brand name={shopName} logo={logo} center />
          </div>
          <nav aria-label="Navigation principale" className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-2">
              {topLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className="relative px-3 py-2 text-[14px] font-medium tracking-[0.02em] whitespace-nowrap no-underline transition-colors duration-300 after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100 aria-[current=page]:text-primary aria-[current=page]:after:scale-x-100"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center lg:ml-0">
            <button type="button" className={`btn btn-ghost btn-icon ${RESERVATION_MODE ? "-mr-2" : ""}`} aria-label="Rechercher" onClick={() => searchRef.current?.showModal()}>
              <Search size={20} strokeWidth={1.6} />
            </button>
            {!RESERVATION_MODE && (
              <Link href="/panier" className="btn btn-ghost btn-icon relative -mr-2" aria-label={count ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}>
                <ShoppingBag size={21} strokeWidth={1.6} className={bump ? "animate-[rise_0.4s_ease]" : ""} />
                {count > 0 && (
                  <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary ring-2 ring-surface">
                    {count}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Menu mobile : panneau latéral (fermeture : bouton, touche Échap, clic à l'extérieur). */}
      <dialog
        ref={menuRef}
        aria-label="Menu"
        className="menu-panel m-0 h-dvh max-h-none w-[min(88vw,380px)] max-w-none overflow-hidden rounded-r-[28px] bg-surface p-0 text-text shadow-lift"
        onClick={(e) => e.target === menuRef.current && menuRef.current?.close()}
      >
        <div className="relative flex h-full flex-col">
          <div className="soft-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="glitter-dust pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

          {/* En-tête : le logo en vedette. Le focus va d'abord sur « Fermer ». */}
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex justify-end">
              <button type="button" autoFocus className="btn btn-ghost btn-icon -mr-2 focus-visible:outline-2" aria-label="Fermer le menu" onClick={() => menuRef.current?.close()}>
                <X size={22} strokeWidth={1.6} />
              </button>
            </div>
            <Link href="/" className="-mt-4 flex flex-col items-center gap-3 text-center no-underline outline-none">
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc(logo, 320)}
                  alt=""
                  className={logo.w / logo.h >= 1.6 ? "h-14 w-auto max-w-[240px] object-contain" : "holo-ring h-20 w-20 rounded-full object-cover shadow-soft ring-4 ring-surface"}
                />
              )}
              <span className="font-serif text-[1.75rem] leading-none tracking-[-0.01em]">{shopName}</span>
            </Link>
            {tagline && <p className="mx-auto mt-2 max-w-[260px] text-center text-[13px] text-text-2">{plainText(tagline)}</p>}
          </div>

          <nav aria-label="Menu mobile" className="relative flex-1 overflow-y-auto px-4 pb-4">
            {/* Mise en avant : tout le catalogue */}
            <Link
              href="/boutique"
              style={{ "--i": 0 } as React.CSSProperties}
              className="menu-item holo-shine group flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-on-primary no-underline shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
                <Sparkles size={19} strokeWidth={1.6} />
              </span>
              <span className="flex-1">
                <span className="block font-serif text-[1.3rem] leading-tight">Toutes les créations</span>
                <span className="block text-[12px] opacity-80">Tout le catalogue de l&apos;atelier</span>
              </span>
              <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>

            {categories.length > 0 && (
              <>
                <p className="eyebrow menu-item mt-6 mb-2 px-1" style={{ "--i": 1 } as React.CSSProperties}>
                  Collections
                </p>
                <ul className="space-y-1">
                  {categories.map((c, i) => (
                    <li key={c.slug} className="menu-item" style={{ "--i": i + 2 } as React.CSSProperties}>
                      <Link
                        href={`/boutique/${c.slug}`}
                        aria-current={isActive(`/boutique/${c.slug}`) ? "page" : undefined}
                        className="group flex items-center gap-3 rounded-2xl px-2 py-2 no-underline transition-colors hover:bg-surface-2 aria-[current=page]:bg-primary-soft"
                      >
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
                          <Img image={c.cover} alt="" sizes="48px" className="h-full w-full" />
                        </span>
                        <span className="flex-1 font-serif text-[1.3rem] leading-tight">{c.name}</span>
                        <ChevronRight size={17} className="text-text-2 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  <li className="menu-item" style={{ "--i": categories.length + 2 } as React.CSSProperties}>
                    <Link href="/boutique?tri=nouveautes" className="group flex items-center gap-3 rounded-2xl px-2 py-2 no-underline transition-colors hover:bg-surface-2">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Sparkles size={19} strokeWidth={1.6} className="twinkle" />
                      </span>
                      <span className="flex-1 font-serif text-[1.3rem] leading-tight">Nouveautés</span>
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-accent-text uppercase">Nouveau</span>
                    </Link>
                  </li>
                </ul>
              </>
            )}

            <div className="menu-item mt-6 grid grid-cols-3 gap-2" style={{ "--i": categories.length + 3 } as React.CSSProperties}>
              {[
                { href: "/", label: "Accueil", icon: Home },
                { href: "/a-propos", label: "L'atelier", icon: Store },
                { href: "/contact", label: "Contact", icon: Mail },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface/80 px-2 py-3 text-[13px] font-medium no-underline transition-colors hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary"
                >
                  <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </nav>

          {(socials.length > 0 || !RESERVATION_MODE) && (
            <div className="relative space-y-3 border-t border-border bg-surface/90 p-4 backdrop-blur">
              {socials.length > 0 && <SocialLinks socials={socials} className="justify-center" />}
              {!RESERVATION_MODE && (
                <Link href="/panier" className="btn btn-primary w-full">
                  <ShoppingBag size={18} /> Voir le panier{count ? ` (${count})` : ""}
                </Link>
              )}
            </div>
          )}
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
            placeholder="Fleurs, doré, broche…"
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
