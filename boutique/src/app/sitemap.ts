import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { products, categories } = await sitemapEntries();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/boutique`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/boutique/${c.slug}`, lastModified: c.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/produit/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...["a-propos", "contact", "livraison-retours", "cgv", "mentions-legales", "confidentialite"].map((p) => ({ url: `${base}/${p}`, priority: 0.3 })),
  ];
}
