import type { Metadata } from "next";
import { NOM_APP } from "@/lib/nom";
import { origineDuSite } from "@/lib/origine";
import { metadonneesPubliques } from "@/lib/partage";
import { Landing } from "../decouvrir/landing";

/** /peintres (Greg, 26 octobre 2026) : la même page, le bloc peinture en pleine place, juste sous l'accroche. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = metadonneesPubliques(`${NOM_APP} pour les peintres`, "Peinture, sous-couche, enduit : le même pot, deux fois moins cher en palette négociée. Mobiiz additionne les commandes des artisans du secteur et négocie le prix de gros pour chacun.");

export default async function PeintresPage() {
  return <Landing cible="peintres" origine={await origineDuSite()} />;
}
