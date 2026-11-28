import type { MetadataRoute } from "next";
import { indexationActive, ORIGINE_PRODUCTION, ROBOTS_ENTRAINEMENT } from "@/lib/indexation";

/**
 * robots.txt (Greg, 28 novembre 2026 : « recherche oui, entraînement non »). Tous les robots de recherche peuvent lire ;
 * les robots d'entraînement des modèles sont refusés (`ROBOTS_ENTRAINEMENT`). Rien d'autre n'est interdit : ce qui doit
 * rester hors des moteurs le dit par l'en-tête `noindex` (`lib/indexation.ts`), qu'un robot doit pouvoir lire. Le sitemap
 * n'est annoncé que sur mobiiz.fr en production.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: [...ROBOTS_ENTRAINEMENT], disallow: "/" },
    ],
    ...(indexationActive(process.env) ? { sitemap: `${ORIGINE_PRODUCTION}/sitemap.xml` } : {}),
  };
}
