import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations : connexion directe (Neon fournit DATABASE_URL_UNPOOLED) ;
  // l'application, elle, utilise DATABASE_URL (connexions mutualisées).
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
