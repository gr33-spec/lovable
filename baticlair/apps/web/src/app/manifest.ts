import type { MetadataRoute } from "next";
import { NOM_APP } from "@/lib/nom";

/**
 * « Sur l'écran d'accueil » : l'application s'ouvre comme une app (plan du 20 octobre 2026, bloc 7). Les icônes PNG sont
 * celles de la marque Mobiiz (24 octobre 2026, tirées du logo du fondateur, jaune #FFC800 et noir) : iPhone n'installe pas un
 * SVG, Android découpe la « maskable ».
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: NOM_APP,
    short_name: NOM_APP,
    description: "Tes devis deviennent tes bons de commande, et tes commandes se regroupent avec les autres artisans du département.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFC800",
    theme_color: "#0E0E0E",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
