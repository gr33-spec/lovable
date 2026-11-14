import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";

/**
 * Les métadonnées d'une page publique, aperçu de partage compris (WhatsApp, SMS : c'est ainsi que les artisans se passent la
 * page, Greg, 26 octobre 2026). Next remplace en bloc l'`openGraph` du parent : l'image est donc redonnée ici.
 */
export function metadonneesPubliques(titre: string, description: string): Metadata {
  const image = { url: "/marque/partage.png", width: 1200, height: 630, alt: `${NOM_APP} : ton devis, ta liste de matériaux, tes prix` };
  return {
    title: { absolute: titre },
    description,
    openGraph: { siteName: NOM_APP, title: titre, description, locale: "fr_FR", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: titre, description, images: [image.url] },
  };
}
