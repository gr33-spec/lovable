import type { MetadataRoute } from "next";

/**
 * « Sur l'écran d'accueil » : l'application s'ouvre comme une app (plan du 20 octobre 2026, bloc 7). Les icônes PNG sont
 * générées par `scripts/icones-pwa.mjs` depuis `icon.svg` : iPhone n'installe pas un SVG, Android découpe la « maskable ».
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BatiClair",
    short_name: "BatiClair",
    description: "Tes devis deviennent tes bons de commande, et tes commandes se regroupent avec les autres artisans du département.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f6",
    theme_color: "#0e1116",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
