import { ArrowRight, ArrowUpRight, Gift, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "@/components/shop/footer";
import { ProductCard, ProductGrid } from "@/components/shop/product-card";
import { Img } from "@/components/ui/img";
import { Highlighted, plainText, Sparkle } from "@/components/ui/sparkle";
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
  // Visuel d'accueil : la photo choisie dans l'administration ; sinon une
  // composition de trois créations (on présente une collection, pas un produit).
  const collage = (available.length >= 3 ? available : withPhotos).slice(0, 3).map((p) => p.image!);
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
        <div className="soft-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-10 pt-4 pb-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-16 md:pb-28">
          <div>
            <p className="eyebrow">Créations faites main · petites séries</p>
            <h1 className="mt-5 text-[2.75rem] leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[4.8rem]">
              <Highlighted text={tagline} />
            </h1>
            {settings.introText && <p className="mt-6 max-w-md text-[17px] leading-relaxed text-text-2">{settings.introText}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/boutique" className="btn btn-primary min-h-[52px] px-7 text-[15px]">
                Découvrir les créations <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/boutique?tri=nouveautes" className="btn btn-outline min-h-[52px] px-6 text-[15px]">
                Nouveautés
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[13px] font-medium tracking-wide text-text-2">
              {[
                { icon: Sparkles, label: "Pièces uniques" },
                { icon: Gift, label: "Prêt à offrir" },
                { icon: Lock, label: "Paiement sécurisé" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon size={15} className="text-accent-text" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Visuel : photo d'ambiance en arche, ou trois créations en arches (forme bohème). */}
          {settings.hero ? (
            <div className="relative isolate mx-auto w-[82%] max-w-[480px] md:w-full">
              <div className="holo-shine aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[28px] bg-surface-2 shadow-lift">
                <Img image={settings.hero} alt={settings.hero.alt || `Créations ${settings.shopName}`} sizes="(min-width: 768px) 45vw, 82vw" priority className="h-full w-full" />
              </div>
              <div className="pointer-events-none absolute -inset-3 -z-10 rounded-t-[999px] rounded-b-[36px] border border-accent/40" aria-hidden="true" />
              <Sparkle size={24} className="absolute top-6 -right-1 text-accent" />
            </div>
          ) : collage.length > 0 ? (
            <div className="relative isolate mx-auto flex w-full max-w-[520px] items-end justify-center gap-3 sm:gap-4" aria-hidden="true">
              {collage.map((image, i) => {
                const center = collage.length === 3 ? i === 1 : i === 0;
                return (
                  <div
                    key={image.id}
                    className={`holo-shine overflow-hidden rounded-t-[999px] rounded-b-[22px] bg-surface-2 shadow-lift ${center ? "aspect-[3/5] w-[38%]" : "mb-8 aspect-[3/4.6] w-[29%]"}`}
                  >
                    <Img image={image} alt="" sizes="(min-width: 768px) 200px, 38vw" priority={center} className="h-full w-full" />
                  </div>
                );
              })}
              <div className="pointer-events-none absolute -bottom-3 left-1/2 -z-10 h-[78%] w-[46%] -translate-x-1/2 rounded-t-[999px] border border-b-0 border-accent/40" aria-hidden="true" />
              <Sparkle size={22} className="absolute -top-2 right-[12%] text-accent" />
              <Sparkle size={14} className="absolute top-[30%] left-[4%] text-accent" delay={1} />
            </div>
          ) : null}
        </div>
      </section>

      {/* ───────── Bandeau ───────── */}
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

      {/* ───────── Catégories ───────── */}
      {visibleCategories.length > 0 && (
        <section className="container-page py-16 sm:py-24" aria-labelledby="titre-categories">
          <div className="mb-8 sm:mb-10">
            <p className="eyebrow">Explorer</p>
            <h2 id="titre-categories" className="mt-3 text-[2.2rem] sm:text-5xl">
              Trouver <em className="text-accent-text">la pièce</em> qui vous ressemble
            </h2>
          </div>
          <ul className={`grid gap-3 sm:gap-5 ${visibleCategories.length === 1 ? "" : "grid-cols-2"} ${visibleCategories.length > 2 ? "lg:grid-cols-4" : ""}`}>
            {visibleCategories.map((c, i) => (
              <li key={c.id} className={visibleCategories.length > 1 && visibleCategories.length % 2 === 1 && i === 0 ? "col-span-2" : ""}>
                <Link href={`/boutique/${c.slug}`} className="group holo-ring lift block rounded-[24px] no-underline">
                  <div className="holo-shine relative aspect-[4/5] overflow-hidden rounded-[24px] bg-surface-2 sm:aspect-[16/12]">
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
      <section className="container-page pb-16 sm:pb-24" aria-labelledby="titre-nouveautes">
        <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
          <div>
            <p className="eyebrow">Tout juste sorties de l&apos;atelier</p>
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
        <section className="container-page pb-16 sm:pb-24" aria-labelledby="titre-best">
          <p className="eyebrow">Vos coups de cœur</p>
          <h2 id="titre-best" className="mt-3 mb-8 text-[2.2rem] sm:mb-10 sm:text-5xl">
            Les plus <em className="text-accent-text">aimées</em>
          </h2>
          <ProductGrid products={best} />
        </section>
      )}

      {/* ───────── L'atelier ───────── */}
      <section className="relative overflow-hidden bg-surface-2" aria-labelledby="titre-atelier">
        <div className="container-page relative grid items-center gap-12 py-16 sm:py-28 md:grid-cols-2 md:gap-20">
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className={`overflow-hidden bg-surface shadow-lift ${settings.aboutImage ? "aspect-[4/5] rounded-t-[999px] rounded-b-[28px]" : "aspect-square rounded-full p-6"}`}>
              <Img
                image={settings.aboutImage ?? settings.logo}
                alt={settings.aboutImage?.alt || "L'atelier"}
                sizes="(min-width: 768px) 40vw, 90vw"
                fit={settings.aboutImage ? "cover" : "contain"}
                className="h-full w-full"
              />
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
      <section className="container-page py-14 sm:py-20" aria-label="Nos engagements">
        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {[
            { icon: Sparkles, title: "Fait main, pièce par pièce", text: "Chaque bijou est coulé, poncé et assemblé à la main." },
            { icon: Gift, title: "Emballage soigné", text: "Prêt à offrir… ou à vous faire plaisir." },
            { icon: Lock, title: "Paiement sécurisé", text: "Carte, Apple Pay ou Google Pay, via Stripe." },
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
        <section className="container-page pb-8">
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
