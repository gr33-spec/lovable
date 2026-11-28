/**
 * LES FICHIERS DÉJÀ EN BASE, CHIFFRÉS OU REMIS EN CLAIR (lot B, Greg, 26 octobre puis 16 novembre 2026). Un geste décidé,
 * jamais lancé par le déploiement. Rien n'est supprimé ; rejouable ; s'arrête au premier fichier illisible.
 *
 *   DATABASE_URL=… pnpm exec tsx scripts/fichiers-chiffrement.ts              # relevé seul, rien n'est écrit
 *   DATABASE_URL=… CHIFFREMENT_CLE=… pnpm exec tsx scripts/fichiers-chiffrement.ts chiffrer
 *   DATABASE_URL=… CHIFFREMENT_CLE=… pnpm exec tsx scripts/fichiers-chiffrement.ts dechiffrer
 *
 * La clé n'est jamais affichée. Le retour arrière complet est dans `docs/SECURITE.md` (lot B).
 */
import { Chiffreur, lireCle } from "../src/platform/chiffrement/chiffreur.js";
import { convertirFichiers } from "../src/platform/chiffrement/fichiers.js";
import { PrismaService } from "../src/platform/database/prisma.service.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manque.");
  process.exit(2);
}
const sens = process.argv[2];
if (sens !== undefined && sens !== "chiffrer" && sens !== "dechiffrer") {
  console.error("Usage : fichiers-chiffrement.ts [chiffrer|dechiffrer]");
  process.exit(2);
}
const chiffreur = new Chiffreur(lireCle(process.env.CHIFFREMENT_CLE));
const prisma = new PrismaService(url, chiffreur);
try {
  const releve = await convertirFichiers(prisma.$brut, chiffreur, sens);
  console.log(JSON.stringify({ ecrit: sens ?? false, cle: chiffreur.actif ? "posée" : "absente", releve }, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : "Erreur");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
