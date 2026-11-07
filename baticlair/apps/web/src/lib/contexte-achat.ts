/**
 * LE CONTEXTE « VENU D'UN ACHAT GROUPÉ » (Greg, 1er novembre 2026) : l'artisan qui part de « Ajouter mes quantités » vers
 * une liste (importer, photographier, décrire) ne doit pas se voir redemander s'il veut un achat groupé. L'achat choisi
 * est gardé dans l'onglet (sessionStorage), lu sur la liste validée, puis oublié. Jamais une donnée d'une autre entreprise :
 * seulement l'identifiant de l'achat, que le serveur revérifie.
 */
const CLE = "mobiiz.contexte-achat";

export interface ContexteAchat {
  achatId: string;
  titre: string | null;
}

export function retenirContexteAchat(c: ContexteAchat): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    // Navigation privée stricte : le contexte se perd, l'artisan choisit l'achat lui-même.
  }
}

export function lireContexteAchat(): ContexteAchat | null {
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const c = JSON.parse(brut) as Partial<ContexteAchat>;
    return typeof c.achatId === "string" && c.achatId ? { achatId: c.achatId, titre: typeof c.titre === "string" ? c.titre : null } : null;
  } catch {
    return null;
  }
}

export function oublierContexteAchat(): void {
  try {
    sessionStorage.removeItem(CLE);
  } catch {
    // rien
  }
}
