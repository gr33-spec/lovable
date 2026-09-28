import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BatiClair — Le juste prix de tes matériaux",
  description:
    "Compare tes devis, vérifie tes factures et ne te fais plus avoir sur le prix de tes matériaux.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f1a" },
  ],
};

// Applique le thème stocké avant le premier rendu pour éviter le flash.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${spaceMono.variable} ${inter.variable} h-full`}
      suppressHydrationWarning
    >
      {/* Le script de thème ajoute/enlève .dark avant l'hydratation : un
          écart HTML serveur/client est attendu sur <html>, d'où ce flag. */}
      <body className="min-h-full bg-paper text-ink antialiased md:bg-desktop-bg">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
