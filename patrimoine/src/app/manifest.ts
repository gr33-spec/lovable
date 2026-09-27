import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Patrimoine",
    short_name: "Patrimoine",
    description: "Pilotage patrimonial privé",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#0b2545",
    lang: "fr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
