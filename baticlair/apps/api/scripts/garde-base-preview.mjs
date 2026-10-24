// LA PRÉVISUALISATION NE TOUCHE JAMAIS LA BASE DE PRODUCTION (Greg, 24 octobre 2026). Lancé avant les migrations du
// build Vercel : en prévisualisation, si l'adresse de la base contient l'hôte de la base de production
// (`BASE_PRODUCTION_HOTE`, l'identifiant de son point d'accès Neon), le build s'arrête avant toute migration.
// Hors prévisualisation, ou sans `BASE_PRODUCTION_HOTE`, il ne fait rien. N'affiche jamais une adresse de base.
const hote = process.env.BASE_PRODUCTION_HOTE?.trim();
if (process.env.VERCEL_ENV === "preview" && hote) {
  const urls = [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].filter(Boolean);
  if (urls.some((u) => u.includes(hote))) {
    console.error("Refus : cette prévisualisation pointe sur la base de production. Rien n'est migré ; vérifie la branche Neon de la prévisualisation.");
    process.exit(1);
  }
  console.log(`Base de la prévisualisation : distincte de la production (${urls.length} adresse(s) vérifiée(s)).`);
}
