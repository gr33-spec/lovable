import { ChevronRight, SearchX, X } from "lucide-react";
import Link from "next/link";
import { getCategories, getCollections, getFacets, getListing, getSettings } from "@/lib/server/cached";
import { SORTS, type ListingFilters, type Sort } from "@/lib/server/catalog";
import { PRODUCT_COLORS } from "@/lib/validation";
import { ProductGrid } from "./product-card";
import { FilterSheet, SortSelect } from "./listing-controls";

export type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.slice(0, 100);
}

/** Paramètres d'URL → filtres validés (valeurs inconnues ignorées). */
export function parseFilters(params: RawParams, category?: string): ListingFilters {
  const sort = one(params.tri);
  const euros = (v: string | undefined) => (v && /^\d{1,5}$/.test(v) ? Number(v) * 100 : undefined);
  const color = one(params.couleur);
  const page = Number(one(params.page));
  return {
    category,
    q: one(params.q)?.trim() || undefined,
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "selection",
    availableOnly: one(params.dispo) === "1",
    color: PRODUCT_COLORS.some((c) => c.id === color) ? color : undefined,
    collection: /^[a-z0-9-]{1,80}$/.test(one(params.collection) ?? "") ? one(params.collection) : undefined,
    minCents: euros(one(params["prix-min"])),
    maxCents: euros(one(params["prix-max"])),
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 50) : 1,
  };
}

function hrefWith(base: string, params: RawParams, changes: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = one(v);
    if (val && k !== "page") sp.set(k, val);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined) sp.delete(k);
    else sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export async function Listing({ params, category }: { params: RawParams; category?: { slug: string; name: string; description: string } }) {
  const settings = await getSettings();
  const filters = parseFilters(params, category?.slug);
  const [listing, facets, categories, collections] = await Promise.all([
    getListing(filters, settings.lowStockThreshold),
    getFacets(category?.slug),
    getCategories(),
    getCollections(),
  ]);
  const base = category ? `/boutique/${category.slug}` : "/boutique";
  const title = filters.q ? `Résultats pour « ${filters.q} »` : category ? category.name : filters.sort === "nouveautes" ? "Nouveautés" : "Toutes les créations";
  const colorLabel = PRODUCT_COLORS.find((c) => c.id === filters.color)?.label;
  const collectionLabel = collections.find((c) => c.slug === filters.collection)?.name;
  const active: { label: string; remove: Record<string, undefined> }[] = [
    ...(filters.q ? [{ label: `« ${filters.q} »`, remove: { q: undefined } }] : []),
    ...(filters.availableOnly ? [{ label: "Disponibles", remove: { dispo: undefined } }] : []),
    ...(colorLabel ? [{ label: colorLabel, remove: { couleur: undefined } }] : []),
    ...(collectionLabel ? [{ label: collectionLabel, remove: { collection: undefined } }] : []),
    ...(filters.minCents !== undefined || filters.maxCents !== undefined
      ? [
          {
            label: `${filters.minCents !== undefined ? `dès ${filters.minCents / 100} €` : ""}${filters.minCents !== undefined && filters.maxCents !== undefined ? " · " : ""}${filters.maxCents !== undefined ? `jusqu'à ${filters.maxCents / 100} €` : ""}`,
            remove: { "prix-min": undefined, "prix-max": undefined },
          },
        ]
      : []),
  ];
  const visibleCats = categories.filter((c) => c.productCount > 0);
  const filterOptions = {
    colors: PRODUCT_COLORS.filter((c) => facets.colors.includes(c.id)).map((c) => ({ id: c.id, label: c.label, hex: c.hex })),
    collections: collections.map((c) => ({ slug: c.slug, name: c.name })),
    hasSoldOut: facets.hasSoldOut,
    priceRange: facets.total > 3 && facets.maxCents - facets.minCents >= 1000,
  };
  const hasFilters = filterOptions.colors.length > 1 || filterOptions.collections.length > 0 || filterOptions.hasSoldOut || filterOptions.priceRange;

  return (
    <div className="container-page pt-5 pb-8 sm:pt-8">
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-text-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="no-underline hover:underline">
              Accueil
            </Link>
          </li>
          <ChevronRight size={14} aria-hidden="true" />
          {category ? (
            <>
              <li>
                <Link href="/boutique" className="no-underline hover:underline">
                  Boutique
                </Link>
              </li>
              <ChevronRight size={14} aria-hidden="true" />
              <li aria-current="page" className="text-text">
                {category.name}
              </li>
            </>
          ) : (
            <li aria-current="page" className="text-text">
              Boutique
            </li>
          )}
        </ol>
      </nav>

      <header className="mb-6">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {category?.description && !filters.q && <p className="mt-3 max-w-2xl text-text-2">{category.description}</p>}
      </header>

      {visibleCats.length > 1 && (
        <nav aria-label="Catégories" className="-mx-4 mb-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            <li>
              <Link href={hrefWith("/boutique", params, {})} className="chip" aria-current={!category ? "page" : undefined}>
                Tout
              </Link>
            </li>
            {visibleCats.map((c) => (
              <li key={c.slug}>
                <Link href={hrefWith(`/boutique/${c.slug}`, params, {})} className="chip" aria-current={category?.slug === c.slug ? "page" : undefined}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-text-2" aria-live="polite">
          {listing.total} création{listing.total > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && <FilterSheet base={base} options={filterOptions} current={{ dispo: filters.availableOnly, couleur: filters.color, collection: filters.collection, min: filters.minCents, max: filters.maxCents }} />}
          <SortSelect value={filters.sort ?? "selection"} />
        </div>
      </div>

      {active.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Filtres actifs">
          {active.map((a) => (
            <li key={a.label}>
              <Link href={hrefWith(base, params, a.remove)} className="chip bg-primary-light" aria-label={`Retirer le filtre ${a.label}`}>
                {a.label} <X size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
          {active.length > 1 && (
            <li>
              <Link href={base} className="chip border-transparent underline">
                Tout effacer
              </Link>
            </li>
          )}
        </ul>
      )}

      {listing.items.length ? (
        <>
          <ProductGrid products={listing.items} priorityCount={4} />
          {listing.hasMore && (
            <div className="mt-12 flex flex-col items-center gap-2">
              <p className="text-sm text-text-2">
                {listing.items.length} sur {listing.total}
              </p>
              <Link href={hrefWith(base, params, { page: String((filters.page ?? 1) + 1) })} scroll={false} className="btn btn-outline" rel="next">
                Voir plus de créations
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-14 text-center">
          <SearchX className="text-text-2" size={32} aria-hidden="true" />
          <p className="font-serif text-2xl">{filters.q ? "Aucune création ne correspond" : "Rien ici pour le moment"}</p>
          <p className="text-text-2">
            {filters.q ? "Essayez un autre mot (une couleur, une forme…) ou parcourez toute la boutique." : active.length ? "Essayez d'enlever un filtre." : "De nouvelles créations arrivent bientôt."}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {active.length > 0 && (
              <Link href={base} className="btn btn-outline btn-sm">
                Effacer les filtres
              </Link>
            )}
            <Link href="/boutique" className="btn btn-primary btn-sm">
              Voir toutes les créations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
