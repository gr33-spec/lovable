import type { Metadata, Viewport } from "next";
import { Archivo, Space_Mono, Inter } from "next/font/google";
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
  themeColor: "#f1eadb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${spaceMono.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
