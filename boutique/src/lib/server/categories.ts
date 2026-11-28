import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { slugify } from "../format";
import { categoryTreeInputSchema, fieldErrors } from "../validation";
import { query, queryOne, transaction, type Queryable } from "./db";
import { audit } from "./monitoring";

// ═══════════════════════════════════════════════════════════════════════
// Arborescence des catégories (administration).
//
// Catégorie → sous-catégorie → sous-sous-catégorie : 3 niveaux au plus.
// Rien n'est codé en dur. Un produit est rangé dans UNE catégorie, à
// n'importe quel niveau ; une catégorie affiche aussi les produits de ses
// sous-catégories.
//
// Masquer : la catégorie (et sa descendance) disparaît de la boutique,
// mais reste proposée dans les fiches produit. Archiver : elle disparaît
// aussi de l'administration courante (section « Archivées »), restaurable.
// Supprimer : seulement une catégorie vide, sans sous-catégorie ; sinon on
// propose de déplacer les produits ou d'archiver.
// ═══════════════════════════════════════════════════════════════════════

export const MAX_DEPTH = 3;

export interface AdminCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string;
  isVisible: boolean;
  archived: boolean;
  depth: number;
  /** Adresse complète : pampilles/coeurs */
  path: string;
  /** « Pampilles › Cœurs » */
  label: string;
  /** Produits rangés directement ici (hors produits archivés). */
  ownCount: number;
  /** Produits ici + dans toutes les sous-catégories. */
  totalCount: number;
  childCount: number;
  /** Hauteur de la branche sous cette catégorie (0 = pas d'enfant). */
  height: number;
}

interface Row {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string;
  is_visible: boolean;
  archived_at: Date | null;
  position: number;
  own_count: string;
}

/** Arbre complet, ordonné (parent puis ses enfants, dans l'ordre choisi). */
export async function adminCategoryTree(client?: Queryable): Promise<AdminCategory[]> {
  const rows = await query<Row>(
    `SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.is_visible, c.archived_at, c.position,
            (SELECT count(*) FROM product p WHERE p.category_id = c.id AND p.status <> 'archived') AS own_count
     FROM category c ORDER BY c.position, c.name`,
    [],
    client,
  );
  return buildTree(rows);
}

function buildTree(rows: Row[]): AdminCategory[] {
  const children = new Map<string | null, Row[]>();
  for (const r of rows) {
    const key = r.parent_id && rows.some((x) => x.id === r.parent_id) ? r.parent_id : null;
    children.set(key, [...(children.get(key) ?? []), r]);
  }
  const out: AdminCategory[] = [];
  const visit = (r: Row, depth: number, parentPath: string, parentLabel: string, parentArchived: boolean): { total: number; height: number } => {
    const path = parentPath ? `${parentPath}/${r.slug}` : r.slug;
    const label = parentLabel ? `${parentLabel} › ${r.name}` : r.name;
    const archived = parentArchived || Boolean(r.archived_at);
    const node: AdminCategory = {
      id: r.id,
      parentId: r.parent_id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      isVisible: r.is_visible,
      archived,
      depth,
      path,
      label,
      ownCount: Number(r.own_count),
      totalCount: 0,
      childCount: 0,
      height: 0,
    };
    out.push(node);
    let total = node.ownCount;
    let height = 0;
    for (const child of children.get(r.id) ?? []) {
      const sub = visit(child, depth + 1, path, label, archived);
      total += sub.total;
      height = Math.max(height, sub.height + 1);
      node.childCount++;
    }
    node.totalCount = total;
    node.height = height;
    return { total, height };
  };
  for (const root of children.get(null) ?? []) visit(root, 1, "", "", false);
  return out;
}

async function siblingSlug(c: Queryable, parentId: string | null, base: string, selfId: string | null): Promise<string> {
  const root = (base || "categorie").slice(0, 70);
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const taken = await queryOne(
      "SELECT 1 FROM category WHERE parent_id IS NOT DISTINCT FROM $1 AND slug = $2 AND ($3::uuid IS NULL OR id <> $3)",
      [parentId, candidate, selfId],
      c,
    );
    if (!taken) return candidate;
  }
  return `${root.slice(0, 60)}-${randomUUID().slice(0, 6)}`;
}

/** Enregistre les anciennes adresses qui ont changé (renommage d'adresse, déplacement). */
async function recordRedirects(c: PoolClient, before: AdminCategory[]) {
  const after = await adminCategoryTree(c);
  const livePaths = new Set(after.map((x) => x.path));
  for (const old of before) {
    const now = after.find((x) => x.id === old.id);
    if (now && now.path !== old.path) {
      await query(
        `INSERT INTO category_redirect (old_path, category_id) VALUES ($1, $2)
         ON CONFLICT (old_path) DO UPDATE SET category_id = EXCLUDED.category_id, created_at = now()`,
        [old.path, old.id],
        c,
      );
    }
  }
  // Une adresse redevenue réelle n'est plus une redirection.
  await query("DELETE FROM category_redirect WHERE old_path = ANY($1::text[])", [[...livePaths]], c);
}

export type CategoryResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Création ou modification (nom, adresse, présentation, visibilité, emplacement). */
export async function saveCategory(raw: unknown, adminId: string): Promise<CategoryResult> {
  const parsed = categoryTreeInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fieldErrors: fieldErrors(parsed.error) };
  const g = parsed.data;
  return transaction(async (c) => {
    await query("LOCK TABLE category IN SHARE ROW EXCLUSIVE MODE", [], c);
    const tree = await adminCategoryTree(c);
    const self = g.id ? tree.find((x) => x.id === g.id) : undefined;
    if (g.id && !self) return { ok: false, error: "Catégorie introuvable." };
    const parent = g.parentId ? tree.find((x) => x.id === g.parentId) : undefined;
    if (g.parentId) {
      if (!parent) return { ok: false, error: "La catégorie parente n'existe plus." };
      if (parent.archived) return { ok: false, error: "La catégorie parente est archivée." };
      if (self && (parent.id === self.id || parent.path.startsWith(`${self.path}/`))) {
        return { ok: false, error: "Une catégorie ne peut pas être rangée dans une de ses propres sous-catégories.", fieldErrors: { parentId: "Choisissez un autre emplacement" } };
      }
      if (parent.depth + 1 + (self?.height ?? 0) > MAX_DEPTH) {
        return {
          ok: false,
          error: self?.height ? "Trop de niveaux : cette catégorie a déjà des sous-catégories (3 niveaux au maximum)." : "Trois niveaux au maximum : impossible de créer une catégorie plus profonde.",
          fieldErrors: { parentId: "3 niveaux au maximum" },
        };
      }
    }
    const parentId = g.parentId ?? null;
    const slug = await siblingSlug(c, parentId, g.slug || slugify(g.name), g.id ?? null);
    let id = g.id;
    if (self) {
      const moved = self.parentId !== parentId;
      const position = moved ? await nextPosition(c, parentId) : undefined;
      await query(
        `UPDATE category SET name = $2, slug = $3, description = $4, is_visible = $5, parent_id = $6, position = coalesce($7, position) WHERE id = $1`,
        [self.id, g.name, slug, g.description, g.isVisible, parentId, position ?? null],
        c,
      );
      if (moved || slug !== self.slug) await recordRedirects(c, tree);
    } else {
      const row = await queryOne<{ id: string }>(
        "INSERT INTO category (name, slug, description, is_visible, parent_id, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [g.name, slug, g.description, g.isVisible, parentId, await nextPosition(c, parentId)],
        c,
      );
      id = row!.id;
    }
    await audit(adminId, "category_saved", "category", id!, { name: g.name, parentId }, "", c);
    return { ok: true, id: id! };
  });
}

async function nextPosition(c: Queryable, parentId: string | null): Promise<number> {
  const row = await queryOne<{ max: number | null }>("SELECT max(position) AS max FROM category WHERE parent_id IS NOT DISTINCT FROM $1", [parentId], c);
  return (row?.max ?? 0) + 1;
}

/** Monter / descendre parmi les catégories de même niveau. */
export async function reorderCategory(id: string, direction: "up" | "down"): Promise<void> {
  await transaction(async (c) => {
    const self = await queryOne<{ parent_id: string | null }>("SELECT parent_id FROM category WHERE id = $1", [id], c);
    if (!self) return;
    const list = await query<{ id: string }>(
      "SELECT id FROM category WHERE parent_id IS NOT DISTINCT FROM $1 AND archived_at IS NULL ORDER BY position, name FOR UPDATE",
      [self.parent_id],
      c,
    );
    const index = list.findIndex((x) => x.id === id);
    const swap = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= list.length) return;
    [list[index], list[swap]] = [list[swap], list[index]];
    for (const [i, x] of list.entries()) await query("UPDATE category SET position = $2 WHERE id = $1", [x.id, i], c);
  });
}

/** Archiver ou restaurer une catégorie ; sa descendance suit. */
export async function archiveCategory(id: string, archive: boolean, adminId: string): Promise<CategoryResult> {
  return transaction(async (c) => {
    const before = await adminCategoryTree(c);
    const self = before.find((x) => x.id === id);
    if (!self) return { ok: false as const, error: "Catégorie introuvable." };
    await query("UPDATE category SET archived_at = CASE WHEN $2 THEN coalesce(archived_at, now()) ELSE NULL END WHERE id = $1", [id, archive], c);
    const parent = before.find((x) => x.id === self.parentId);
    if (!archive && parent?.archived) {
      // Restaurer une sous-catégorie dont un parent est archivé : elle remonte au premier niveau.
      const slug = await siblingSlug(c, null, self.slug, id);
      await query("UPDATE category SET parent_id = NULL, slug = $2, position = $3 WHERE id = $1", [id, slug, await nextPosition(c, null)], c);
      await recordRedirects(c, before);
    }
    await audit(adminId, archive ? "category_archived" : "category_restored", "category", id, {}, "", c);
    return { ok: true as const, id };
  });
}

/**
 * Suppression définitive. Jamais « brutale » :
 * - refusée s'il reste des sous-catégories ;
 * - s'il reste des produits, ils doivent être déplacés (moveTo) — même les archivés.
 */
export async function deleteCategory(id: string, moveTo: string | null, adminId: string): Promise<{ ok: true; moved: number } | { ok: false; error: string; code?: "has_children" | "has_products"; count?: number }> {
  return transaction(async (c) => {
    const self = await queryOne<{ name: string }>("SELECT name FROM category WHERE id = $1 FOR UPDATE", [id], c);
    if (!self) return { ok: false, error: "Catégorie introuvable." };
    const children = await queryOne<{ n: string }>("SELECT count(*) AS n FROM category WHERE parent_id = $1", [id], c);
    if (Number(children?.n) > 0) {
      return { ok: false, code: "has_children", count: Number(children?.n), error: "Cette catégorie contient des sous-catégories : déplacez-les ou supprimez-les d'abord, ou archivez la catégorie." };
    }
    const products = await queryOne<{ n: string }>("SELECT count(*) AS n FROM product WHERE category_id = $1", [id], c);
    const count = Number(products?.n ?? 0);
    let moved = 0;
    if (count > 0) {
      if (!moveTo) return { ok: false, code: "has_products", count, error: `Cette catégorie contient ${count} produit(s) : choisissez où les déplacer, ou archivez-la.` };
      if (moveTo === id) return { ok: false, error: "Choisissez une autre catégorie." };
      const target = await queryOne("SELECT 1 FROM category WHERE id = $1 AND archived_at IS NULL", [moveTo], c);
      if (!target) return { ok: false, error: "La catégorie de destination n'existe plus." };
      moved = (await query("UPDATE product SET category_id = $2, version = version + 1 WHERE category_id = $1 RETURNING id", [id, moveTo], c)).length;
    }
    await query("DELETE FROM category WHERE id = $1", [id], c);
    await audit(adminId, "category_deleted", "category", id, { name: self.name, moved, moveTo }, "", c);
    return { ok: true, moved };
  });
}
