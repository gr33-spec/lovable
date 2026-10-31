// Fige l'empreinte (SHA-256) de chaque migration Prisma dans prisma/migrations/empreintes.json.
// À lancer quand on AJOUTE une migration (`node scripts/empreintes-migrations.mjs`) ; une migration déjà figée ne se modifie
// plus jamais (dette n° 3, 20 octobre 2026 : une migration modifiée après application a cassé la prévisualisation).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");
const fichier = path.join(dir, "empreintes.json");
const anciennes = existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : {};
const empreintes = {};
for (const nom of readdirSync(dir).filter((n) => /^\d{14}_/.test(n)).sort()) {
  const sql = readFileSync(path.join(dir, nom, "migration.sql"));
  const e = createHash("sha256").update(sql).digest("hex");
  if (anciennes[nom] && anciennes[nom] !== e && !process.argv.includes("--forcer")) {
    console.error(`Refus : ${nom} est déjà figée avec une autre empreinte. Une migration poussée ne se modifie pas : écris-en une nouvelle.`);
    process.exit(1);
  }
  empreintes[nom] = e;
}
writeFileSync(fichier, `${JSON.stringify(empreintes, null, 2)}\n`);
console.log(`${Object.keys(empreintes).length} migrations figées dans prisma/migrations/empreintes.json`);
