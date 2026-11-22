import type { MetadataRoute } from "next";
import { deployEnv, siteUrl } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Préproduction : jamais indexée.
  if (deployEnv() !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/panier", "/commande", "/api/", "/dev/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
