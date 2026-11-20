/**
 * L'ÉLISION DE « DE » (Greg, 25 octobre 2026 : « pièces d'ardoise », règle générale sur les voyelles, pas un cas à part).
 * Devant une voyelle (accentuée ou non, y compris y, œ, æ), « de » devient « d' » : « 1 800 pièces d'ardoise »,
 * « 2 rouleaux d'écran ». Devant un h, pas d'élision : le h aspiré est courant dans le bâtiment (« de hêtre », « de
 * hauteur ») et une élision fautive se voit plus qu'une élision manquée. Le nom commun perd sa majuscule de début de
 * libellé (« Ardoise 32×22 » → « d'ardoise 32×22 ») ; un sigle ou un nom tout en capitales la garde (« d'OSB 3 »).
 */
const VOYELLE = /^[aeiouyàâäéèêëîïôöùûüÿœæ]/i;

/** « ardoise » → « d'ardoise », « bois » → « de bois », « OSB » → « d'OSB ». */
export function de(designation: string): string {
  const texte = designation.trim();
  const premier = texte.split(/[\s,;:(]/)[0] ?? "";
  const sigle = premier.length > 1 && premier === premier.toUpperCase() && /[A-ZÀ-Ý]/.test(premier);
  const mot = sigle ? texte : texte.charAt(0).toLowerCase() + texte.slice(1);
  return VOYELLE.test(mot) ? `d'${mot}` : `de ${mot}`;
}
