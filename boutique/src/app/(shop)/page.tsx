import { ArrowRight, Gift, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "@/components/shop/footer";
import { ProductGrid } from "@/components/shop/product-card";
import { Img } from "@/components/ui/img";
import { getBestSellers, getCategories, getListing, getSettings } from "@/lib/server/cached";
import { siteUrl } from "@/lib/server/env";

export default async function HomePage() {
  const settings = await getSettings();
  const [categories, latest, best] = await Promise.all([
    getCategories(),
    getListing({ sort: "nouveautes", availableOnly: false }, settings.lowStockThreshold),
    getBestSellers(settings.lowStockThreshold),
  ]);
  const newest = latest.items.slice(0, 8);
  const heroImage = settings.hero ?? (newest.find((p) => p.image && p.availability !== "sold_out") ?? newest.find((p) => p.image))?.image ?? null;
  const visibleCategories = categories.filter((c) => c.productCount > 0);
  const aboutExcerpt = settings.aboutText.split(/\n{2,}/).find((p) => p.trim() && !p.includes("[À COMPLÉTER")) ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.shopName,
    description: settings.tagline,
    url: siteUrl(),
    ...(settings.logo ? { logo: `${settings.logo.base}/og.jpg` } : {}),
    sameAs: settings.socials.map((s) => s.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Introduction : la marque et une création en grand. */}
      <section className="container-page grid items-center gap-8 pt-6 pb-12 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pt-12 md:pb-20">
        <div className="order-2 md:order-1">
          <p className="eyebrow">Créations faites main</p>
          <h1 className="mt-3 text-[2.6rem] leading-[1.05] sm:text-5xl lg:text-[4rem]">{settings.tagline || settings.shopName}</h1>
          {settings.introText && <p className="mt-5 max-w-xl text-[17px] text-text-2">{settings.introText}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/boutique" className="btn btn-primary">
              Découvrir les créations <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/boutique?tri=nouveautes" className="btn btn-outline">
              Nouveautés
            </Link>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <div className="absolute -inset-3 -z-10 rounded-[32px] bg-gradient-to-br from-primary-light via-secondary to-bg md:-inset-5" aria-hidden="true" />
          <div className="aspect-[4/5] overflow-hidden rounded-[28px] shadow-lift sm:aspect-[5/4] md:aspect-[4/5]">
            <Img image={heroImage} alt={heroImage?.alt || `Créations ${settings.shopName}`} sizes="(min-width: 768px) 50vw, 100vw" priority className="h-full w-full" />
          </div>
          <Sparkles className="absolute -top-2 -right-1 text-accent md:-top-4 md:-right-4" size={30} strokeWidth={1.4} aria-hidden="true" />
        </div>
      </section>

      {/* Catégories */}
      {visibleCategories.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="titre-categories">
          <h2 id="titre-categories" className="sr-only">
            Catégories
          </h2>
          <ul className={`grid gap-3 sm:gap-5 ${visibleCategories.length === 1 ? "" : visibleCategories.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
            {visibleCategories.map((c) => (
              <li key={c.id}>
                <Link href={`/boutique/${c.slug}`} className="group relative block overflow-hidden rounded-[var(--radius-card)] no-underline shadow-soft">
                  <div className="aspect-[4/5] sm:aspect-[16/11]">
                    <Img image={c.cover} alt="" sizes="(min-width: 640px) 50vw, 50vw" className="h-full w-full transition duration-700 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                    <p className="font-serif text-2xl leading-tight sm:text-3xl">{c.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                      {c.productCount} création{c.productCount > 1 ? "s" : ""} <ArrowRight size={14} aria-hidden="true" />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Nouveautés */}
      <section className="container-page pb-16" aria-labelledby="titre-nouveautes">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Tout juste sorties de l&apos;atelier</p>
            <h2 id="titre-nouveautes" className="mt-1 text-3xl sm:text-4xl">
              Nouveautés
            </h2>
          </div>
          <Link href="/boutique?tri=nouveautes" className="shrink-0 text-[15px] font-semibold text-primary">
            Tout voir
          </Link>
        </div>
        {newest.length ? (
          <ProductGrid products={newest} />
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Sparkles className="text-accent" aria-hidden="true" />
            <p className="font-serif text-2xl">Les premières créations arrivent très bientôt</p>
            <p className="text-text-2">Suivez l&apos;atelier sur les réseaux pour ne rien manquer.</p>
            <SocialLinks socials={settings.socials} className="justify-center" />
          </div>
        )}
      </section>

      {best.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="titre-best">
          <p className="eyebrow">Vos coups de cœur</p>
          <h2 id="titre-best" className="mt-1 mb-6 text-3xl sm:text-4xl">
            Les plus aimées
          </h2>
          <ProductGrid products={best} />
        </section>
      )}

      {/* Engagements, en une ligne */}
      <section className="border-y border-border bg-surface" aria-label="Nos engagements">
        <ul className="container-page grid gap-6 py-8 text-sm sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "Fait main, pièce par pièce", text: "Chaque bijou est coulé, poncé et assemblé à la main." },
            { icon: Gift, title: "Emballage soigné", text: "Prêt à offrir… ou à vous faire plaisir." },
            { icon: Lock, title: "Paiement sécurisé", text: "Carte, Apple Pay ou Google Pay, via Stripe." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-[15px]">{title}</strong>
                <span className="text-text-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* La créatrice */}
      <section className="container-page grid items-center gap-8 py-16 md:grid-cols-2 md:gap-14" aria-labelledby="titre-atelier">
        <div className="aspect-[4/3] overflow-hidden rounded-[28px] bg-secondary md:aspect-square">
          <Img image={settings.aboutImage ?? settings.logo} alt={settings.aboutImage?.alt || "L'atelier"} sizes="(min-width: 768px) 50vw, 100vw" fit={settings.aboutImage ? "cover" : "contain"} className="h-full w-full" />
        </div>
        <div>
          <p className="eyebrow">L&apos;atelier</p>
          <h2 id="titre-atelier" className="mt-2 text-3xl sm:text-4xl">
            {settings.aboutTitle || `Bienvenue chez ${settings.shopName}`}
          </h2>
          {aboutExcerpt && <p className="mt-4 text-[17px] text-text-2">{aboutExcerpt}</p>}
          <Link href="/a-propos" className="btn btn-outline mt-6">
            Découvrir l&apos;atelier
          </Link>
          {settings.socials.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold">Suivre les nouvelles créations</p>
              <SocialLinks socials={settings.socials} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
