/** Une action « À faire » de la cloche (calculée : elle existe tant que la chose reste à faire). */
export interface AFaire {
  cle: string;
  texte: string;
  href: string;
}

/** La clé d'état d'une action « À faire » : si l'action à mener change, c'est une nouvelle notification. */
export const cleAFaire = (a: AFaire) => `${a.cle}|${a.texte}`.slice(0, 300);

/** Prévenir la cloche (dans l'en-tête) que l'état des notifications a changé. */
export const EVENEMENT_CLOCHE = "mobiiz:cloche";
export const prevenirLaCloche = () => window.dispatchEvent(new Event(EVENEMENT_CLOCHE));
