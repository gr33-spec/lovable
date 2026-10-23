/**
 * « METS TON NÉGOCE DANS LA BOUCLE » (Greg, 23 octobre 2026) : le message que l'artisan envoie à son négoce (WhatsApp, SMS
 * ou copié), vouvoyé, mot pour mot. Le lien est la racine du site : avant la clôture il n'y a pas encore de grille, le
 * négoce la recevra par e-mail à la clôture.
 */
export const messageAuNegoceEnBoucle = (lien: string) =>
  `Bonjour, je passe par BatiClair pour commander mes matériaux groupés avec d'autres couvreurs. Vous pouvez chiffrer tout le volume de la commande ici : ${lien}`;
