/**
 * « METS TON NÉGOCE DANS LA BOUCLE » (Greg, 23 octobre 2026) : le message que l'artisan envoie à son négoce (WhatsApp, SMS
 * ou copié), vouvoyé, mot pour mot. Le lien est l'invitation du négoce (`/negoce/rejoindre/<jeton>`, le même pour tous
 * les artisans qui l'ajoutent) : il crée son accès en une minute et reçoit chaque grille à la clôture. Sans lien
 * d'invitation (ancienne API), la racine du site.
 */
export const messageAuNegoceEnBoucle = (lien: string) =>
  `Bonjour, je passe par BatiClair pour commander mes matériaux groupés avec d'autres couvreurs. Vous pouvez chiffrer tout le volume de la commande ici : ${lien}`;
