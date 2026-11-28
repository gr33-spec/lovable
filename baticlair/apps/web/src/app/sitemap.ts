import type { MetadataRoute } from "next";
import { indexationActive, ORIGINE_PRODUCTION, PAGES_INDEXABLES } from "@/lib/indexation";

/**
 * sitemap.xml (Greg, 28 novembre 2026) : les seules pages ouvertes aux moteurs (`PAGES_INDEXABLES`), avec l'adresse de
 * production ; vide hors de mobiiz.fr en production. Les sites des artisans y entreront avec leur liste publiée (à venir,
 * avec la discussion des écrans, quand `PAGES_ENTREPRISES_INDEXEES` sera allumé).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexationActive(process.env)) return [];
  return PAGES_INDEXABLES.map((p) => ({ url: `${ORIGINE_PRODUCTION}${p === "/" ? "" : p}` }));
}
