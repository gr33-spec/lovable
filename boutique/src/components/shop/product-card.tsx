import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Availability, ProductCard as Card } from "@/lib/server/catalog";
import { Img } from "../ui/img";
import { Sparkle } from "../ui/sparkle";

export function Price({ cents, compareAt, size = "md" }: { cents: number; compareAt?: number | null; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={size === "lg" ? "text-2xl font-semibold" : "font-semibold"}>{formatPrice(cents)}</span>
      {compareAt && compareAt > cents && (
        <s className="text-sm text-text-2" aria-label={`au lieu de ${formatPrice(compareAt)}`}>
          {formatPrice(compareAt)}
        </s>
      )}
    </span>
  );
}

export function AvailabilityBadge({ availability, stock }: { availability: Availability; stock: number }) {
  if (availability === "sold_out") return <span className="badge bg-soldout-bg text-soldout">Épuisé</span>;
  if (availability === "low_stock") {
    return <span className="badge bg-warning-bg text-warning">{stock === 1 ? "Pièce unique restante" : `Plus que ${stock}`}</span>;
  }
  return null;
}

export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const soldOut = product.availability === "sold_out";
  return (
    <article className="group relative">
      <Link href={`/produit/${product.slug}`} className="block no-underline" aria-label={`${product.name}, ${formatPrice(product.priceCents)}${soldOut ? ", épuisé" : ""}`}>
        <div className="holo-shine relative aspect-[4/5] overflow-hidden rounded-[24px] bg-secondary shadow-soft transition-shadow duration-500 group-hover:shadow-lift">
          <Img
            image={product.image}
            alt={product.image?.alt || product.name}
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className={`h-full w-full transition duration-500 ease-out group-hover:scale-[1.03] ${soldOut ? "opacity-70 grayscale-[35%]" : ""}`}
          />
          {product.hoverImage && (
            <Img
              image={product.hoverImage}
              alt=""
              sizes="(min-width: 1024px) 280px, 33vw"
              className="absolute inset-0 hidden h-full w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block"
            />
          )}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            {product.isNew && !soldOut && (
              <span className="badge gap-1 bg-surface/95 text-text shadow-soft backdrop-blur">
                <Sparkle size={10} className="text-accent" /> Nouveau
              </span>
            )}
            <AvailabilityBadge availability={product.availability} stock={product.stock} />
          </div>
        </div>
        <div className="mt-3.5 px-1">
          <h3 className="font-serif text-[1.2rem] leading-tight font-medium transition-colors group-hover:text-primary">{product.name}</h3>
          <div className="mt-1 text-[15px] text-text-2">
            <Price cents={product.priceCents} compareAt={product.compareAtCents} />
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <li key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
