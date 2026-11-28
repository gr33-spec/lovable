import type { Metadata } from "next";
import { headers } from "next/headers";
import { EDITEUR } from "@/lib/legal";
import { ACCROCHE_APP, NOM_APP } from "@/lib/nom";
import { donneesOrganisation } from "@/lib/organisation";
import { origineCanonique } from "@/lib/origine";
import { metadonneesPubliques } from "@/lib/partage";
import { LandingPremium } from "./landing-premium";

/**
 * Servie à la place de « / » pour un visiteur (voir `proxy.ts`) : rendue à chaque demande, jamais gardée dans le cache du
 * navigateur de Next, sinon l'artisan qui vient de créer son compte reverrait cette page au lieu de son accueil.
 */
export const dynamic = "force-dynamic";

// La landing « premium V3 » (Greg, 30 octobre 2026) : titre et description de la maquette.
// Référencement (Greg, 28 novembre 2026) : une seule adresse pour la landing, « / » (aussi servie sous /decouvrir).
const base = metadonneesPubliques(`${NOM_APP} · Plus on est, moins on paie.`, `${NOM_APP} : prépare tes listes de matériaux, compare tes négoces et découvre la puissance des achats groupés entre artisans.`);
export const metadata: Metadata = { ...base, alternates: { canonical: "/" }, openGraph: { ...base.openGraph, url: "/" } };

export default async function BienvenuePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const donnees = donneesOrganisation(await origineCanonique(), { nom: NOM_APP, editeur: EDITEUR.nom, email: EDITEUR.contact, accroche: ACCROCHE_APP });
  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }} />
      <LandingPremium />
    </>
  );
}
