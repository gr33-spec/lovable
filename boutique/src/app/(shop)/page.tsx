import { ArrowRight, ArrowUpRight, Gift, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "@/components/shop/footer";
import { ProductCard, ProductGrid } from "@/components/shop/product-card";
import { Img } from "@/components/ui/img";
import { Highlighted, plainText, Sparkle } from "@/components/ui/sparkle";
import { formatPrice } from "@/lib/format";
import { getBestSellers, getCategories, getListing, getSettings } from "@/lib/server/cached";
import { siteUrl } from "@/lib/server/env";

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
  const available = withPhotos.filter((p) => p.availability !== "sold_out");
  // Visuel d'accueil : celui choisi dans l'administration, sinon la dernière création disponible.
  const heroImage = settings.hero ?? (available[0] ?? withPhotos[0])?.image ?? null;
  const featured = (available.find((p) => p.image?.id !== heroImage?.id) ?? withPhotos.find((p) => p.image?.id !== heroImage?.id)) || null;
  const visibleCategories = categories.filter((c) => c.productCount > 0);
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

      {/* ───────── Introduction ───────── */}
      <section className="relative overflow-hidden">
        <div className="glitter-dust pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--c-primary-light), transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="container-page relative grid items-center gap-10 pt-6 pb-14 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pt-14 md:pb-24">
          <div className="order-2 md:order-1">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur">
              <Sparkle size={13} className="text-accent" /> Créations faites main, en petites séries
            </p>
            <h1 className="mt-5 text-[2.9rem] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-[4.6rem]">
              <Highlighted text={tagline} />
            </h1>
            {settings.introText && <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-text-2">{settings.introText}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/boutique" className="btn btn-primary min-h-[52px] px-7 text-base">
                Découvrir les créations <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/boutique?tri=nouveautes" className="btn btn-outline min-h-[52px] px-6 text-base">
                Nouveautés
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-2">
              {["Pièces uniques", "Résine & paillettes", "Paiement sécurisé"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Sparkle size={11} className="text-accent" delay={1} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Composition de photos */}
          <div className="relative order-1 mx-auto mb-4 w-full max-w-[520px] md:order-2 md:mb-0">
            <div className="holo-shine aspect-[5/4] overflow-hidden rounded-[32px] bg-secondary shadow-lift sm:aspect-[4/5] sm:rounded-[36px]">
              <Img image={heroImage} alt={heroImage?.alt || `Création ${settings.shopName}`} sizes="(min-width: 768px) 45vw, 92vw" priority className="h-full w-full" />
            </div>
            {featured && (
              <Link
                href={`/produit/${featured.slug}`}
                className="group absolute -bottom-6 left-3 flex w-[72%] max-w-[270px] items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2.5 pr-4 no-underline shadow-lift backdrop-blur sm:-left-8"
              >
                <span className="holo-shine block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  <Img image={featured.image} alt="" sizes="64px" className="h-full w-full" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">
                    <Sparkle size={10} /> Nouveau
                  </span>
                  <span className="block truncate text-sm font-medium">{featured.name}</span>
                  <span className="text-sm text-text-2">{formatPrice(featured.priceCents)}</span>
                </span>
                <ArrowUpRight size={16} className="ml-auto shrink-0 text-text-2 transition group-hover:text-primary" aria-hidden="true" />
              </Link>
            )}
            <Sparkle size={34} className="absolute -top-4 -right-2 text-accent" />
            <Sparkle size={18} className="absolute top-16 -left-5 text-accent" delay={1} />
            <Sparkle size={14} className="absolute right-6 -bottom-3 text-primary" delay={2} />
          </div>
        </div>
      </section>

      {/* ───────── Bandeau ───────── */}
      <div className="marquee border-y border-primary bg-primary py-3.5 text-on-primary" aria-hidden="true">
        {[0, 1].map((k) => (
          <div key={k} className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-10 font-serif text-xl whitespace-nowrap italic">
                {t} <Sparkle size={13} className="opacity-80" />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ───────── Catégories ───────── */}
      {visibleCategories.length > 0 && (
        <section className="container-page py-16 sm:py-20" aria-labelledby="titre-categories">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Explorer</p>
              <h2 id="titre-categories" className="mt-1 text-4xl sm:text-5xl">
                Trouver <span className="text-shimmer">la pièce</span> qui vous ressemble
              </h2>
            </div>
          </div>
          <ul className={`grid gap-3 sm:gap-5 ${visibleCategories.length === 1 ? "" : "grid-cols-2"} ${visibleCategories.length > 2 ? "lg:grid-cols-4" : ""}`}>
            {visibleCategories.map((c, i) => (
              <li key={c.id} className={visibleCategories.length === 3 && i === 0 ? "col-span-2 lg:col-span-2" : ""}>
                <Link href={`/boutique/${c.slug}`} className="group holo-ring block rounded-[28px] no-underline">
                  <div className="holo-shine relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-soft sm:aspect-[16/12]">
                    <Img image={c.cover} alt="" sizes="(min-width: 640px) 50vw, 50vw" className="h-full w-full transition duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
                      <div>
                        <p className="font-serif text-2xl leading-tight sm:text-4xl">{c.name}</p>
                        <p className="mt-1 text-sm opacity-90">
                          {c.productCount} création{c.productCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-text transition group-hover:scale-110 sm:h-12 sm:w-12">
                        <ArrowUpRight size={18} aria-hidden="true" />
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
      <section className="container-page pb-16 sm:pb-20" aria-labelledby="titre-nouveautes">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Tout juste sorties de l&apos;atelier</p>
            <h2 id="titre-nouveautes" className="mt-1 text-4xl sm:text-5xl">
              Nouveautés
            </h2>
          </div>
          <Link href="/boutique?tri=nouveautes" className="inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-primary">
            Tout voir <ArrowRight size={16} aria-hidden="true" />
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
          <div className="card glitter-dust flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Sparkle size={28} className="text-accent" />
            <p className="font-serif text-3xl">Les premières créations arrivent très bientôt</p>
            <p className="text-text-2">Suivez l&apos;atelier sur les réseaux pour ne rien manquer.</p>
            <SocialLinks socials={settings.socials} className="justify-center" />
          </div>
        )}
      </section>

      {best.length > 0 && (
        <section className="container-page pb-16 sm:pb-20" aria-labelledby="titre-best">
          <p className="eyebrow">Vos coups de cœur</p>
          <h2 id="titre-best" className="mt-1 mb-7 text-4xl sm:text-5xl">
            Les plus <span className="text-shimmer">aimées</span>
          </h2>
          <ProductGrid products={best} />
        </section>
      )}

      {/* ───────── L'atelier ───────── */}
      <section className="relative overflow-hidden bg-secondary" aria-labelledby="titre-atelier">
        <div className="glitter-dust pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-10 py-16 sm:py-24 md:grid-cols-2 md:gap-16">
          <div className="relative mx-auto w-full max-w-[460px]">
            <div className="aspect-square overflow-hidden rounded-full border-[10px] border-surface bg-surface shadow-lift">
              <Img
                image={settings.aboutImage ?? settings.logo}
                alt={settings.aboutImage?.alt || "L'atelier"}
                sizes="(min-width: 768px) 40vw, 90vw"
                fit={settings.aboutImage ? "cover" : "contain"}
                className="h-full w-full"
              />
            </div>
            <Sparkle size={30} className="absolute top-4 right-4 text-accent" />
            <Sparkle size={16} className="absolute bottom-10 -left-2 text-accent" delay={2} />
          </div>
          <div>
            <p className="eyebrow">L&apos;atelier</p>
            <h2 id="titre-atelier" className="mt-2 text-4xl sm:text-5xl">
              {settings.aboutTitle || `Bienvenue chez ${settings.shopName}`}
            </h2>
            {aboutExcerpt && <p className="mt-5 font-serif text-2xl leading-snug text-text italic sm:text-[1.7rem]">« {aboutExcerpt} »</p>}
            <Link href="/a-propos" className="btn btn-outline mt-8">
              Découvrir l&apos;atelier <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Engagements ───────── */}
      <section className="container-page py-14" aria-label="Nos engagements">
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          {[
            { icon: Sparkles, title: "Fait main, pièce par pièce", text: "Chaque bijou est coulé, poncé et assemblé à la main." },
            { icon: Gift, title: "Emballage soigné", text: "Prêt à offrir… ou à vous faire plaisir." },
            { icon: Lock, title: "Paiement sécurisé", text: "Carte, Apple Pay ou Google Pay, via Stripe." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-[15px]">{title}</strong>
                <span className="text-sm text-text-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── Réseaux ───────── */}
      {settings.socials.length > 0 && (
        <section className="container-page pb-6">
          <div className="holo-ring group relative overflow-hidden rounded-[32px] bg-surface px-6 py-12 text-center shadow-soft sm:py-16">
            <div className="glitter-dust pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <Sparkle size={26} className="mx-auto text-accent" />
              <h2 className="mt-3 text-4xl sm:text-5xl">
                Les coulisses de <span className="text-shimmer">l&apos;atelier</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-text-2">Nouvelles créations, marchés, paillettes en cours de séchage : suivez l&apos;aventure.</p>
              <SocialLinks socials={settings.socials} className="mt-6 justify-center" />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
