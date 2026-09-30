import type { MetadataRoute } from "next";

/** « Sur l'écran d'accueil » : l'application s'ouvre comme une app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BatiClair",
    short_name: "BatiClair",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#0e1116",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
