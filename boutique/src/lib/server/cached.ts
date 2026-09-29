import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { bestSellers, catalogFacets, findProduct, listCategories, listCollections, listProducts, relatedProducts, type ListingFilters } from "./catalog";
import { query } from "./db";
import { loadSettings } from "./settings";

// Lectures publiques mises en cache (partagé entre visiteurs) et invalidées
// dès qu'une donnée change : une modification de la créatrice ou une vente
// se voit immédiatement, sans interroger la base à chaque visite.

const CATALOG = "catalog";
const SETTINGS = "settings";

export const getSettings = cache(unstable_cache(() => loadSettings(), ["settings-v1"], { tags: [SETTINGS], revalidate: 3600 }));

export const getCategories = unstable_cache(() => listCategories(), ["categories-v1"], { tags: [CATALOG], revalidate: 3600 });

export const getCollections = unstable_cache(() => listCollections(), ["collections-v1"], { tags: [CATALOG], revalidate: 3600 });

export const getListing = unstable_cache((filters: ListingFilters, low: number) => listProducts(filters, low), ["listing-v1"], {
  tags: [CATALOG],
  revalidate: 3600,
});

export const getFacets = unstable_cache((category: string | undefined) => catalogFacets(category), ["facets-v1"], { tags: [CATALOG], revalidate: 3600 });

export const getProduct = cache(
  unstable_cache((slug: string, low: number) => findProduct(slug, low), ["product-v1"], { tags: [CATALOG], revalidate: 3600 }),
);

export const getRelated = unstable_cache((id: string, category: string, low: number) => relatedProducts(id, category, low), ["related-v1"], {
  tags: [CATALOG],
  revalidate: 3600,
});

export const getBestSellers = unstable_cache((low: number) => bestSellers(low), ["best-v1"], { tags: [CATALOG], revalidate: 3600 });

export const getLegalPage = unstable_cache(
  async (slug: string) => (await query<{ title: string; body: string; updated_at: string }>("SELECT title, body, updated_at FROM legal_page WHERE slug = $1", [slug]))[0] ?? null,
  ["legal-v1"],
  { tags: [SETTINGS], revalidate: 3600 },
);

export function invalidateCatalog() {
  revalidateTag(CATALOG, { expire: 0 });
}

export function invalidateSettings() {
  revalidateTag(SETTINGS, { expire: 0 });
  revalidateTag(CATALOG, { expire: 0 });
}
