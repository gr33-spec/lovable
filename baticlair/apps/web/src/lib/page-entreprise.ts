import type { ContenuPage } from "@baticlair/domain/page-entreprise";

/**
 * MA PAGE MOBIIZ : la lecture d'une page publique par le serveur du site, MISE EN CACHE (étiquette par adresse) et
 * régénérée à la modification (`/api/pages-entreprises/rafraichir`, appelé par l'éditeur et l'admin) ; au plus 5 minutes
 * sinon (un changement fait ailleurs, le téléphone du profil). 1 000 pages ou plus : l'API n'est appelée qu'une fois par
 * page et par changement, pas à chaque visite.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
export const etiquettePage = (adresse: string) => `page-entreprise:${adresse}`;
export const REVALIDATION_SECONDES = 300;

export type LecturePage = { contenu: ContenuPage } | { redirection: string } | null;

export async function lirePage(adresse: string): Promise<LecturePage> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(adresse) || adresse.length > 60) return null;
  const res = await fetch(`${API_URL}/v1/public/pages/${adresse}`, { headers: { accept: "application/json" }, next: { tags: [etiquettePage(adresse)], revalidate: REVALIDATION_SECONDES } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`page ${adresse} : ${res.status}`);
  return (await res.json()) as LecturePage;
}

/** Une adresse d'image rendue absolue (réseaux sociaux, Google) : les fichiers locaux passent par le site (/v1). */
export function absolue(url: string, origine: string): string {
  return /^https?:\/\//.test(url) ? url : `${origine}${url.startsWith("/") ? "" : "/"}${url}`;
}
