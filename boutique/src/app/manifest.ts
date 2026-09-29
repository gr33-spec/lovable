import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/server/cached";
import { getTheme } from "@/lib/themes";
import { plainText } from "@/components/ui/sparkle";

export const dynamic = "force-dynamic";

// Permet d'ajouter la boutique (et l'administration) à l'écran d'accueil du téléphone.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const t = getTheme(s.themeId).tokens;
  const icon = s.favicon ?? s.logo;
  return {
    name: s.shopName,
    short_name: s.shopName.length > 14 ? "La Bohème" : s.shopName,
    description: plainText(s.tagline),
    start_url: "/",
    display: "standalone",
    background_color: t.background,
    theme_color: t.background,
    lang: "fr",
    icons: icon ? [{ src: `${icon.base}/og.jpg`, sizes: "512x512", type: "image/jpeg" }] : [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
