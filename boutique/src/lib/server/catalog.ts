import "server-only";
import type { ImageRef } from "../image-ref";
import { normalizeText } from "../format";
import { query, queryOne, type Queryable } from "./db";
import { toImageRef, type ImageRow } from "./images";

// Lecture du catalogue PUBLIC : seuls les produits publiés de catégories
// visibles, et seulement les colonnes utiles à l'affichage.

export type Availability = "in_stock" | "low_stock" | "reserved" | "sold_out";

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
  category: { id: string; slug: string; name: string; path: string };
  categoryTrail: { name: string; path: string }[];
  collection: { slug: string; name: string } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string;
  updatedAt: string;
}

export interface CategoryLink {
  id: string;
  parentId: string | null;
  slug: string;
  /** Adresse complète sous /boutique : « pampilles/coeurs ». */
  path: string;
  name: string;
  description: string;
  depth: number;
  /** Catégories parentes, de la plus haute à la plus proche. */
  trail: { name: string; path: string }[];
  /** Produits publiés ici et dans les sous-catégories. */
  productCount: number;
  cover: ImageRef | null;
}

export const PAGE_SIZE = 24;
const NEW_DAYS = 30;

export const SORTS = ["selection", "nouveautes", "prix-croissant", "prix-decroissant"] as const;
export type Sort = (typeof SORTS)[number];

export interface ListingFilters {
  /** Adresse de la catégorie (« pampilles/coeurs ») : ses sous-catégories sont incluses. */
  category?: string;
  /** Caractéristiques : { motif: "mariniere" } (formes « adresse » du nom et de la valeur). */
  attributes?: Record<string, string>;
  collection?: string;
  q?: string;
  color?: string;
  availableOnly?: boolean;
  minCents?: number;
  maxCents?: number;
  sort?: Sort;
  page?: number;
}

export function availabilityOf(stock: number, lowThreshold: number, reserved = false): Availability {
  if (stock <= 0) return reserved ? "reserved" : "sold_out";
  if (lowThreshold > 0 && stock <= lowThreshold) return "low_stock";
  return "in_stock";
}

async function imagesFor(productIds: string[], client?: Queryable, perProduct = 2): Promise<Map<string, ImageRef[]>> {
  const map = new Map<string, ImageRef[]>();
  if (!productIds.length) return map;
  const rows = await query<ImageRow & { product_id: string; rn: number }>(
    `SELECT * FROM (
       SELECT id, product_id, width, height, widths, placeholder, alt, base_url,
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
  reserved?: boolean;
}

// Pièce bloquée par une réservation en attente de confirmation.
const RESERVED = "EXISTS (SELECT 1 FROM reservation rv WHERE rv.product_id = p.id AND rv.status = 'pending') AS reserved";

function toCard(r: CardRow, imgs: ImageRef[] | undefined, lowThreshold: number): ProductCard {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    priceCents: r.price_cents,
    compareAtCents: r.compare_at_cents,
    stock: r.stock,
    availability: availabilityOf(r.stock, lowThreshold, r.reserved),
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
  const where = ["p.status = 'published'"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (filters.category) {
    params.push(filters.category, `${filters.category}/%`);
    where.push(`(c.path = $${params.length - 1} OR c.path LIKE $${params.length})`);
  }
  for (const [key, value] of Object.entries(filters.attributes ?? {}).slice(0, 4)) {
    params.push(key, value);
    where.push(`EXISTS (SELECT 1 FROM jsonb_array_elements(p.features) f WHERE slugish(f->>'label') = $${params.length - 1} AND slugish(f->>'value') = $${params.length})`);
  }
  if (filters.collection) add("col.slug = ? AND col.is_visible", filters.collection);
  if (filters.color) add("? = ANY(p.colors)", filters.color);
  if (filters.availableOnly) where.push("p.stock > 0");
  if (filters.minCents !== undefined) add("p.price_cents >= ?", filters.minCents);
  if (filters.maxCents !== undefined) add("p.price_cents <= ?", filters.maxCents);
  for (const token of searchTokens(filters.q)) {
    add(`(p.search_text || ' ' || norm(array_to_string(c.names, ' ')) || ' ' || norm(coalesce(col.name, '')) || ' ' || lower(coalesce(p.sku, ''))) LIKE ?`, likeToken(token));
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
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, ${RESERVED}, c.name AS category_name,
            count(*) OVER () AS total
     FROM product p
     JOIN shop_category c ON c.id = p.category_id
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

/** Catégories publiques (visibles, non archivées, parents compris), dans l'ordre de l'arbre. */
export async function listCategories(client?: Queryable): Promise<CategoryLink[]> {
  const rows = await query<{
    id: string;
    parent_id: string | null;
    slug: string;
    path: string;
    name: string;
    description: string;
    depth: number;
    names: string[];
    position: number;
    product_count: string;
    cover_id: string | null;
  }>(
    `WITH sc AS MATERIALIZED (SELECT * FROM shop_category),
          pp AS MATERIALIZED (SELECT p.id, p.stock, p.position, p.published_at, d.ancestors
                              FROM product p JOIN sc d ON d.id = p.category_id WHERE p.status = 'published')
     SELECT sc.id, sc.parent_id, sc.slug, sc.path, sc.name, sc.description, sc.depth, sc.names, sc.position,
            (SELECT count(*) FROM pp WHERE sc.id = ANY(pp.ancestors)) AS product_count,
            (SELECT i.id FROM pp JOIN image i ON i.product_id = pp.id AND i.kind = 'product'
              WHERE sc.id = ANY(pp.ancestors)
              ORDER BY (pp.stock = 0), pp.position, pp.published_at DESC, i.position LIMIT 1) AS cover_id
     FROM sc`,
    [],
    client,
  );
  const coverIds = rows.map((r) => r.cover_id).filter(Boolean) as string[];
  const covers = coverIds.length
    ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE id = ANY($1::uuid[])", [coverIds], client)
    : [];
  const out: CategoryLink[] = [];
  const byParent = (parentId: string | null) =>
    rows.filter((r) => r.parent_id === parentId).sort((x, y) => x.position - y.position || x.name.localeCompare(y.name, "fr"));
  const visit = (r: (typeof rows)[number]) => {
    const cover = covers.find((c) => c.id === r.cover_id);
    const segments = r.path.split("/");
    out.push({
      id: r.id,
      parentId: r.parent_id,
      slug: r.slug,
      path: r.path,
      name: r.name,
      description: r.description,
      depth: r.depth,
      trail: r.names.slice(0, -1).map((name, i) => ({ name, path: segments.slice(0, i + 1).join("/") })),
      productCount: Number(r.product_count),
      cover: cover ? toImageRef(cover) : null,
    });
    for (const child of byParent(r.id)) visit(child);
  };
  for (const root of byParent(null)) visit(root);
  return out;
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

// Paramètres d'adresse déjà utilisés : une caractéristique ne peut pas les porter.
const RESERVED_KEYS = new Set(["q", "tri", "dispo", "couleur", "couleurs", "collection", "prix-min", "prix-max", "page"]);

export interface AttributeFacet {
  key: string;
  label: string;
  values: { key: string; label: string; count: number }[];
}

/** Valeurs réellement présentes dans le catalogue : on ne propose jamais un filtre vide. */
export async function catalogFacets(category: string | undefined, client?: Queryable) {
  const scope = "p.status = 'published' AND ($1::text IS NULL OR c.path = $1 OR c.path LIKE $1 || '/%')";
  const row = await queryOne<{ colors: string[] | null; min: number | null; max: number | null; sold_out: string; total: string }>(
    `WITH s AS (SELECT p.colors, p.price_cents, p.stock FROM product p JOIN shop_category c ON c.id = p.category_id WHERE ${scope})
     SELECT array(SELECT DISTINCT unnest(s.colors) FROM s) AS colors, min(price_cents) AS min, max(price_cents) AS max,
            count(*) FILTER (WHERE stock = 0) AS sold_out, count(*) AS total
     FROM s`,
    [category ?? null],
    client,
  );
  // Caractéristiques saisies sur les fiches (motif, matière, taille…) : une
  // caractéristique devient un filtre quand elle a de 2 à 15 valeurs et qu'au
  // moins une valeur est partagée (sinon filtrer n'aurait pas de sens, ex. dimensions).
  const attrs = await query<{ lkey: string; vkey: string; label: string; value: string; n: string }>(
    `SELECT slugish(f->>'label') AS lkey, slugish(f->>'value') AS vkey,
            mode() WITHIN GROUP (ORDER BY btrim(f->>'label')) AS label, mode() WITHIN GROUP (ORDER BY btrim(f->>'value')) AS value,
            count(DISTINCT p.id) AS n
     FROM product p JOIN shop_category c ON c.id = p.category_id, jsonb_array_elements(p.features) f
     WHERE ${scope} AND slugish(f->>'label') <> '' AND slugish(f->>'value') <> ''
     GROUP BY 1, 2`,
    [category ?? null],
    client,
  );
  const grouped = new Map<string, AttributeFacet>();
  for (const a of attrs) {
    if (RESERVED_KEYS.has(a.lkey) || a.lkey.length > 40 || a.vkey.length > 80) continue;
    const facet = grouped.get(a.lkey) ?? { key: a.lkey, label: a.label, values: [] };
    facet.values.push({ key: a.vkey, label: a.value, count: Number(a.n) });
    grouped.set(a.lkey, facet);
  }
  const attributes = [...grouped.values()]
    .filter((f) => f.values.length >= 2 && f.values.length <= 15 && f.values.some((v) => v.count >= 2))
    .map((f) => ({ ...f, values: f.values.sort((x, y) => x.label.localeCompare(y.label, "fr")) }))
    .sort((x, y) => x.label.localeCompare(y.label, "fr"));
  return {
    colors: row?.colors ?? [],
    minCents: row?.min ?? 0,
    maxCents: row?.max ?? 0,
    hasSoldOut: Number(row?.sold_out ?? 0) > 0,
    total: Number(row?.total ?? 0),
    attributes,
  };
}

/** Forme « adresse » d'un paramètre de caractéristique, ou null s'il n'en est pas un. */
export function isAttributeKey(key: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(key) && key.length <= 40 && !RESERVED_KEYS.has(key);
}

export type ProductLookup =
  | { kind: "found"; product: ProductDetail }
  | { kind: "redirect"; slug: string }
  | { kind: "unavailable"; name: string; categoryPath: string | null; categoryName: string }
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
      category_path: string | null;
      category_names: string[] | null;
      collection_slug: string | null;
      collection_name: string | null;
      seo_title: string | null;
      seo_description: string | null;
      updated_at: string | Date;
    }
  >(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, ${RESERVED}, p.updated_at, p.sku, p.description,
            p.features, p.colors, p.status, p.seo_title, p.seo_description,
            c.id AS category_id, c.slug AS category_slug, c.name AS category_name, sc.path AS category_path, sc.names AS category_names,
            col.slug AS collection_slug, col.name AS collection_name
     FROM product p JOIN category c ON c.id = p.category_id LEFT JOIN shop_category sc ON sc.id = p.category_id
     LEFT JOIN collection col ON col.id = p.collection_id AND col.is_visible
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
  if (row.status !== "published" || !row.category_path) {
    // Produit archivé ou retiré (catégorie masquée) : page « plus disponible » avec suggestions (jamais d'erreur).
    if (row.status === "draft") return { kind: "missing" };
    const parent = row.category_path ? null : await queryOne<{ path: string; name: string }>(
      "SELECT path, name FROM shop_category WHERE id = (SELECT parent_id FROM category WHERE id = $1)",
      [row.category_id],
      client,
    );
    return { kind: "unavailable", name: row.name, categoryPath: row.category_path ?? parent?.path ?? null, categoryName: row.category_path ? row.category_name : (parent?.name ?? "créations") };
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
      category: { id: row.category_id, slug: row.category_slug, name: row.category_name, path: row.category_path },
      categoryTrail: (row.category_names ?? []).slice(0, -1).map((name, i) => ({ name, path: row.category_path!.split("/").slice(0, i + 1).join("/") })),
      collection: row.collection_slug ? { slug: row.collection_slug, name: row.collection_name ?? "" } : null,
      seoTitle: row.seo_title,
      seoDescription: row.seo_description,
      publishedAt: new Date(row.published_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    },
  };
}

/** Quelques créations proches (même sous-catégorie d'abord, puis même famille ; disponibles d'abord). */
export async function relatedProducts(productId: string, categoryPath: string, lowThreshold: number, limit = 4, client?: Queryable): Promise<ProductCard[]> {
  const rows = await query<CardRow>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, ${RESERVED}, c.name AS category_name
     FROM product p JOIN shop_category c ON c.id = p.category_id
     WHERE p.status = 'published' AND split_part(c.path, '/', 1) = split_part($1, '/', 1) AND p.id <> $2
     ORDER BY (p.stock = 0), (c.path = $1) DESC, random() LIMIT $3`,
    [categoryPath, productId, limit],
    client,
  );
  const imgs = await imagesFor(rows.map((r) => r.id), client);
  return rows.map((r) => toCard(r, imgs.get(r.id), lowThreshold));
}

/** Informations actuelles des produits du panier (prix et stock réels). */
export async function cartProducts(ids: string[], lowThreshold: number, client?: Queryable): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const rows = await query<CardRow & { status: string; category_visible: boolean }>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, ${RESERVED}, p.status,
            c.name AS category_name, (sc.id IS NOT NULL) AS category_visible
     FROM product p JOIN category c ON c.id = p.category_id LEFT JOIN shop_category sc ON sc.id = p.category_id WHERE p.id = ANY($1::uuid[])`,
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
    `SELECT p.slug, p.updated_at FROM product p JOIN shop_category c ON c.id = p.category_id
     WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT 5000`,
    [],
    client,
  );
  // Seules les catégories qui contiennent des créations (jamais de page vide dans le plan du site).
  const categories = await query<{ path: string; updated_at: Date }>(
    `WITH sc AS MATERIALIZED (SELECT * FROM shop_category)
     SELECT sc.path, sc.updated_at FROM sc
     WHERE EXISTS (SELECT 1 FROM product p JOIN sc d ON d.id = p.category_id WHERE p.status = 'published' AND sc.id = ANY(d.ancestors))`,
    [],
    client,
  );
  return { products, categories };
}

/** Meilleures ventes des 90 derniers jours (affichées seulement s'il y a assez de ventes pour que ce soit vrai). */
export async function bestSellers(lowThreshold: number, limit = 4, client?: Queryable): Promise<ProductCard[]> {
  const rows = await query<CardRow>(
    `SELECT p.id, p.slug, p.name, p.price_cents, p.compare_at_cents, p.stock, p.published_at, ${RESERVED}, c.name AS category_name
     FROM product p JOIN shop_category c ON c.id = p.category_id
     JOIN (SELECT i.product_id, sum(i.quantity) AS sold FROM order_item i JOIN customer_order o ON o.id = i.order_id
           WHERE o.status IN ('paid', 'preparing', 'shipped', 'completed') AND o.paid_at > now() - interval '90 days'
           GROUP BY i.product_id HAVING sum(i.quantity) >= 2) s ON s.product_id = p.id
     WHERE p.status = 'published' AND p.stock > 0
     ORDER BY s.sold DESC, p.published_at DESC LIMIT $1`,
    [limit],
    client,
  );
  if (rows.length < limit) return [];
  const imgs = await imagesFor(rows.map((r) => r.id), client);
  return rows.map((r) => toCard(r, imgs.get(r.id), lowThreshold));
}
