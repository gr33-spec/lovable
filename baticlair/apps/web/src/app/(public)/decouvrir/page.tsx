import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";
import { metadonneesPubliques } from "@/lib/partage";
import { LandingPremium } from "./landing-premium";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

// La landing « premium V3 » (Greg, 30 octobre 2026) : titre et description de la maquette.
export const metadata: Metadata = metadonneesPubliques(`${NOM_APP} · Plus on est, moins on paie.`, `${NOM_APP} : prépare tes listes de matériaux, compare tes négoces et découvre la puissance des achats groupés entre artisans.`);

export default function BienvenuePage() {
  return <LandingPremium />;
}
