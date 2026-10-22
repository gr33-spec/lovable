import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

// Plan « finition », bloc 5 (Lighthouse, décalage 0,21 sur les pages légales) : les deux polices passent par next/font,
// qui les précharge et dessine d'abord une police de secours aux mêmes mesures ; le texte ne bouge plus à leur arrivée.
// Mêmes fichiers qu'avant (paquets @fontsource), sous-ensemble latin (français compris).
const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
});
const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-bricolage",
});

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
    <html lang="fr" className={`${jakarta.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
