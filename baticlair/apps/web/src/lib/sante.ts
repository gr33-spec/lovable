import { api, type Health } from "@/lib/api";

/**
 * L'ÉTAT DE SANTÉ DU SERVEUR, DEMANDÉ UNE FOIS (10 novembre 2026) : le menu, l'accueil et le menu du compte lisent tous les
 * réglages publics (`groupe`, `missions`). Sans ce cache, chaque écran posait trois ou quatre fois la même question au
 * serveur. La réponse vaut une minute ; une panne n'est jamais gardée.
 */
let enCours: { le: number; promesse: Promise<Health> } | null = null;
export function santeUneFois(): Promise<Health> {
  const maintenant = Date.now();
  if (enCours && maintenant - enCours.le < 60_000) return enCours.promesse;
  const promesse = api<Health>("/v1/health");
  enCours = { le: maintenant, promesse };
  promesse.catch(() => {
    if (enCours?.promesse === promesse) enCours = null;
  });
  return promesse;
}
