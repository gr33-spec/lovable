import "server-only";
import type { ImageRef } from "../image-ref";
import { normalizeText } from "../format";
import { query, queryOne, type Queryable } from "./db";
import { toImageRef, type ImageRow } from "./images";

// Lecture du catalogue PUBLIC : seuls les produits publiés de catégories
// visibles, et seulement les colonnes utiles à l'affichage.

export type Availability = "in_stock" | "low_stock" | "sold_out";

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents: number | null;
  availability: Availability;
  stock: number;
  isNew: boolean;
  categoryName: string;
  image: ImageRef | null;
  hoverImage: ImageRef | null;
}

export interface ProductDetail extends ProductCard {
  sku: string | null;
  description: string;
  images: ImageRef[];
  ogImageId: string | null;
  features: { label: string; value: string }[];
  colors: string[];
  category: { id: string; slug: string; name: string };
  collection: { slug: string; name: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string;
  updatedAt: string;
}

export interface CategoryLink {
  id: string;
  slug: string;
  name: string;
  description: string;
  productCount: number;
  cover: ImageRef | null;
}

export const PAGE_SIZE = 24;
const NEW_DAYS = 30;

export const SORTS = ["selection", "nouveautes", "prix-croissant", "prix-decroissant"] as const;
export type Sort = (typeof SORTS)[number];

export interface ListingFilters {
  category?: string;
  collection?: string;
  q?: string;
  color?: string;
  availableOnly?: boolean;
  minCents?: number;
  maxCents?: number;
  sort?: Sort;
  page?: number;
}

export function availabilityOf(stock: number, lowThreshold: number): Availability {
  if (stock <= 0) return "sold_out";
  if (lowThreshold > 0 && stock <= lowThreshold) return "low_stock";
  return "in_stock";
}

async function imagesFor(productIds: string[], client?: Queryable, perProduct = 2): Promise<Map<string, ImageRef[]>> {
  const map = new Map<string, ImageRef[]>();
  if (!productIds.length) return map;
  const rows = await query<ImageRow & { product_id: string; rn: number }>(
    `SELECT * FROM (
       SELECT id, product_id, width, height, widths, placeholder, alt,
              row_number() OVER (PARTITION BY product_id ORDER BY position, created_at) AS rn
       FROM image WHERE product_id = ANY($1::uuid[]) AND kind = 'product'
     ) t WHERE rn <= $2 ORDER BY product_id, rn`,
    [productIds, perProduct],
    client,
  );
  for (const r of rows) {
    const list = map.get(r.product_id) ?? [];
    list.push(toImageRef(r));
    map.set(r.product_id, list);
  }
  return map;
}

interface CardRow {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  compare_at_cents: number | null;
  stock: number;
  published_at: string | Date;
  category_name: string;
}

function toCard(r: CardRow, imgs: ImageRef[] | undefined, lowThreshold: number): ProductCard {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    priceCents: r.price_cents,
    compareAtCents: r.compare_at_cents,
    stock: r.stock,
    availability: availabilityOf(r.stock, lowThreshold),
    isNew: Date.now() - new Date(r.published_at).getTime() < NEW_DAYS * 86_400_000,
    categoryName: r.category_name,
    image: imgs?.[0] ?? null,
    hoverImage: imgs?.[1] ?? null,
  };
}

/** Échappe les caractères spéciaux de LIKE. */
function likeToken(token: string): string {
  return `%${token.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function searchTokens(q: string | undefined): string[] {
  if (!q) return [];
  return normalizeText(q.slice(0, 80))
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}

export async function listProducts(filters: ListingFilters, lowThreshold: number, client?: Queryable): Promise<{ items: ProductCard[]; total: number; hasMore: boolean }> {
  const where = ["p.status = 'published'", "c.is_visible"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (filters.category) add("c.slug = ?", filters.category);
  if (filters.collection) add("col.slug = ? AND col.is_visible", filters.collection);
  if (filters.color) add("? = ANY(p.colors)", filters.color);
  if (filters.availableOnly) where.push("p.stock > 0");
  if (filters.minCents !== undefined) add("p.price_cents >= ?", filters.minCents);
  if (filters.maxCents !== undefined) add("p.price_cents <= ?", filters.maxCents);
  for (const token of searchTokens(filters.q)) {
    add(`(p.search_text || ' ' || norm(c.name) || ' ' || norm(coalesce(col.name, '')) || ' ' || lower(coalesce(p.sku, ''))) LIKE ?`, likeToken(token));
  }
  const order: Record<Sort, string> = {
    selection: "(p.stock = 0), p.position, p.published_at DESC",
    nouveautes: "p.published_at DESC",
    "prix-croissant": "(p.stock = 0), p.price_cents, p.published_at DESC",
    "prix-decroissant": "(p.stock = 0), p.price_cents DESC, p.published_at DESC",
  };
  const page = Math.min(Math.max(1, filters.page ?? 1), 50);
  const limit = page * PAGE_SIZE;
  const rows = await query<CardRow & { total: string }>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, c.name AS category_name,
            count(*) OVER () AS total
     FROM product p
     JOIN category c ON c.id = p.category_id
     LEFT JOIN collection col ON col.id = p.collection_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${order[filters.sort ?? "selection"]}, p.id
     LIMIT ${limit}`,
    params,
    client,
  );
  const imgs = await imagesFor(rows.map((r) => r.id), client);
  const total = rows.length ? Number(rows[0].total) : 0;
  return { items: rows.map((r) => toCard(r, imgs.get(r.id), lowThreshold)), total, hasMore: total > rows.length };
}

export async function listCategories(client?: Queryable): Promise<CategoryLink[]> {
  const rows = await query<{ id: string; slug: string; name: string; description: string; product_count: string; cover_id: string | null }>(
    `SELECT c.id, c.slug, c.name, c.description,
            (SELECT count(*) FROM product p WHERE p.category_id = c.id AND p.status = 'published') AS product_count,
            (SELECT i.id FROM product p JOIN image i ON i.product_id = p.id AND i.kind = 'product'
              WHERE p.category_id = c.id AND p.status = 'published'
              ORDER BY (p.stock = 0), p.position, p.published_at DESC, i.position LIMIT 1) AS cover_id
     FROM category c WHERE c.is_visible ORDER BY c.position, c.name`,
    [],
    client,
  );
  const coverIds = rows.map((r) => r.cover_id).filter(Boolean) as string[];
  const covers = coverIds.length
    ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt FROM image WHERE id = ANY($1::uuid[])", [coverIds], client)
    : [];
  return rows.map((r) => {
    const cover = covers.find((c) => c.id === r.cover_id);
    return { id: r.id, slug: r.slug, name: r.name, description: r.description, productCount: Number(r.product_count), cover: cover ? toImageRef(cover) : null };
  });
}

export async function listCollections(client?: Queryable): Promise<{ slug: string; name: string; description: string }[]> {
  return query(
    `SELECT col.slug, col.name, col.description FROM collection col
     WHERE col.is_visible AND EXISTS (SELECT 1 FROM product p WHERE p.collection_id = col.id AND p.status = 'published')
     ORDER BY col.position, col.name`,
    [],
    client,
  );
}

/** Valeurs réellement présentes dans le catalogue : on ne propose jamais un filtre vide. */
export async function catalogFacets(category: string | undefined, client?: Queryable) {
  const row = await queryOne<{ colors: string[] | null; min: number | null; max: number | null; sold_out: string; total: string }>(
    `SELECT array(SELECT DISTINCT unnest(p2.colors) FROM product p2 JOIN category c2 ON c2.id = p2.category_id
                  WHERE p2.status = 'published' AND c2.is_visible AND ($1::text IS NULL OR c2.slug = $1)) AS colors,
            min(p.price_cents) AS min, max(p.price_cents) AS max,
            count(*) FILTER (WHERE p.stock = 0) AS sold_out, count(*) AS total
     FROM product p JOIN category c ON c.id = p.category_id
     WHERE p.status = 'published' AND c.is_visible AND ($1::text IS NULL OR c.slug = $1)`,
    [category ?? null],
    client,
  );
  return {
    colors: row?.colors ?? [],
    minCents: row?.min ?? 0,
    maxCents: row?.max ?? 0,
    hasSoldOut: Number(row?.sold_out ?? 0) > 0,
    total: Number(row?.total ?? 0),
  };
}

export type ProductLookup =
  | { kind: "found"; product: ProductDetail }
  | { kind: "redirect"; slug: string }
  | { kind: "unavailable"; name: string; categorySlug: string; categoryName: string }
  | { kind: "missing" };

export async function findProduct(slug: string, lowThreshold: number, client?: Queryable): Promise<ProductLookup> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return { kind: "missing" };
  const row = await queryOne<
    CardRow & {
      sku: string | null;
      description: string;
      features: { label: string; value: string }[];
      colors: string[];
      status: string;
      category_id: string;
      category_slug: string;
      category_visible: boolean;
      collection_slug: string | null;
      collection_name: string | null;
      seo_title: string | null;
      seo_description: string | null;
      updated_at: string | Date;
    }
  >(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, p.updated_at, p.sku, p.description,
            p.features, p.colors, p.status, p.seo_title, p.seo_description,
            c.id AS category_id, c.slug AS category_slug, c.name AS category_name, c.is_visible AS category_visible,
            col.slug AS collection_slug, col.name AS collection_name
     FROM product p JOIN category c ON c.id = p.category_id LEFT JOIN collection col ON col.id = p.collection_id AND col.is_visible
     WHERE p.slug = $1`,
    [slug],
    client,
  );
  if (!row) {
    const redirect = await queryOne<{ slug: string }>(
      "SELECT p.slug FROM product_slug_redirect r JOIN product p ON p.id = r.product_id WHERE r.old_slug = $1",
      [slug],
      client,
    );
    return redirect ? { kind: "redirect", slug: redirect.slug } : { kind: "missing" };
  }
  if (row.status !== "published" || !row.category_visible) {
    // Produit archivé ou retiré : page « plus disponible » avec suggestions (jamais d'erreur).
    return row.status === "draft" ? { kind: "missing" } : { kind: "unavailable", name: row.name, categorySlug: row.category_slug, categoryName: row.category_name };
  }
  const images = (await imagesFor([row.id], client, 12)).get(row.id) ?? [];
  const card = toCard(row, images, lowThreshold);
  return {
    kind: "found",
    product: {
      ...card,
      sku: row.sku,
      description: row.description,
      images,
      ogImageId: images[0]?.id ?? null,
      features: Array.isArray(row.features) ? row.features : [],
      colors: row.colors,
      category: { id: row.category_id, slug: row.category_slug, name: row.category_name },
      collection: row.collection_slug ? { slug: row.collection_slug, name: row.collection_name ?? "" } : null,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      publishedAt: new Date(row.published_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
  };
}

/** Quelques créations proches (même catégorie, disponibles d'abord). */
export async function relatedProducts(productId: string, categorySlug: string, lowThreshold: number, limit = 4, client?: Queryable): Promise<ProductCard[]> {
  const rows = await query<CardRow>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, c.name AS category_name
     FROM product p JOIN category c ON c.id = p.category_id
     WHERE p.status = 'published' AND c.is_visible AND c.slug = $1 AND p.id <> $2
     ORDER BY (p.stock = 0), random() LIMIT $3`,
    [categorySlug, productId, limit],
    client,
  );
  const imgs = await imagesFor(rows.map((r) => r.id), client);
  return rows.map((r) => toCard(r, imgs.get(r.id), lowThreshold));
}

/** Informations actuelles des produits du panier (prix et stock réels). */
export async function cartProducts(ids: string[], lowThreshold: number, client?: Queryable): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const rows = await query<CardRow & { status: string; category_visible: boolean }>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, p.status,
            c.name AS category_name, c.is_visible AS category_visible
     FROM product p JOIN category c ON c.id = p.category_id WHERE p.id = ANY($1::uuid[])`,
    [ids],
    client,
  );
  const imgs = await imagesFor(rows.map((r) => r.id), client, 1);
  return rows.map((r) => {
    const card = toCard(r, imgs.get(r.id), lowThreshold);
    // Produit retiré de la vente : traité comme indisponible.
    return r.status === "published" && r.category_visible ? card : { ...card, stock: 0, availability: "sold_out" as const };
  });
}

export async function sitemapEntries(client?: Queryable) {
  const products = await query<{ slug: string; updated_at: Date }>(
    `SELECT p.slug, p.updated_at FROM product p JOIN category c ON c.id = p.category_id
     WHERE p.status = 'published' AND c.is_visible ORDER BY p.published_at DESC LIMIT 5000`,
    [],
    client,
  );
  const categories = await query<{ slug: string; updated_at: Date }>("SELECT slug, updated_at FROM category WHERE is_visible", [], client);
  return { products, categories };
}
