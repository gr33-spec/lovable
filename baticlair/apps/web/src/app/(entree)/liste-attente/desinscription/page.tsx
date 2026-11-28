import type { Metadata } from "next";
import { Desinscription } from "./desinscription";

export const metadata: Metadata = { title: "Désinscription · Mobiiz", robots: { index: false, follow: false } };

/**
 * CHANTIER 05 (Greg, 28 novembre 2026) : la désinscription en un clic, depuis le lien de l'e-mail. La page la fait
 * d'elle-même à l'ouverture (un robot qui lit les liens d'un e-mail sans ouvrir la page ne désinscrit personne).
 */
export default async function PageDesinscription({ searchParams }: { searchParams: Promise<{ jeton?: string | string[] }> }) {
  const { jeton } = await searchParams;
  return <Desinscription jeton={typeof jeton === "string" ? jeton : ""} />;
}
