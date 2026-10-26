import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";
import { origineDuSite } from "@/lib/origine";
import { metadonneesPubliques } from "@/lib/partage";
import { Landing } from "./landing";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = metadonneesPubliques(`${NOM_APP} · ton devis, ta liste de matériaux, tes prix`, "Par un artisan, pour les artisans. Tu déposes ton devis : ta liste de matériaux au propre, envoyée à tes négoces, leurs prix comparés livraison comprise.");

export default async function BienvenuePage() {
  return <Landing origine={await origineDuSite()} />;
}
