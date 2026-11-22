// Données de DÉMONSTRATION pour le développement : compte administrateur de
// test, livraison activée, créations d'exemple (photos du moodboard, dossier
// public/demo). Refusé en production : on ne mélange jamais démo et vraies données.
//   npm run db:seed
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  process.env.BOUTIQUE_TEST ??= "0";
  const { deployEnv } = await import("../src/lib/server/env");
  if (deployEnv() === "production" || process.env.VERCEL_ENV === "production") {
    console.error("✗ Données de démonstration refusées en production.");
    process.exit(1);
  }
  const { query, queryOne, pool } = await import("../src/lib/server/db");
  const { hashPassword } = await import("../src/lib/server/crypto");

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

  const { uploadImage } = await import("../src/lib/server/admin-catalog");
  const { createDemoProducts } = await import("../src/lib/server/demo");
  const load = (file: string) => readFile(path.join(__dirname, "..", "public", "demo", file));
  const logo = await uploadImage(await load("logo.jpg"), "brand", admin!.id);
  if (logo.ok) await query("UPDATE shop_settings SET logo_image_id = $1 WHERE id = 1", [logo.image.id]);
  await query("INSERT INTO collection (slug, name, description) VALUES ('fleurs', 'Fleurs', 'La collection florale.') ON CONFLICT DO NOTHING");
  const res = await createDemoProducts(admin!.id, load);
  if (!res.ok) throw new Error(res.error);
  console.log("✓ Démo prête. Administration : creatrice@boutique.test / paillettes-demo-2026");
  await pool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
