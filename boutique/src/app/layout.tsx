import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { connection } from "next/server";
import { getSettings } from "@/lib/server/cached";
import { isTestModeInProduction, siteUrl } from "@/lib/server/env";
import { getTheme, themeCss } from "@/lib/themes";
import "./globals.css";

// Polices auto-hébergées au moment de la construction : aucune requête vers
// Google depuis le navigateur des clientes (confidentialité, rapidité).
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

async function safeSettings() {
  try {
    return await getSettings();
  } catch (err) {
    console.error("[layout] paramètres indisponibles", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const s = await safeSettings();
  const name = s?.shopName ?? "La Bohème en Paillettes";
  const description = s?.tagline ? `${s.tagline}. ${s.introText}`.slice(0, 160) : "Bijoux en résine pailletée, faits main.";
  const favicon = s?.favicon ?? s?.logo;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${name} — ${s?.tagline || "Bijoux faits main"}`, template: `%s — ${name}` },
    description,
    applicationName: name,
    openGraph: { type: "website", locale: "fr_FR", siteName: name },
    icons: favicon ? { icon: `${favicon.base}/${favicon.widths[0]}.webp`, apple: `${favicon.base}/og.jpg` } : { icon: "/icon.svg" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF8F2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const s = await safeSettings();
  const theme = getTheme(s?.themeId);
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <head>
        <style id="theme">{themeCss(theme)}</style>
      </head>
      <body className="min-h-dvh">
        {isTestModeInProduction() && (
          <div role="status" className="bg-warning-bg text-warning px-4 py-2 text-center text-sm font-semibold">
            Boutique en mode test : aucun paiement réel n&apos;est encaissé.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
