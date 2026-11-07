import { headers } from "next/headers";

/**
 * L'adresse du site telle que le visiteur l'a tapée (test.mobiiz.fr, mobiiz.fr, local), lue sur la requête. Elle sert au lien
 * de partage écrit dans la page et aux métadonnées de partage (image WhatsApp et SMS) ; sans elle, Next prenait l'adresse
 * technique du déploiement (`*.vercel.app`) et le message de partage partait avec « Rejoins-nous : / » (Greg, 26 octobre 2026).
 */
export async function origineDuSite(): Promise<string> {
  const h = await headers();
  const hote = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0]!.trim();
  const proto = (h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(hote) ? "http" : "https")).split(",")[0]!.trim();
  return `${proto}://${hote}`;
}
