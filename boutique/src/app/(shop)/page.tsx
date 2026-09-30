import { ArrowRight, ArrowUpRight, Gift, HeartHandshake, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "@/components/shop/footer";
import { ProductCard, ProductGrid } from "@/components/shop/product-card";
import { Img } from "@/components/ui/img";
import { imageSrc } from "@/lib/image-ref";
import { Highlighted, plainText, Sparkle } from "@/components/ui/sparkle";
import { getBestSellers, getCategories, getListing, getSettings } from "@/lib/server/cached";
import { siteUrl } from "@/lib/server/env";
import { RESERVATION_MODE } from "@/lib/sales-mode";

const MARQUEE = ["Fait main", "Résine & paillettes", "Pièces uniques", "Petites séries", "Envoi soigné", "Prêt à offrir"];

export default async function HomePage() {
  const settings = await getSettings();
  const [categories, latest, best] = await Promise.all([
    getCategories(),
    getListing({ sort: "nouveautes", availableOnly: false }, settings.lowStockThreshold),
    getBestSellers(settings.lowStockThreshold),
  ]);
  const newest = latest.items.slice(0, 8);
  const withPhotos = newest.filter((p) => p.image);
  const available = withPhotos.filter((p) => p.availability !== "sold_out" && p.availability !== "reserved");
  // Visuels d'accueil : la photo choisie dans l'administration en premier,
  // complétée par les dernières créations (on présente une collection).
  const pool = available.length >= 2 ? available : withPhotos;
  const tiles = [settings.hero, ...pool.map((p) => p.image)].filter((img, i, all): img is NonNullable<typeof img> => !!img && all.findIndex((x) => x?.id === img.id) === i).slice(0, 2);
  const visibleCategories = categories.filter((c) => c.productCount > 0);
  const wideLogo = settings.logo ? settings.logo.w / settings.logo.h >= 1.6 : false;
  // Catégories en « bento » sur ordinateur : la première en grand, les autres autour.
  const n = visibleCategories.length;
  const bento =
    n === 3 || n >= 5
      ? { cols: `lg:auto-rows-[250px] ${n === 3 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`, first: "lg:col-span-1 lg:row-span-2", tile: "aspect-[4/5] lg:aspect-auto" }
      : { cols: n === 4 ? "lg:grid-cols-4" : "", first: "", tile: "aspect-[4/5] sm:aspect-[16/12] lg:aspect-[4/5]" };
  const aboutExcerpt = settings.aboutText.split(/\n{2,}/).find((p) => p.trim() && !p.includes("[À COMPLÉTER")) ?? "";
  const tagline = settings.tagline || settings.shopName;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.shopName,
    description: plainText(settings.tagline),
    url: siteUrl(),
    ...(settings.logo ? { logo: `${settings.logo.base}/og.jpg` } : {}),
    sameAs: settings.socials.map((s) => s.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ───────── Introduction : la marque d'abord (logo), puis l'essentiel ───────── */}
      <section className="relative overflow-hidden">
        <div className="soft-glow pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-10 pt-8 pb-8 lg:grid-cols-12 lg:gap-12 lg:pt-14 lg:pb-24">
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left">
            {settings.logo &&
              (wideLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc(settings.logo, 640)} alt={settings.shopName} className="mb-7 h-auto w-[min(78vw,320px)] object-contain" />
              ) : (
                <div className="relative mb-7">
                  <div className="pointer-events-none absolute -inset-3 rounded-full border border-accent/45" aria-hidden="true" />
                  <div className="pointer-events-none absolute -inset-6 rounded-full border border-accent/15" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc(settings.logo, 640)}
                    alt={settings.shopName}
                    width={176}
                    height={176}
                    className="relative h-36 w-36 rounded-full object-cover shadow-lift ring-4 ring-surface sm:h-44 sm:w-44"
                  />
                  <Sparkle size={22} className="absolute -top-3 -right-4 text-accent" />
                  <Sparkle size={13} className="absolute bottom-3 -left-5 text-accent" delay={1} />
                </div>
              ))}
            <p className="eyebrow">
              Fait main<span className="hidden sm:inline"> · petites séries</span>
            </p>
            <h1 className="mt-4 text-[2.6rem] leading-[1] sm:text-[3.6rem] lg:text-[4.8rem]">
              <Highlighted text={tagline} />
            </h1>
            {settings.introText && <p className="mt-5 max-w-md text-[16px] leading-relaxed text-text-2 sm:text-[17px]">{settings.introText}</p>}
            <div className="mt-7 grid w-full max-w-sm grid-cols-2 gap-3 lg:flex lg:w-auto lg:max-w-none">
              <Link href="/boutique" className="btn btn-primary min-h-[52px] px-5 text-[15px] lg:px-7">
                La boutique <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/boutique?tri=nouveautes" className="btn btn-outline min-h-[52px] px-5 text-[15px] lg:px-6">
                Nouveautés
              </Link>
            </div>
            <ul className="mt-9 hidden flex-wrap gap-x-7 gap-y-3 text-[13px] font-medium text-text-2 lg:flex">
              {[
                { icon: Sparkles, label: "Pièces uniques" },
                { icon: Gift, label: "Prêt à offrir" },
                RESERVATION_MODE ? { icon: HeartHandshake, label: "Réservation sans paiement en ligne" } : { icon: Lock, label: "Paiement sécurisé" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon size={15} className="text-accent-text" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Bento de photos : ordinateur uniquement (sur téléphone, les créations arrivent juste en dessous). */}
          {tiles.length > 0 && (
            <div className="hidden h-[600px] grid-cols-[1.35fr_1fr] grid-rows-2 gap-4 lg:col-span-6 lg:grid">
              <Link href="/boutique" className="group row-span-2 overflow-hidden rounded-[28px] bg-surface-2 shadow-soft" aria-label="Découvrir les créations">
                <span className="holo-shine block h-full w-full">
                  <Img image={tiles[0]} alt="" sizes="30vw" priority className="h-full w-full transition duration-1000 ease-out group-hover:scale-[1.04]" />
                </span>
              </Link>
              {tiles[1] ? (
                <Link href="/boutique?tri=nouveautes" className="group overflow-hidden rounded-[28px] bg-surface-2 shadow-soft" aria-label="Voir les nouveautés">
                  <span className="holo-shine block h-full w-full">
                    <Img image={tiles[1]} alt="" sizes="22vw" className="h-full w-full transition duration-1000 ease-out group-hover:scale-[1.04]" />
                  </span>
                </Link>
              ) : (
                <div className="rounded-[28px] bg-primary-soft" aria-hidden="true" />
              )}
              <Link href="/a-propos" className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-secondary p-6 no-underline">
                <div className="glitter-dust pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
                <Sparkle size={20} className="relative text-accent" />
                <span className="relative">
                  <span className="block font-serif text-[1.9rem] leading-[1.05]">
                    Fait main, <em className="text-accent-text">pièce par pièce</em>
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
                    L&apos;atelier <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Téléphone : catégories en ronds, façon « stories à la une » ───────── */}
      <nav aria-label="Catégories" className="pb-10 lg:hidden">
        <ul className="no-scrollbar flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-1 pb-2 sm:justify-center">
          {[
            { href: "/boutique", label: "Tout voir", image: null },
            ...visibleCategories.map((c) => ({ href: `/boutique/${c.slug}`, label: c.name, image: c.cover })),
            { href: "/boutique?tri=nouveautes", label: "Nouveautés", image: null },
          ].map((item) => (
            <li key={item.href} className="w-[78px] shrink-0 snap-start">
              <Link href={item.href} className="group flex flex-col items-center gap-2 text-center no-underline">
                <span className="rounded-full p-[2px]" style={{ background: "conic-gradient(from 200deg, var(--c-accent), var(--c-primary), var(--c-secondary), var(--c-accent))" }}>
                  <span className="flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full border-[3px] border-surface bg-surface-2 text-primary transition duration-300 group-active:scale-95">
                    {item.image ? <Img image={item.image} alt="" sizes="70px" priority className="h-full w-full" /> : <Sparkles size={22} aria-hidden="true" />}
                  </span>
                </span>
                <span className="line-clamp-2 text-[12px] leading-tight font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ───────── Bandeau (ordinateur) ───────── */}
      <div className="hidden lg:block">
        <div className="marquee border-y border-border bg-surface py-3.5 text-text-2" aria-hidden="true">
          {[0, 1].map((k) => (
            <div key={k} className="marquee-track">
              {[...MARQUEE, ...MARQUEE].map((t, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-10 text-[12px] font-semibold tracking-[0.22em] whitespace-nowrap uppercase">
                  {t} <Sparkle size={10} className="text-accent" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ───────── Catégories ───────── */}
      {visibleCategories.length > 0 && (
        <section className="reveal container-page hidden py-24 lg:block" aria-labelledby="titre-categories">
          <div className="mb-8 sm:mb-10">
            <p className="eyebrow">Explorer</p>
            <h2 id="titre-categories" className="mt-3 text-[2.2rem] sm:text-5xl">
              Trouver <em className="text-accent-text">la pièce</em> qui vous ressemble
            </h2>
          </div>
          <ul className={`grid gap-3 sm:gap-4 ${visibleCategories.length === 1 ? "" : "grid-cols-2"} ${bento.cols}`}>
            {visibleCategories.map((c, i) => (
              <li key={c.id} className={`${visibleCategories.length > 1 && visibleCategories.length % 2 === 1 && i === 0 ? "col-span-2" : ""} ${i === 0 ? bento.first : ""}`}>
                <Link href={`/boutique/${c.slug}`} className="group holo-ring lift block h-full rounded-[28px] no-underline">
                  <div className={`holo-shine relative h-full overflow-hidden rounded-[28px] bg-surface-2 ${bento.tile}`}>
                    <Img image={c.cover} alt="" sizes="(min-width: 640px) 50vw, 50vw" className="h-full w-full transition duration-700 ease-out group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
                      <div>
                        <p className="font-serif text-[1.65rem] leading-tight sm:text-4xl">{c.name}</p>
                        <p className="mt-0.5 text-[13px] opacity-90">
                          {c.productCount} création{c.productCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/95 text-text transition duration-300 group-hover:scale-110 sm:h-11 sm:w-11">
                        <ArrowUpRight size={17} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───────── Nouveautés ───────── */}
      <section className="reveal container-page pb-16 sm:pb-24" aria-labelledby="titre-nouveautes">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="eyebrow">Sorties de l&apos;atelier</p>
            <h2 id="titre-nouveautes" className="mt-3 text-[2.2rem] sm:text-5xl">
              Nouveautés
            </h2>
          </div>
          <Link href="/boutique?tri=nouveautes" className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary no-underline">
            Tout voir <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        {newest.length ? (
          <ul className="rail -mx-4 px-4 sm:mx-0 sm:px-0">
            {newest.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Sparkle size={24} className="text-accent" />
            <p className="font-serif text-3xl">Les premières créations arrivent très bientôt</p>
            <p className="text-text-2">Suivez l&apos;atelier sur les réseaux pour ne rien manquer.</p>
            <SocialLinks socials={settings.socials} className="justify-center" />
          </div>
        )}
      </section>

      {best.length > 0 && (
        <section className="reveal container-page pb-16 sm:pb-24" aria-labelledby="titre-best">
          <p className="eyebrow">Vos coups de cœur</p>
          <h2 id="titre-best" className="mt-3 mb-8 text-[2.2rem] sm:mb-10 sm:text-5xl">
            Les plus <em className="text-accent-text">aimées</em>
          </h2>
          <ProductGrid products={best} />
        </section>
      )}

      {/* ───────── L'atelier ───────── */}
      <section className="relative overflow-hidden bg-surface-2" aria-labelledby="titre-atelier">
        <div className="reveal container-page relative grid items-center gap-12 py-16 sm:py-28 md:grid-cols-2 md:gap-20">
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[28px] bg-surface-2 shadow-lift">
              <Img image={settings.aboutImage ?? tiles[1] ?? tiles[0] ?? null} alt={settings.aboutImage?.alt || "Créations de l'atelier"} sizes="(min-width: 768px) 40vw, 90vw" className="h-full w-full" />
            </div>
            <Sparkle size={22} className="absolute top-10 -right-2 text-accent" delay={1} />
          </div>
          <div>
            <p className="eyebrow">L&apos;atelier</p>
            <h2 id="titre-atelier" className="mt-3 text-[2.2rem] sm:text-5xl">
              {settings.aboutTitle || `Bienvenue chez ${settings.shopName}`}
            </h2>
            {aboutExcerpt && <p className="mt-6 font-serif text-[1.6rem] leading-snug text-text italic sm:text-[1.9rem]">« {aboutExcerpt} »</p>}
            <div className="hairline mt-8 max-w-xs" aria-hidden="true" />
            <Link href="/a-propos" className="btn btn-outline mt-8">
              Découvrir l&apos;atelier <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Engagements ───────── */}
      <section className="reveal container-page py-14 sm:py-20" aria-label="Nos engagements">
        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {[
            { icon: Sparkles, title: "Fait main, pièce par pièce", text: "Chaque bijou est coulé, poncé et assemblé à la main." },
            { icon: Gift, title: "Emballage soigné", text: "Prêt à offrir… ou à vous faire plaisir." },
            RESERVATION_MODE
              ? { icon: HeartHandshake, title: "Réservation simple", text: "Réservez en un instant, sans compte : nous vous recontactons pour la remise ou l'envoi." }
              : { icon: Lock, title: "Paiement sécurisé", text: "Carte, Apple Pay ou Google Pay, via Stripe." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-soft">
                <Icon size={19} aria-hidden="true" />
              </span>
              <strong className="text-[15px] font-semibold">{title}</strong>
              <span className="max-w-[260px] text-sm text-text-2">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── Réseaux ───────── */}
      {settings.socials.length > 0 && (
        <section className="reveal container-page pb-8">
          <div className="holo-ring group relative overflow-hidden rounded-[28px] border border-border bg-surface px-6 py-14 text-center sm:py-20">
            <div className="soft-glow pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative">
              <Sparkle size={20} className="mx-auto text-accent" />
              <h2 className="mt-4 text-[2.2rem] sm:text-5xl">
                Les coulisses de <em className="text-accent-text">l&apos;atelier</em>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-text-2">Nouvelles créations, marchés, paillettes en cours de séchage : suivez l&apos;aventure.</p>
              <SocialLinks socials={settings.socials} className="mt-7 justify-center" />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
