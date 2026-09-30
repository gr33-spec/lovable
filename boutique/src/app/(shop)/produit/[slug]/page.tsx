import { ChevronRight, Hand, HeartHandshake, Package, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AddToCart } from "@/components/shop/add-to-cart";
import { ReserveButton } from "@/components/shop/reserve-button";
import { RESERVATION_MODE } from "@/lib/sales-mode";
import { Gallery } from "@/components/shop/gallery";
import { AvailabilityBadge, Price, ProductGrid } from "@/components/shop/product-card";
import { getListing, getProduct, getRelated, getSettings } from "@/lib/server/cached";
import { siteUrl } from "@/lib/server/env";
import { vatMention } from "@/lib/server/settings";
import { renderRichText } from "@/lib/rich-text";
import { PRODUCT_COLORS } from "@/lib/validation";

type Props = { params: Promise<{ slug: string }> };

function summary(text: string, max = 158): string {
  const plain = text.replace(/[#*[\]()]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max - 1).replace(/\s\S*$/, "")}…` : plain;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSettings();
  const found = await getProduct(slug, settings.lowStockThreshold);
  if (found.kind !== "found") return { title: "Création indisponible", robots: { index: false } };
  const p = found.product;
  const description = p.seoDescription || summary(p.description) || `${p.name}, bijou fait main par ${settings.shopName}.`;
  const image = p.images[0];
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/produit/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: `/produit/${p.slug}`,
      images: image ? [{ url: `${image.base}/og.jpg`, alt: image.alt || p.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: p.name, description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const settings = await getSettings();
  const found = await getProduct(slug, settings.lowStockThreshold);

  if (found.kind === "redirect") permanentRedirect(`/produit/${found.slug}`);
  if (found.kind === "missing") notFound();
  if (found.kind === "unavailable") {
    const others = await getListing({ category: found.categorySlug, availableOnly: true }, settings.lowStockThreshold);
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow">Création indisponible</p>
          <h1 className="mt-2 text-4xl">« {found.name} » n&apos;est plus proposée</h1>
          <p className="mt-4 text-text-2">Chaque bijou est fait main en petite série. D&apos;autres créations pourraient vous plaire :</p>
          <Link href={`/boutique/${found.categorySlug}`} className="btn btn-primary mt-6">
            Voir les {found.categoryName.toLowerCase()}
          </Link>
        </div>
        {others.items.length > 0 && (
          <div className="mt-12">
            <ProductGrid products={others.items.slice(0, 8)} />
          </div>
        )}
      </div>
    );
  }

  const p = found.product;
  const related = await getRelated(p.id, p.category.slug, settings.lowStockThreshold);
  const colors = PRODUCT_COLORS.filter((c) => p.colors.includes(c.id)).map((c) => c.label);
  const mention = vatMention(settings);
  const url = `${siteUrl()}/produit/${p.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: summary(p.description, 500) || undefined,
      sku: p.sku || undefined,
      image: p.images.map((i) => `${i.base}/og.jpg`),
      brand: { "@type": "Brand", name: settings.shopName },
      category: p.category.name,
      url,
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "EUR",
        price: (p.priceCents / 100).toFixed(2),
        availability: p.availability === "sold_out" ? "https://schema.org/SoldOut" : p.availability === "reserved" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Boutique", item: `${siteUrl()}/boutique` },
        { "@type": "ListItem", position: 2, name: p.category.name, item: `${siteUrl()}/boutique/${p.category.slug}` },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    },
  ];

  return (
    <div className="container-page pt-4 pb-10 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Fil d'Ariane" className="mb-4 hidden text-sm text-text-2 sm:block">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/boutique" className="no-underline hover:underline">
              Boutique
            </Link>
          </li>
          <ChevronRight size={14} aria-hidden="true" />
          <li>
            <Link href={`/boutique/${p.category.slug}`} className="no-underline hover:underline">
              {p.category.name}
            </Link>
          </li>
          <ChevronRight size={14} aria-hidden="true" />
          <li aria-current="page" className="truncate text-text">
            {p.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-16">
        <Gallery images={p.images} name={p.name} />

        <div className="md:pt-2">
          <Link href={`/boutique/${p.category.slug}`} className="eyebrow no-underline">
            {p.category.name}
            {p.collection ? ` · ${p.collection.name}` : ""}
          </Link>
          <h1 className="mt-2 text-[2.2rem] leading-tight sm:text-5xl">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Price cents={p.priceCents} compareAt={p.compareAtCents} size="lg" />
            <AvailabilityBadge availability={p.availability} stock={p.stock} />
          </div>
          {mention && <p className="mt-1 text-xs text-text-2">{mention}</p>}

          <div className="mt-7">
            {RESERVATION_MODE ? (
              <ReserveButton productId={p.id} name={p.name} priceCents={p.priceCents} availability={p.availability} ordersOpen={settings.ordersOpen} shopName={settings.shopName} />
            ) : (
              <AddToCart productId={p.id} name={p.name} priceCents={p.priceCents} stock={p.stock} ordersOpen={settings.ordersOpen} />
            )}
          </div>

          {p.description && <div className="prose-shop mt-8 text-[16px]">{renderRichText(p.description)}</div>}

          {(p.features.length > 0 || colors.length > 0 || p.sku) && (
            <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface text-[15px]">
              {colors.length > 0 && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-2">Couleurs</dt>
                  <dd className="text-right">{colors.join(", ")}</dd>
                </div>
              )}
              {p.features.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-2">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
              {p.sku && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-2">Référence</dt>
                  <dd>{p.sku}</dd>
                </div>
              )}
            </dl>
          )}

          <ul className="mt-8 space-y-3 text-sm text-text-2">
            <li className="flex items-center gap-3">
              <Hand size={18} className="shrink-0 text-primary" aria-hidden="true" /> Fait main : de légères variations rendent chaque pièce unique.
            </li>
            <li className="flex items-center gap-3">
              <Package size={18} className="shrink-0 text-primary" aria-hidden="true" />
              <span>
                Envoi soigné · <Link href="/livraison-retours">Livraison et retours</Link>
              </span>
            </li>
            {RESERVATION_MODE ? (
              <li className="flex items-center gap-3">
                <HeartHandshake size={18} className="shrink-0 text-primary" aria-hidden="true" /> Remise en main propre ou envoi, organisés ensemble après votre réservation
              </li>
            ) : (
              <li className="flex items-center gap-3">
                <ShieldCheck size={18} className="shrink-0 text-primary" aria-hidden="true" /> Paiement sécurisé (carte, Apple Pay, Google Pay)
              </li>
            )}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="titre-similaires">
          <h2 id="titre-similaires" className="mb-6 text-3xl">
            Vous aimerez aussi
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
