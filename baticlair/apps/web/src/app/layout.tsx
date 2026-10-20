import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "BatiClair", template: "%s · BatiClair" },
  description: "L'assistant d'achat de matériaux des artisans.",
  applicationName: "BatiClair",
  appleWebApp: { capable: true, title: "BatiClair", statusBarStyle: "default" },
  // L'icône de l'écran d'accueil iPhone (180 px, sans transparence) et celle des onglets.
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Plein écran sur iPhone : la barre du bas et le bouton principal respectent la zone du geste (safe-area).
  viewportFit: "cover",
  themeColor: "#f3f4f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
