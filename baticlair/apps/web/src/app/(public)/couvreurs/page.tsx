import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";
import { origineDuSite } from "@/lib/origine";
import { metadonneesPubliques } from "@/lib/partage";
import { Landing } from "../decouvrir/landing";

/** /couvreurs (business model final, Greg, 25 octobre 2026) : la même page, les exemples de couverture d'abord (ardoise, zinc, bois). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = metadonneesPubliques(`${NOM_APP} pour les couvreurs`, "Ardoise, zinc, bois de charpente : tu déposes ton devis, ta liste de matériaux sort au propre, tes négoces chiffrent, tu compares. Par un artisan, pour les artisans.");

export default async function CouvreursPage() {
  return <Landing couvreurs origine={await origineDuSite()} />;
}
