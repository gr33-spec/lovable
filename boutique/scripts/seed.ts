// Données de DÉMONSTRATION pour le développement : produits fictifs (photos
// tirées du moodboard), fausses clientes, fausses commandes. Refusé en
// production : on ne mélange jamais démo et vraies commandes.
//   npm run db:seed
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const UPLOADS = process.env.SEED_IMAGES_DIR ?? "/root/.claude/uploads/9842cd64-e1a5-5a0f-982e-e9de812ecf8f";

async function main() {
  process.env.BOUTIQUE_TEST ??= "0";
  const { deployEnv } = await import("../src/lib/server/env");
  if (deployEnv() === "production" || process.env.VERCEL_ENV === "production") {
    console.error("✗ Données de démonstration refusées en production.");
    process.exit(1);
  }
  const { query, queryOne, pool } = await import("../src/lib/server/db");
  const { hashPassword } = await import("../src/lib/server/crypto");
  const { processImage, storeVariants } = await import("../src/lib/server/images");
  const { saveProduct } = await import("../src/lib/server/admin-catalog");

  const already = await queryOne("SELECT 1 FROM product LIMIT 1");
  if (already) {
    console.log("La base contient déjà des produits : rien à faire.");
    await pool().end();
    return;
  }

  const admin = await queryOne<{ id: string }>(
    `INSERT INTO admin_user (email, name, password_hash) VALUES ('creatrice@boutique.test', 'Créatrice (démo)', $1)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [await hashPassword("paillettes-demo-2026")],
  );
  await query("UPDATE shipping_method SET is_active = true");
  await query(
    `UPDATE shop_settings SET contact_email = 'contact@boutique.test', notification_email = 'creatrice@boutique.test' WHERE id = 1`,
  );

  async function image(file: string, crop: { left: number; top: number; width: number; height: number }, kind: "product" | "brand" = "product") {
    const src = path.join(UPLOADS, file);
    let input: Buffer;
    if (existsSync(src)) {
      // Coordonnées relevées sur une capture affichée en 923 px de large.
      const meta = await sharp(src).metadata();
      const k = (meta.width ?? 923) / 923;
      const scaled = Object.fromEntries(Object.entries(crop).map(([key, v]) => [key, Math.round(v * k)])) as typeof crop;
      input = await sharp(src).extract(scaled).toBuffer();
    }
    else input = await sharp({ create: { width: 900, height: 900, channels: 3, background: "#e9dfcf" } }).jpeg().toBuffer();
    const id = randomUUID();
    const processed = await processImage(await sharp(input).jpeg({ quality: 92 }).toBuffer(), id, kind);
    await storeVariants(processed);
    await query(
      "INSERT INTO image (id, kind, width, height, widths, placeholder, content_hash, bytes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, kind, processed.width, processed.height, processed.widths, processed.placeholder, processed.contentHash, processed.bytes],
    );
    return id;
  }

  const flower1 = () => image("86459fa1-image.png", { left: 0, top: 375, width: 923, height: 578 });
  const flower2 = () => image("86459fa1-image.png", { left: 0, top: 1234, width: 923, height: 594 });
  const heartCopper = () => image("42071077-image.png", { left: 0, top: 675, width: 923, height: 455 });
  const heartSilver = () => image("42071077-image.png", { left: 0, top: 1142, width: 923, height: 452 });
  const logo = await image("8636e514-image.png", { left: 38, top: 296, width: 206, height: 206 }, "brand");
  await query("UPDATE shop_settings SET logo_image_id = $1 WHERE id = 1", [logo]);

  const [earrings, pendants] = await query<{ id: string }>("SELECT id FROM category ORDER BY position");
  const collection = await queryOne<{ id: string }>("INSERT INTO collection (slug, name, description) VALUES ('fleurs', 'Fleurs', 'La collection florale.') RETURNING id");

  const products = [
    {
      name: "Fleurs pailletées Arc-en-ciel",
      categoryId: earrings.id,
      collectionId: collection!.id,
      priceCents: 2400,
      stock: 3,
      images: [flower1, flower2],
      colors: ["multicolore", "bleu"],
      description:
        "Deux fleurs en résine remplies de paillettes holographiques : bleu nuit, vert, or et rose selon la lumière.\n\n- Légères et confortables\n- Attaches en acier inoxydable",
      features: [
        { label: "Dimensions", value: "3,5 cm" },
        { label: "Matière", value: "Résine, paillettes, acier inoxydable" },
      ],
    },
    {
      name: "Fleurs Nuit étoilée",
      categoryId: earrings.id,
      collectionId: collection!.id,
      priceCents: 2200,
      stock: 1,
      images: [flower2, flower1],
      colors: ["bleu", "multicolore"],
      description: "Une version plus arrondie des fleurs pailletées, comme un ciel d'été.",
      features: [],
    },
    {
      name: "Cœur zébré cuivré",
      categoryId: pendants.id,
      collectionId: null,
      priceCents: 1900,
      stock: 2,
      images: [heartCopper],
      colors: ["noir", "marron"],
      description: "Un cœur noir brillant aux rayures de paillettes cuivrées.",
      features: [{ label: "Taille", value: "4 cm" }],
    },
    {
      name: "Cœur zébré argenté",
      categoryId: pendants.id,
      collectionId: null,
      priceCents: 1900,
      stock: 0,
      images: [heartSilver],
      colors: ["noir", "argente"],
      description: "Un cœur noir aux rayures de paillettes argentées.",
      features: [],
    },
    {
      name: "Créoles bohème (photo à venir)",
      categoryId: earrings.id,
      collectionId: null,
      priceCents: 2800,
      stock: 4,
      images: [],
      colors: ["dore"],
      description: "Produit de démonstration sans photo.",
      features: [],
    },
  ];
  for (const p of products) {
    const id = randomUUID();
    const res = await saveProduct(
      {
        id,
        version: 0,
        name: p.name,
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        priceCents: p.priceCents,
        stock: p.stock,
        originalStock: 0,
        status: "published",
        colors: p.colors,
        description: p.description,
        features: p.features,
        imageIds: await Promise.all(p.images.map((make) => make())),
      },
      admin!.id,
    );
    if (!res.ok) throw new Error(`${p.name} : ${res.error}`);
  }
  console.log("✓ Démo prête. Administration : creatrice@boutique.test / paillettes-demo-2026");
  await pool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
