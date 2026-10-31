/**
 * TITRES DE DATE LISIBLES (Greg, 28 octobre 2026, point 7) : « Liste du 28 octobre », jamais « Devis du 2026-10-28 ».
 * Un nom de liste créé sans référence porte la date en toutes lettres ; un ancien nom à date ISO s'affiche pareil.
 */
const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

/** « 28 octobre », « 1er novembre ». */
export const jourEnLettres = (d: Date): string => JOUR.format(d).replace(/^1 /, "1er ");

/** Le nom d'une liste créée sans référence : « Liste du 28 octobre ». */
export const nomDeListe = (d: Date): string => `Liste du ${jourEnLettres(d)}`;

/** « Devis du 2026-10-28 » (ou « Liste du 2026-10-28 ») devient « Liste du 28 octobre » ; tout autre nom reste tel quel. */
export function titreLisible(nom: string): string {
  const m = /^(?:Devis|Liste) du (\d{4})-(\d{2})-(\d{2})$/.exec(nom.trim());
  if (!m) return nom;
  return nomDeListe(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)));
}
