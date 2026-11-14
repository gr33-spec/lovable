/**
 * LA SYNCHRONISATION EXPLICITE DU CATALOGUE (Greg, 12 novembre 2026 : « explicite, idempotente, testable, rejouable sans
 * doublon, indépendante de la consultation d'un utilisateur, sans écrasement des données existantes, avec un relevé avant
 * et après »). Les articles de l'amorce absents de la base y entrent ; rien n'est modifié ni supprimé.
 *
 *   DATABASE_URL=… pnpm exec tsx scripts/synchroniser-catalogue.ts            # relevé seul, rien n'est écrit
 *   DATABASE_URL=… pnpm exec tsx scripts/synchroniser-catalogue.ts --ecrire   # ajoute les articles absents
 *
 * Jamais lancé par le déploiement : c'est un geste décidé (ou le bouton de l'admin, `POST /v1/admin/catalogue/synchronisation`).
 */
import { PrismaService } from "../src/platform/database/prisma.service.js";
import { CatalogueService } from "../src/modules/catalogue/application/catalogue.service.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manque.");
  process.exit(2);
}
const prisma = new PrismaService(url);
const catalogue = new CatalogueService(prisma);
try {
  if (process.argv.includes("--ecrire")) {
    const r = await catalogue.synchroniser();
    console.log(JSON.stringify({ ecrit: true, ...r }, null, 2));
  } else {
    console.log(JSON.stringify({ ecrit: false, etat: await catalogue.etatDeSynchronisation() }, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
