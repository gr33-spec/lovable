// Restauration d'une sauvegarde complète (fichier JSON téléchargé depuis
// l'administration ou l'espace de stockage privé).
//   DATABASE_URL=… npm run db:restore -- sauvegarde.json --confirmer
// ATTENTION : remplace toutes les données actuelles de la base visée.
import { readFileSync } from "node:fs";

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) {
    console.error("Usage : npm run db:restore -- <fichier.json> --confirmer");
    process.exit(1);
  }
  const backup = JSON.parse(readFileSync(file, "utf8"));
  const counts = Object.entries(backup.tables ?? {}).map(([t, rows]) => `${t}: ${(rows as unknown[]).length}`);
  console.log(`Sauvegarde du ${backup.createdAt} (schéma ${backup.schema})\n${counts.join("\n")}`);
  if (flag !== "--confirmer") {
    console.log("\nAucune modification. Ajoutez --confirmer pour remplacer les données de la base.");
    return;
  }
  const { restoreBackup } = await import("../src/lib/server/backup");
  const { pool } = await import("../src/lib/server/db");
  await restoreBackup(backup);
  await pool().end();
  console.log("✓ Restauration terminée.");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
