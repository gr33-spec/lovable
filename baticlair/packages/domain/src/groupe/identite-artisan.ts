/**
 * L'IDENTITÉ DE L'ARTISAN, AU BON MOMENT (Greg, lot final, point 1) : il teste librement avec son seul e-mail ; au premier
 * envoi à un négoce, UN écran demande le SIRET, le prénom et le portable (le SIRET remplit le nom de l'entreprise et
 * l'adresse, le prénom du dirigeant est prérempli quand l'annuaire le donne). Demandé une fois, modifiable dans Profil.
 */
export const PHRASE_IDENTITE = "Ton négoce reçoit la demande au nom de ton entreprise, il doit te reconnaître.";

/** Un portable français : 06 ou 07, ou +33 6 / +33 7, dix chiffres. */
export function portableValide(t: string | null | undefined): boolean {
  const n = (t ?? "").replace(/[\s.\-()]/g, "").replace(/^\+33/, "0").replace(/^0033/, "0");
  return /^0[67]\d{8}$/.test(n);
}

/** « 06 12 34 56 78 » : le portable tel qu'on l'écrit. */
export function portableLisible(t: string): string {
  const n = t.replace(/[\s.\-()]/g, "").replace(/^\+33/, "0").replace(/^0033/, "0");
  return /^0\d{9}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : t.trim();
}

/** Le prénom tiré du nom du compte (« Jean Martin » → « Jean »), pour préremplir. */
export function prenomDe(nomComplet: string | null | undefined): string | null {
  const p = (nomComplet ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : null;
}

/** Le premier prénom d'un dirigeant (« JEAN PIERRE » → « Jean »), tel que l'annuaire l'écrit. */
export function prenomDirigeant(prenoms: string | null | undefined): string | null {
  const p = (prenoms ?? "").trim().split(/[\s,]+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : null;
}

/** L'identité suffit pour envoyer au nom de l'entreprise : un SIRET de 14 chiffres, un prénom, un portable. */
export function identiteComplete(c: { siret: string | null; prenom: string | null; telephone: string | null }): boolean {
  return /^\d{14}$/.test((c.siret ?? "").replace(/\s/g, "")) && !!c.prenom?.trim() && portableValide(c.telephone);
}
