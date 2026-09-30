import "server-only";
import { randomUUID } from "node:crypto";
import { slugify } from "../format";
import { categoryInputSchema, fieldErrors, productInputSchema, shippingInputSchema, type ProductInput } from "../validation";
import { isUniqueViolation, query, queryOne, transaction, type Queryable } from "./db";
import { deleteImageFiles, ImageRejectedError, processImage, storeVariants, toImageRef, type ImageRow } from "./images";
import { audit, errorMessage, reportEvent } from "./monitoring";

// Écritures du catalogue par la créatrice (produits, photos, stock,
// catégories, livraison). Validation serveur systématique.

export type SaveResult =
  | { ok: true; id: string; slug: string; version: number; notice?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; currentStock?: number };

async function uniqueSlug(c: Queryable, table: "product" | "category" | "collection", base: string, selfId: string | null): Promise<string> {
  const root = base || "creation";
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root.slice(0, 110)}-${n}`;
    const taken = await queryOne(`SELECT 1 FROM ${table} WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2)`, [candidate, selfId], c);
    const redirected = table === "product" ? await queryOne("SELECT 1 FROM product_slug_redirect WHERE old_slug = $1 AND product_id <> $2", [candidate, selfId ?? randomUUID()], c) : null;
    if (!taken && !redirected) return candidate;
  }
  return `${root.slice(0, 100)}-${randomUUID().slice(0, 6)}`;
}

export async function saveProduct(raw: unknown, adminId: string): Promise<SaveResult> {
  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error) };
  const p: ProductInput = parsed.data;
  try {
    const result = await transaction(async (c): Promise<SaveResult & { removedImages?: { id: string; widths: number[] }[] }> => {
      const existing = await queryOne<{ slug: string; status: string; version: number; price_cents: number; stock: number; published_at: Date | null }>(
        "SELECT slug, status, version, price_cents, stock, published_at FROM product WHERE id = $1 FOR UPDATE",
        [p.id],
        c,
      );
      if (existing && existing.version !== p.version) {
        return { ok: false as const, error: "Cette fiche a été modifiée entre-temps (autre onglet ou appareil). Rechargez la page pour voir la dernière version." };
      }
      if (!existing && p.version !== 0) return { ok: false as const, error: "Ce produit n'existe plus." };
      const category = await queryOne("SELECT 1 FROM category WHERE id = $1", [p.categoryId], c);
      if (!category) return { ok: false as const, error: "Catégorie introuvable.", fieldErrors: { categoryId: "Choisissez une catégorie" } };
      if (p.collectionId && !(await queryOne("SELECT 1 FROM collection WHERE id = $1", [p.collectionId], c))) {
        return { ok: false as const, error: "Collection introuvable.", fieldErrors: { collectionId: "Collection introuvable" } };
      }

      // Stock : une vente a pu avoir lieu depuis l'ouverture de la fiche. On ne l'écrase jamais en silence.
      let stock = p.stock;
      if (existing) {
        if (p.stock === p.originalStock) stock = existing.stock;
        else if (existing.stock !== p.originalStock) {
          return {
            ok: false as const,
            error: `Une vente a eu lieu pendant la modification : le stock est maintenant de ${existing.stock}. Vérifiez la quantité puis enregistrez à nouveau.`,
            fieldErrors: { stock: `Stock actuel : ${existing.stock}` },
            currentStock: existing.stock,
          };
        }
      }

      const wanted = p.slug || (existing ? existing.slug : slugify(p.name));
      const slug = await uniqueSlug(c, "product", wanted, p.id);
      const publishedAt = p.status === "published" ? (existing?.published_at ?? new Date()) : (existing?.published_at ?? null);
      const values = [
        p.id,
        slug,
        p.sku || null,
        p.name,
        p.description,
        p.categoryId,
        p.collectionId,
        p.priceCents,
        p.compareAtCents,
        stock,
        p.status,
        p.colors,
        p.tags,
        JSON.stringify(p.features),
        p.seoTitle || null,
        p.seoDescription || null,
        publishedAt,
      ];
      let version: number;
      if (existing) {
        const row = await queryOne<{ version: number }>(
          `UPDATE product SET slug=$2, sku=$3, name=$4, description=$5, category_id=$6, collection_id=$7, price_cents=$8, compare_at_cents=$9,
             stock=$10, status=$11, colors=$12, tags=$13, features=$14, seo_title=$15, seo_description=$16, published_at=$17, version = version + 1
           WHERE id = $1 RETURNING version`,
          values,
          c,
        );
        version = row!.version;
        if (stock !== existing.stock) {
          await query("INSERT INTO stock_movement (product_id, delta, stock_after, reason, admin_id) VALUES ($1, $2, $3, 'admin', $4)", [p.id, stock - existing.stock, stock, adminId], c);
        }
        if (existing.slug !== slug) {
          // L'ancienne adresse (déjà partagée sur Facebook…) redirige vers la nouvelle.
          if (existing.status !== "draft") {
            await query(
              "INSERT INTO product_slug_redirect (old_slug, product_id) VALUES ($1, $2) ON CONFLICT (old_slug) DO UPDATE SET product_id = EXCLUDED.product_id",
              [existing.slug, p.id],
              c,
            );
          }
          await query("DELETE FROM product_slug_redirect WHERE old_slug = $1", [slug], c);
        }
      } else {
        const position = await queryOne<{ min: number | null }>("SELECT min(position) AS min FROM product", [], c);
        await query(
          `INSERT INTO product (id, slug, sku, name, description, category_id, collection_id, price_cents, compare_at_cents, stock, status,
             colors, tags, features, seo_title, seo_description, published_at, position)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [...values, (position?.min ?? 1) - 1],
          c,
        );
        version = 1;
      }

      // Photos : rattachement, ordre (la première est la principale), textes alternatifs.
      const current = await query<{ id: string; widths: number[] }>("SELECT id, widths FROM image WHERE product_id = $1 AND kind = 'product'", [p.id], c);
      if (p.imageIds.length) {
        const usable = await query<{ id: string }>(
          `SELECT id FROM image WHERE id = ANY($1::uuid[]) AND kind = 'product' AND (product_id = $2 OR product_id IS NULL)`,
          [p.imageIds, p.id],
          c,
        );
        if (usable.length !== new Set(p.imageIds).size) return { ok: false as const, error: "Une photo est introuvable : rechargez la page et réessayez." };
      }
      for (const [index, imageId] of p.imageIds.entries()) {
        await query("UPDATE image SET product_id = $2, position = $3, alt = $4 WHERE id = $1", [imageId, p.id, index, p.imageAlts[imageId] ?? ""], c);
      }
      const removed = current.filter((img) => !p.imageIds.includes(img.id));
      const removedFiles: { id: string; widths: number[] }[] = [];
      for (const img of removed) {
        const inOrders = await queryOne("SELECT 1 FROM order_item WHERE image_id = $1 LIMIT 1", [img.id], c);
        if (inOrders) {
          // Photo visible dans d'anciennes commandes : conservée hors du produit.
          await query("UPDATE image SET product_id = NULL, kind = 'order' WHERE id = $1", [img.id], c);
        } else {
          await query("DELETE FROM image WHERE id = $1", [img.id], c);
          removedFiles.push(img);
        }
      }

      const changes: Record<string, unknown> = { status: p.status };
      if (existing && existing.price_cents !== p.priceCents) {
        changes.oldPrice = existing.price_cents;
        changes.newPrice = p.priceCents;
      }
      await audit(adminId, existing ? "product_updated" : "product_created", "product", p.id, changes, "", c);
      const notice =
        p.status === "published" && p.imageIds.length === 0
          ? "Publié sans photo : ajoutez-en au moins une pour mettre la création en valeur."
          : slug !== wanted
            ? `L'adresse « ${wanted} » était déjà prise : « ${slug} » a été utilisée.`
            : undefined;
      return { ok: true as const, id: p.id, slug, version, notice, removedImages: removedFiles };
    });
    if (result.ok && result.removedImages?.length) {
      for (const img of result.removedImages) await deleteImageFiles(img.id, img.widths).catch(() => undefined);
    }
    if (result.ok) return { ok: true, id: result.id, slug: result.slug, version: result.version, notice: result.notice };
    return result;
  } catch (err) {
    if (isUniqueViolation(err, "product_sku_key")) return { ok: false, error: "Cette référence est déjà utilisée.", fieldErrors: { sku: "Référence déjà utilisée par un autre produit" } };
    throw err;
  }
}

/** Import d'une photo : traitement, stockage, enregistrement (non rattachée tant que la fiche n'est pas enregistrée). */
export async function uploadImage(file: Buffer, kind: "product" | "brand", adminId: string) {
  const id = randomUUID();
  let processed;
  try {
    processed = await processImage(file, id, kind);
  } catch (err) {
    if (err instanceof ImageRejectedError) return { ok: false as const, error: err.message };
    await reportEvent("warning", "upload", "Photo non traitée", { error: errorMessage(err) });
    return { ok: false as const, error: "Cette photo n'a pas pu être traitée. Essayez une autre photo." };
  }
  let baseUrl: string;
  try {
    baseUrl = await storeVariants(processed);
  } catch (err) {
    const reason = errorMessage(err);
    await reportEvent("error", "upload", "Stockage des photos indisponible", { error: reason });
    return { ok: false as const, error: `La photo n'a pas pu être enregistrée (stockage des photos : ${reason.slice(0, 160)}).` };
  }
  const row = await queryOne<ImageRow>(
    `INSERT INTO image (id, kind, width, height, widths, placeholder, content_hash, bytes, base_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, width, height, widths, placeholder, alt, base_url`,
    [id, kind, processed.width, processed.height, processed.widths, processed.placeholder, processed.contentHash, processed.bytes, baseUrl],
  );
  await audit(adminId, "image_uploaded", "image", id, { kind, bytes: processed.bytes });
  return { ok: true as const, image: toImageRef(row!), contentHash: processed.contentHash };
}

/** Modification rapide du stock depuis la liste. `expected` évite d'écraser une vente survenue entre-temps. */
export async function setStock(productId: string, next: number, expected: number, adminId: string): Promise<{ ok: true; stock: number } | { ok: false; error: string; stock?: number }> {
  if (!Number.isInteger(next) || next < 0 || next > 100_000) return { ok: false, error: "Stock invalide." };
  return transaction(async (c) => {
    const row = await queryOne<{ stock: number }>("SELECT stock FROM product WHERE id = $1 FOR UPDATE", [productId], c);
    if (!row) return { ok: false, error: "Produit introuvable." };
    if (row.stock !== expected) {
      return { ok: false, error: `Le stock a changé entre-temps (une vente ?) : il est maintenant de ${row.stock}.`, stock: row.stock };
    }
    if (next === row.stock) return { ok: true, stock: next };
    await query("UPDATE product SET stock = $2, version = version + 1 WHERE id = $1", [productId, next], c);
    await query("INSERT INTO stock_movement (product_id, delta, stock_after, reason, admin_id) VALUES ($1, $2, $3, 'admin', $4)", [productId, next - row.stock, next, adminId], c);
    return { ok: true, stock: next };
  });
}

export async function deleteProduct(productId: string, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ordered = await queryOne("SELECT 1 FROM order_item WHERE product_id = $1 UNION ALL SELECT 1 FROM reservation WHERE product_id = $1 LIMIT 1", [productId]);
  if (ordered) return { ok: false, error: "Ce produit figure dans des commandes ou des réservations : il ne peut pas être supprimé, mais vous pouvez l'archiver (il disparaîtra de la boutique)." };
  const images = await transaction(async (c) => {
    const imgs = await query<{ id: string; widths: number[] }>("SELECT id, widths FROM image WHERE product_id = $1", [productId], c);
    await query("DELETE FROM image WHERE product_id = $1", [productId], c);
    await query("DELETE FROM product WHERE id = $1", [productId], c);
    await audit(adminId, "product_deleted", "product", productId, {}, "", c);
    return imgs;
  });
  for (const img of images) await deleteImageFiles(img.id, img.widths).catch(() => undefined);
  return { ok: true };
}

export type BulkAction = { type: "publish" } | { type: "draft" } | { type: "archive" } | { type: "category"; categoryId: string };

export async function bulkUpdate(ids: string[], action: BulkAction, adminId: string): Promise<number> {
  const safeIds = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
  if (!safeIds.length) return 0;
  let rows: unknown[];
  if (action.type === "category") {
    rows = await query("UPDATE product SET category_id = $2, version = version + 1 WHERE id = ANY($1::uuid[]) AND EXISTS (SELECT 1 FROM category WHERE id = $2) RETURNING id", [safeIds, action.categoryId]);
  } else {
    const status = action.type === "publish" ? "published" : action.type === "draft" ? "draft" : "archived";
    rows = await query(
      `UPDATE product SET status = $2, published_at = CASE WHEN $2 = 'published' THEN coalesce(published_at, now()) ELSE published_at END, version = version + 1
       WHERE id = ANY($1::uuid[]) RETURNING id`,
      [safeIds, status],
    );
  }
  await audit(adminId, "products_bulk", "product", "", { action: action.type, count: rows.length });
  return rows.length;
}

export async function moveProduct(productId: string, direction: "up" | "down", adminId: string): Promise<void> {
  await transaction(async (c) => {
    const list = await query<{ id: string }>("SELECT id FROM product WHERE status <> 'archived' ORDER BY position, published_at DESC NULLS LAST, created_at DESC FOR UPDATE", [], c);
    const index = list.findIndex((p) => p.id === productId);
    const swap = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= list.length) return;
    [list[index], list[swap]] = [list[swap], list[index]];
    for (const [i, p] of list.entries()) await query("UPDATE product SET position = $2 WHERE id = $1", [p.id, i], c);
    await audit(adminId, "product_moved", "product", productId, { direction }, "", c);
  });
}

// ───────────── Catégories et collections ─────────────

export async function saveGroup(table: "category" | "collection", raw: unknown, adminId: string): Promise<{ ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error) };
  const g = parsed.data;
  return transaction(async (c) => {
    const slug = await uniqueSlug(c, table, g.slug || slugify(g.name), g.id ?? null);
    let id = g.id;
    if (id) {
      const row = await queryOne<{ id: string }>(`UPDATE ${table} SET name = $2, slug = $3, description = $4, is_visible = $5 WHERE id = $1 RETURNING id`, [id, g.name, slug, g.description, g.isVisible], c);
      if (!row) return { ok: false, error: "Introuvable." };
    } else {
      const pos = await queryOne<{ max: number | null }>(`SELECT max(position) AS max FROM ${table}`, [], c);
      const row = await queryOne<{ id: string }>(`INSERT INTO ${table} (name, slug, description, is_visible, position) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [
        g.name,
        slug,
        g.description,
        g.isVisible,
        (pos?.max ?? 0) + 1,
      ], c);
      id = row!.id;
    }
    await audit(adminId, `${table}_saved`, table, id!, { name: g.name }, "", c);
    return { ok: true, id: id! };
  });
}

export async function deleteGroup(table: "category" | "collection", id: string, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const col = table === "category" ? "category_id" : "collection_id";
  const used = await queryOne<{ n: string }>(`SELECT count(*) AS n FROM product WHERE ${col} = $1`, [id]);
  if (table === "category" && Number(used?.n) > 0) {
    return { ok: false, error: `Cette catégorie contient ${used?.n} produit(s). Déplacez-les d'abord dans une autre catégorie (ou masquez la catégorie).` };
  }
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  await audit(adminId, `${table}_deleted`, table, id);
  return { ok: true };
}

export async function moveGroup(table: "category" | "collection", id: string, direction: "up" | "down"): Promise<void> {
  await transaction(async (c) => {
    const list = await query<{ id: string }>(`SELECT id FROM ${table} ORDER BY position, name FOR UPDATE`, [], c);
    const index = list.findIndex((x) => x.id === id);
    const swap = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= list.length) return;
    [list[index], list[swap]] = [list[swap], list[index]];
    for (const [i, x] of list.entries()) await query(`UPDATE ${table} SET position = $2 WHERE id = $1`, [x.id, i], c);
  });
}

// ───────────── Livraison ─────────────

export async function saveShippingMethod(raw: unknown, adminId: string): Promise<{ ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  const parsed = shippingInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error) };
  const m = parsed.data;
  const values = [m.name, m.description, m.priceCents, m.freeOverCents, m.countries, m.requiresAddress, m.deliveryEstimate, m.isActive];
  let id = m.id;
  if (id) {
    const row = await queryOne<{ id: string }>(
      `UPDATE shipping_method SET name=$2, description=$3, price_cents=$4, free_over_cents=$5, countries=$6, requires_address=$7, delivery_estimate=$8, is_active=$9 WHERE id=$1 RETURNING id`,
      [id, ...values],
    );
    if (!row) return { ok: false, error: "Mode de livraison introuvable." };
  } else {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO shipping_method (name, description, price_cents, free_over_cents, countries, requires_address, delivery_estimate, is_active, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,(SELECT coalesce(max(position), 0) + 1 FROM shipping_method)) RETURNING id`,
      values,
    );
    id = row!.id;
  }
  await audit(adminId, "shipping_saved", "shipping_method", id!, { name: m.name, price: m.priceCents });
  return { ok: true, id: id! };
}

export async function deleteShippingMethod(id: string, adminId: string): Promise<void> {
  // Les commandes gardent une copie du nom et du prix : la suppression est sans risque.
  await query("DELETE FROM shipping_method WHERE id = $1", [id]);
  await audit(adminId, "shipping_deleted", "shipping_method", id);
}

/** Nettoyage : photos importées puis jamais enregistrées dans une fiche. */
export async function cleanupOrphanImages(): Promise<number> {
  const rows = await query<{ id: string; widths: number[] }>(
    `DELETE FROM image i WHERE i.product_id IS NULL AND i.kind IN ('product', 'brand') AND i.created_at < now() - interval '1 day'
       AND NOT EXISTS (SELECT 1 FROM order_item o WHERE o.image_id = i.id)
       AND NOT EXISTS (SELECT 1 FROM shop_settings s WHERE i.id IN (s.logo_image_id, s.favicon_image_id, s.hero_image_id, s.about_image_id))
     RETURNING i.id, i.widths`,
  );
  for (const r of rows) await deleteImageFiles(r.id, r.widths).catch(() => undefined);
  return rows.length;
}
