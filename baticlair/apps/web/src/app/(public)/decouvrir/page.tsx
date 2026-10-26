import type { Metadata } from "next";
import { headers } from "next/headers";
import { NOM_APP } from "@/lib/nom";
import { Landing } from "./landing";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NOM_APP}, tes quantitatifs et tes demandes de prix`,
  description: "Tes quantitatifs au propre. Tes demandes de prix en quelques clics. La force du groupe en plus.",
};

export default async function BienvenuePage() {
  return <Landing nonce={(await headers()).get("x-nonce") ?? undefined} />;
}
