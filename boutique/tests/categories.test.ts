import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { closePool, resetDatabase, sql } from "./helpers";
import { adminCategoryTree, archiveCategory, deleteCategory, reorderCategory, saveCategory } from "../src/lib/server/categories";
import { catalogFacets, findProduct, listCategories, listProducts, sitemapEntries } from "../src/lib/server/catalog";
import { saveProduct } from "../src/lib/server/admin-catalog";
import { createBackup, restoreBackup } from "../src/lib/server/backup";

// Arborescence des catégories : STRUCTURE POUR NAVIGUER + ATTRIBUTS POUR
// FILTRER + NOM DU PRODUIT POUR IDENTIFIER. Rien n'est codé en dur.

let adminId = "";

async function cat(name: string, parentId: string | null = null, extra: Record<string, unknown> = {}) {
  const res = await saveCategory({ name, parentId, ...extra }, adminId);
  assert.ok(res.ok, `création de « ${name} » : ${!res.ok ? res.error : ""}`);
  return res.id;
}

async function product(categoryId: string, name: string, features: { label: string; value: string }[] = [], status = "published") {
  const id = randomUUID();
  await sql(
    `INSERT INTO product (id, slug, name, category_id, price_cents, stock, status, published_at, features)
     VALUES ($1, $2, $3, $4, 1800, 1, $5, now(), $6)`,
    [id, `p-${id.slice(0, 12)}`, name, categoryId, status, JSON.stringify(features)],
  );
  return id;
}

const pathsOf = async () => (await listCategories()).map((c) => c.path);
const countOf = async (path: string) => (await listCategories()).find((c) => c.path === path)?.productCount;

before(async () => {
  await resetDatabase();
  // On repart d'une boutique sans catégorie : rien n'est imposé par le code.
  await sql("DELETE FROM category");
  [{ id: adminId }] = await sql<{ id: string }>("INSERT INTO admin_user (email, password_hash) VALUES ('creatrice@exemple.fr', 'x') RETURNING id");
});
after(closePool);

describe("création libre, sans rien de codé en dur", () => {
  test("3 catégories : créées, ordonnées, réordonnables", async () => {
    const ids = [await cat("Boucles d'oreilles"), await cat("Pampilles"), await cat("Pendentifs")];
    for (const id of ids) await product(id, `Modèle ${id.slice(0, 4)}`);
    assert.deepEqual(await pathsOf(), ["boucles-d-oreilles", "pampilles", "pendentifs"]);
    await reorderCategory(ids[2], "up");
    assert.deepEqual(await pathsOf(), ["boucles-d-oreilles", "pendentifs", "pampilles"]);
  });

  test("10 catégories : toutes gérées, adresses uniques même avec le même nom", async () => {
    for (let i = 0; i < 7; i++) await product(await cat(`Famille ${i + 1}`), `Création ${i}`);
    const roots = (await listCategories()).filter((c) => c.parentId === null);
    assert.equal(roots.length, 10);
    // Même nom au même niveau : adresse rendue unique automatiquement.
    const twin = await cat("Famille 1");
    const tree = await adminCategoryTree();
    assert.equal(tree.find((c) => c.id === twin)?.slug, "famille-1-2");
  });

  test("une famille toute nouvelle (ex. bracelets) sans toucher au code", async () => {
    const bracelets = await cat("Bracelets");
    const joncs = await cat("Joncs", bracelets);
    await product(joncs, "Jonc pailleté");
    assert.ok((await pathsOf()).includes("bracelets/joncs"));
  });
});

describe("plusieurs niveaux", () => {
  let pampilles = "";
  let coeurs = "";
  let mini = "";

  test("catégorie → sous-catégorie → sous-sous-catégorie ; la famille montre toute sa descendance", async () => {
    pampilles = (await adminCategoryTree()).find((c) => c.path === "pampilles")!.id;
    coeurs = await cat("Cœurs", pampilles);
    mini = await cat("Mini", coeurs);
    await product(mini, "Mini cœur marinière");
    await product(coeurs, "Cœur zébré");
    assert.ok((await pathsOf()).includes("pampilles/coeurs/mini"));
    assert.equal((await listProducts({ category: "pampilles/coeurs" }, 2)).total, 2);
    assert.equal((await listProducts({ category: "pampilles/coeurs/mini" }, 2)).total, 1);
    assert.equal(await countOf("pampilles"), 3);
    const c = (await listCategories()).find((x) => x.path === "pampilles/coeurs/mini")!;
    assert.deepEqual(c.trail.map((t) => t.name), ["Pampilles", "Cœurs"]);
  });

  test("même sous-catégorie « Cœurs » dans deux familles : deux adresses distinctes", async () => {
    const boucles = (await adminCategoryTree()).find((c) => c.path === "boucles-d-oreilles")!.id;
    const c2 = await cat("Cœurs", boucles);
    await product(c2, "Boucles cœur");
    const paths = await pathsOf();
    assert.ok(paths.includes("boucles-d-oreilles/coeurs") && paths.includes("pampilles/coeurs"));
  });

  test("4e niveau et boucle refusés", async () => {
    const tooDeep = await saveCategory({ name: "Trop loin", parentId: mini }, adminId);
    assert.equal(tooDeep.ok, false);
    const tree = await adminCategoryTree();
    const p = tree.find((c) => c.id === pampilles)!;
    const loop = await saveCategory({ id: pampilles, name: p.name, slug: p.slug, parentId: coeurs }, adminId);
    assert.equal(loop.ok, false);
    // La base refuse aussi, même sans passer par l'application.
    await assert.rejects(sql("UPDATE category SET parent_id = $2 WHERE id = $1", [pampilles, mini]));
  });

  test("déplacer une branche : ses adresses suivent, les anciennes redirigent", async () => {
    const pendentifs = (await adminCategoryTree()).find((c) => c.path === "pendentifs")!.id;
    const t = (await adminCategoryTree()).find((c) => c.id === mini)!;
    const res = await saveCategory({ id: mini, name: t.name, slug: t.slug, parentId: pendentifs }, adminId);
    assert.ok(res.ok);
    assert.ok((await pathsOf()).includes("pendentifs/mini"));
    const [r] = await sql<{ category_id: string }>("SELECT category_id FROM category_redirect WHERE old_path = 'pampilles/coeurs/mini'");
    assert.equal(r.category_id, mini);
  });
});

describe("catégories vides, renommées, masquées, archivées", () => {
  test("sous-catégorie vide : existe, mais jamais proposée aux clientes ni au plan du site", async () => {
    const pampilles = (await adminCategoryTree()).find((c) => c.path === "pampilles")!.id;
    await cat("Étoiles", pampilles);
    const etoiles = (await listCategories()).find((c) => c.path === "pampilles/etoiles")!;
    assert.equal(etoiles.productCount, 0);
    const { categories } = await sitemapEntries();
    assert.ok(!categories.some((c) => c.path === "pampilles/etoiles"));
    assert.ok(categories.some((c) => c.path === "pampilles"));
  });

  test("renommer : le nom change, l'adresse reste ; changer l'adresse crée une redirection (sous-catégories comprises)", async () => {
    const tree = await adminCategoryTree();
    const p = tree.find((c) => c.path === "pampilles")!;
    await saveCategory({ id: p.id, name: "Pampilles pailletées", slug: p.slug, parentId: null }, adminId);
    assert.equal((await listCategories()).find((c) => c.id === p.id)?.path, "pampilles");
    assert.equal((await listCategories()).find((c) => c.id === p.id)?.name, "Pampilles pailletées");
    await saveCategory({ id: p.id, name: "Pampilles pailletées", slug: "pampilles-paillettes", parentId: null }, adminId);
    const redirects = await sql<{ old_path: string }>("SELECT old_path FROM category_redirect ORDER BY old_path");
    assert.ok(redirects.some((r) => r.old_path === "pampilles"));
    assert.ok(redirects.some((r) => r.old_path === "pampilles/coeurs"));
    assert.ok((await pathsOf()).includes("pampilles-paillettes/coeurs"));
  });

  test("masquer : la branche disparaît de la boutique, ses produits aussi", async () => {
    const coeurs = (await adminCategoryTree()).find((c) => c.path === "pampilles-paillettes/coeurs")!;
    await saveCategory({ id: coeurs.id, name: coeurs.name, slug: coeurs.slug, parentId: coeurs.parentId, isVisible: false }, adminId);
    assert.ok(!(await pathsOf()).includes("pampilles-paillettes/coeurs"));
    assert.equal((await listProducts({ q: "zébré" }, 2)).total, 0);
    await saveCategory({ id: coeurs.id, name: coeurs.name, slug: coeurs.slug, parentId: coeurs.parentId, isVisible: true }, adminId);
    assert.equal((await listProducts({ q: "zébré" }, 2)).total, 1);
  });

  test("archiver : invisible en boutique (produits compris), restaurable, et plus rien de neuf n'y est rangé", async () => {
    const p = (await adminCategoryTree()).find((c) => c.path === "pampilles-paillettes")!;
    const zebre = (await sql<{ slug: string }>("SELECT slug FROM product WHERE name = 'Cœur zébré'"))[0].slug;
    await archiveCategory(p.id, true, adminId);
    assert.ok(!(await pathsOf()).some((x) => x.startsWith("pampilles-paillettes")));
    assert.equal((await findProduct(zebre, 2)).kind, "unavailable");
    const res = await saveProduct({ id: randomUUID(), version: 0, name: "Nouvelle", categoryId: p.id, priceCents: 1000, stock: 1, originalStock: 0, status: "draft" }, adminId);
    assert.equal(res.ok, false);
    await archiveCategory(p.id, false, adminId);
    assert.equal((await findProduct(zebre, 2)).kind, "found");
  });
});

describe("produits : déplacement et suppression sans perte", () => {
  test("produit déplacé d'une catégorie à l'autre : compteurs et listes à jour", async () => {
    const tree = await adminCategoryTree();
    const to = tree.find((c) => c.path === "pendentifs")!.id;
    const [{ id, version }] = await sql<{ id: string; version: number }>("SELECT id, version FROM product WHERE name = 'Jonc pailleté'");
    const res = await saveProduct({ id, version, name: "Jonc pailleté", categoryId: to, priceCents: 1800, stock: 1, originalStock: 1, status: "published" }, adminId);
    assert.ok(res.ok);
    assert.equal((await listProducts({ category: "bracelets" }, 2)).total, 0);
    assert.ok((await listProducts({ category: "pendentifs" }, 2)).items.some((p) => p.name === "Jonc pailleté"));
    assert.equal(await countOf("bracelets"), 0);
  });

  test("supprimer une catégorie pleine : refusé sans destination ; avec destination, produits déplacés", async () => {
    const tree = await adminCategoryTree();
    const f1 = tree.find((c) => c.path === "famille-1")!.id;
    const f2 = tree.find((c) => c.path === "famille-2")!.id;
    const refused = await deleteCategory(f1, null, adminId);
    assert.equal(refused.ok, false);
    assert.equal(!refused.ok && refused.code, "has_products");
    const done = await deleteCategory(f1, f2, adminId);
    assert.deepEqual(done, { ok: true, moved: 1 });
    assert.equal(await countOf("famille-2"), 2);
  });

  test("supprimer une catégorie qui a des sous-catégories : refusé (archiver ou déplacer d'abord)", async () => {
    const bracelets = (await adminCategoryTree()).find((c) => c.path === "bracelets")!.id;
    const res = await deleteCategory(bracelets, null, adminId);
    assert.equal(!res.ok && res.code, "has_children");
  });
});

describe("200 créations dans une catégorie : navigation, filtres, recherche", () => {
  let fleurs = "";
  test("pages de 24, compteur exact, famille parente comprise", async () => {
    const boucles = (await adminCategoryTree()).find((c) => c.path === "boucles-d-oreilles")!.id;
    fleurs = await cat("Fleurs", boucles);
    const motifs = ["Marinière", "Liberty", "Léopard", "Uni"];
    for (let i = 0; i < 200; i++) {
      await product(fleurs, `Fleur n°${i + 1}`, [
        { label: "Motif", value: motifs[i % 4] },
        { label: i % 2 ? "matière" : "Matière", value: "Résine" },
        { label: "Dimensions", value: `${i + 10} mm` },
      ]);
    }
    const page1 = await listProducts({ category: "boucles-d-oreilles/fleurs" }, 2);
    assert.equal(page1.total, 200);
    assert.equal(page1.items.length, 24);
    assert.equal(page1.hasMore, true);
    assert.equal((await listProducts({ category: "boucles-d-oreilles/fleurs", page: 2 }, 2)).items.length, 48);
    assert.ok(((await countOf("boucles-d-oreilles")) ?? 0) >= 201);
  });

  test("attributs devenus filtres : motif oui ; dimensions (toutes différentes) et matière (une seule valeur) non", async () => {
    const facets = await catalogFacets("boucles-d-oreilles/fleurs");
    const keys = facets.attributes.map((a) => a.key);
    assert.deepEqual(keys, ["motif"]);
    assert.deepEqual(facets.attributes[0].values.map((v) => v.label), ["Léopard", "Liberty", "Marinière", "Uni"]);
    const filtered = await listProducts({ category: "boucles-d-oreilles/fleurs", attributes: { motif: "mariniere" } }, 2);
    assert.equal(filtered.total, 50);
  });

  test("recherche d'un modèle par son nom, et par une caractéristique", async () => {
    const found = await listProducts({ category: "boucles-d-oreilles", q: "Fleur n°137" }, 2);
    assert.ok(found.items.some((p) => p.name === "Fleur n°137") && found.total <= 3);
    assert.equal((await listProducts({ category: "boucles-d-oreilles/fleurs", q: "léopard" }, 2)).total, 50);
  });
});

describe("sauvegarde", () => {
  test("sauvegarde puis restauration : l'arborescence revient à l'identique (sous-catégories après leur parent)", async () => {
    const before = (await adminCategoryTree()).map((c) => `${c.path}:${c.totalCount}`);
    const backup = await createBackup();
    backup.tables.category.reverse(); // ordre défavorable : enfants avant parents
    await restoreBackup(JSON.parse(JSON.stringify(backup)));
    assert.deepEqual((await adminCategoryTree()).map((c) => `${c.path}:${c.totalCount}`), before);
  });
});
