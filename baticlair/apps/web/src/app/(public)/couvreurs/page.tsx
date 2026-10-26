import type { Metadata } from "next";
import { headers } from "next/headers";
import { NOM_APP } from "@/lib/nom";
import { Landing } from "../decouvrir/landing";

/** /couvreurs (business model final, Greg, 25 octobre 2026) : la même page, les exemples de couverture d'abord (ardoise, zinc, bois). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NOM_APP} pour les couvreurs`,
  description: "Ardoise, zinc, bois de charpente : tes quantitatifs au propre, tes demandes de prix en quelques clics, la force du groupe en plus.",
};

export default async function CouvreursPage() {
  return <Landing couvreurs nonce={(await headers()).get("x-nonce") ?? undefined} />;
}
