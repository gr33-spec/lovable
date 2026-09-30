import "server-only";
import { randomUUID } from "node:crypto";
import { deleteProduct, saveProduct, uploadImage } from "./admin-catalog";
import { query, queryOne } from "./db";
import { audit } from "./monitoring";

// Créations d'EXEMPLE pour découvrir la boutique remplie avant d'ajouter les
// vraies. Elles sont marquées (is_demo) et se suppriment d'un clic.
// Photos : recadrages des publications Facebook de la marque (public/demo).

const DEMO = [
  {
    name: "Fleurs pailletées Arc-en-ciel (exemple)",
    category: "boucles-d-oreilles",
    priceCents: 2400,
    stock: 3,
    images: ["fleurs-1.jpg", "fleurs-2.jpg"],
    colors: ["multicolore", "bleu"],
    description:
      "Deux fleurs en résine remplies de paillettes holographiques : bleu nuit, vert, or et rose selon la lumière.\n\n- Légères et confortables\n- Attaches en acier inoxydable",
    features: [
      { label: "Dimensions", value: "3,5 cm" },
      { label: "Matière", value: "Résine, paillettes, acier inoxydable" },
    ],
  },
  {
    name: "Fleurs Nuit étoilée (exemple)",
    category: "boucles-d-oreilles",
    priceCents: 2200,
    stock: 1,
    images: ["fleurs-2.jpg"],
    colors: ["bleu", "multicolore"],
    description: "Une version plus arrondie des fleurs pailletées, comme un ciel d'été.",
    features: [],
  },
  {
    name: "Cœur zébré cuivré (exemple)",
    category: "pendentifs",
    priceCents: 1900,
    stock: 2,
    images: ["coeur-cuivre.jpg"],
    colors: ["noir", "marron"],
    description: "Un cœur noir brillant aux rayures de paillettes cuivrées.",
    features: [{ label: "Taille", value: "4 cm" }],
  },
  {
    name: "Cœur zébré argenté (exemple)",
    category: "pendentifs",
    priceCents: 1900,
    stock: 0,
    images: ["coeur-argent.jpg"],
    colors: ["noir", "argente"],
    description: "Un cœur noir aux rayures de paillettes argentées (exemple d'article épuisé).",
    features: [],
  },
];

export async function hasDemoProducts(): Promise<boolean> {
  return Boolean(await queryOne("SELECT 1 FROM product WHERE is_demo LIMIT 1"));
}

/** `load` fournit le contenu d'une photo de démonstration (disque ou adresse du site). */
export async function createDemoProducts(adminId: string, load: (file: string) => Promise<Buffer>): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (await queryOne("SELECT 1 FROM product LIMIT 1")) return { ok: false, error: "Des produits existent déjà : les exemples ne sont proposés que sur une boutique vide." };
  const categories = await query<{ id: string; slug: string }>("SELECT id, slug FROM category WHERE parent_id IS NULL AND archived_at IS NULL ORDER BY position");
  let count = 0;
  for (const d of DEMO) {
    const category = categories.find((c) => c.slug === d.category) ?? categories[0];
    if (!category) return { ok: false, error: "Créez d'abord une catégorie." };
    const imageIds: string[] = [];
    for (const file of d.images) {
      const up = await uploadImage(await load(file), "product", adminId);
      if (up.ok) imageIds.push(up.image.id);
    }
    const id = randomUUID();
    const res = await saveProduct(
      { id, version: 0, name: d.name, categoryId: category.id, priceCents: d.priceCents, stock: d.stock, originalStock: 0, status: "published", colors: d.colors, description: d.description, features: d.features, imageIds },
      adminId,
    );
    if (!res.ok) return { ok: false, error: res.error };
    await query("UPDATE product SET is_demo = true WHERE id = $1", [id]);
    count++;
  }
  await audit(adminId, "demo_loaded", "product", "", { count });
  return { ok: true, count };
}

/** Supprime les exemples (archivés s'ils ont été commandés, pour garder l'historique). */
export async function removeDemoProducts(adminId: string): Promise<number> {
  const rows = await query<{ id: string }>("SELECT id FROM product WHERE is_demo");
  for (const r of rows) {
    const res = await deleteProduct(r.id, adminId);
    if (!res.ok) await query("UPDATE product SET status = 'archived', is_demo = false WHERE id = $1", [r.id]);
  }
  await audit(adminId, "demo_removed", "product", "", { count: rows.length });
  return rows.length;
}
