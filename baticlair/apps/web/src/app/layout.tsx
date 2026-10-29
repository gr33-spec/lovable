import { ChampVisible } from "@/components/champ-visible";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import { EnregistrementServiceWorker } from "@/components/service-worker";
import { ACCROCHE_APP, NOM_APP, SLOGAN_APP } from "@/lib/nom";
import { origineDuSite } from "@/lib/origine";

// Plan « finition », bloc 5 (Lighthouse, décalage 0,21 sur les pages légales) : la police passe par next/font,
// qui les précharge et dessine d'abord une police de secours aux mêmes mesures ; le texte ne bouge plus à leur arrivée.
// Même fichier qu'avant (paquet @fontsource), sous-ensemble latin (français compris). Passe UI/UX (23 octobre) : une
// seule famille, Plus Jakarta Sans ; Bricolage Grotesque n'est plus chargée.
const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
});
// Direction « chantier haute visibilité » (Greg, 23 octobre au soir : « un truc qui déchire ») : Bricolage Grotesque,
// déjà dans les dépendances, pour les titres et les grands chiffres ; Plus Jakarta Sans reste le texte.
const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-bricolage",
});

const METADONNEES: Metadata = {
  title: { default: NOM_APP, template: `%s · ${NOM_APP}` },
  description: "L'assistant d'achat de matériaux des artisans.",
  applicationName: NOM_APP,
  // L'écran de démarrage iPhone et iPad (revue du 26 octobre 2026) : le logo sur le jaune, une image par taille d'écran.
  appleWebApp: {
    capable: true,
    title: NOM_APP,
    statusBarStyle: "default",
    startupImage: [
      { url: "/demarrage/iphone-se.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/demarrage/iphone-15.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/demarrage/iphone-15-plus.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/demarrage/ipad.png", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  // L'icône de l'écran d'accueil iPhone (180 px, sans transparence) et celle des onglets.
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
  // L'image de partage (lien collé dans WhatsApp ou un SMS), 1200 × 630, dans l'identité de la landing (26 octobre 2026) ;
  // avant, le logo sur fond noir (`/marque/og.png`, gardé).
  openGraph: { siteName: NOM_APP, title: NOM_APP, description: `${ACCROCHE_APP} ${SLOGAN_APP}`, locale: "fr_FR", type: "website", images: [{ url: "/marque/partage.png", width: 1200, height: 630, alt: `${NOM_APP} : ton devis, ta liste de matériaux, tes prix` }] },
  twitter: { card: "summary_large_image", title: NOM_APP, images: ["/marque/partage.png"] },
};

/**
 * L'adresse de base des liens de partage : celle que le visiteur a tapée (Greg, 26 octobre 2026 : « l'image de partage pointe
 * vers vercel.app au lieu du domaine courant ») ; sans elle, Next prenait l'adresse technique du déploiement.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { ...METADONNEES, metadataBase: new URL(await origineDuSite()) };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Plein écran sur iPhone : la barre du bas et le bouton principal respectent la zone du geste (safe-area).
  viewportFit: "cover",
  themeColor: "#120e0a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Rendu à la demande : le nonce de la Content-Security-Policy change à chaque requête (`src/proxy.ts`).
  await connection();
  return (
    <html lang="fr" className={`${jakarta.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <EnregistrementServiceWorker />
        <ChampVisible />
      </body>
    </html>
  );
}
