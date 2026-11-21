/**
 * LE NOUVEL ONBOARDING, « ESSAIE D'ABORD » (Greg, 19 novembre 2026 ; RÈGLE CHANGÉE : avant, l'inscription demandait d'un coup
 * nom, entreprise, métier, e-mail et mot de passe) : carte de France, région, département, métier, puis e-mail et portable,
 * rien d'autre ; l'artisan essaie tout de suite le quantitatif. Le SIRET n'est demandé qu'au moment d'envoyer aux négoces,
 * de rejoindre ou lancer un achat groupé, ou de commander, et l'entreprise trouvée doit être confirmée (« C'est bien mon
 * entreprise ») avant que rien ne parte. Les comptes créés avant ce parcours ne sont pas touchés. Code pur, sans import.
 */

/** La marque d'une entreprise créée par ce parcours (`company.parcours_inscription`). */
export const PARCOURS_ESSAI = "essai";

/** Pourquoi on demande le SIRET, en une phrase, au moment où on le demande. */
export const PHRASE_POURQUOI_SIRET = "Pour que les négoces sachent à qui ils répondent, on vérifie ton entreprise avec son SIRET.";

/** Le refus du serveur tant que l'entreprise n'est pas confirmée (rien ne part chez un négoce). */
export const PHRASE_IDENTITE_A_CONFIRMER = "Confirme d'abord ton entreprise avec ton SIRET : rien ne part chez un négoce avant.";

/** Le message pour un métier autre que couvreur : il entre quand même. */
export const PHRASE_METIER_EN_RODAGE =
  "Mobiiz est réglé d'abord pour les couvreurs. Tu peux déjà tout utiliser, mais la lecture de devis pour ton métier est encore en rodage. On te prévient dès qu'elle est prête.";

/** Une entreprise de ce parcours doit avoir confirmé son identité ; les autres, jamais (comptes d'avant). */
export const identiteAConfirmer = (c: { parcoursInscription: string | null; identiteConfirmeeLe: Date | null }): boolean => c.parcoursInscription === PARCOURS_ESSAI && !c.identiteConfirmeeLe;

/**
 * Les libellés des codes d'activité (NAF rév. 2, INSEE) du bâtiment, pour dire « l'activité » de l'entreprise trouvée.
 * Un code absent de la table se dit tel quel (« Code d'activité 46.73A »), jamais deviné.
 */
const NAF: Record<string, string> = {
  "16.23Z": "Fabrication de charpentes et d'autres menuiseries",
  "41.20A": "Construction de maisons individuelles",
  "41.20B": "Construction d'autres bâtiments",
  "43.11Z": "Travaux de démolition",
  "43.12A": "Travaux de terrassement courants et travaux préparatoires",
  "43.12B": "Travaux de terrassement spécialisés ou de grande masse",
  "43.13Z": "Forages et sondages",
  "43.21A": "Travaux d'installation électrique dans tous locaux",
  "43.21B": "Travaux d'installation électrique sur la voie publique",
  "43.22A": "Travaux d'installation d'eau et de gaz en tous locaux",
  "43.22B": "Travaux d'installation d'équipements thermiques et de climatisation",
  "43.29A": "Travaux d'isolation",
  "43.29B": "Autres travaux d'installation n.c.a.",
  "43.31Z": "Travaux de plâtrerie",
  "43.32A": "Travaux de menuiserie bois et PVC",
  "43.32B": "Travaux de menuiserie métallique et serrurerie",
  "43.32C": "Agencement de lieux de vente",
  "43.33Z": "Travaux de revêtement des sols et des murs",
  "43.34Z": "Travaux de peinture et vitrerie",
  "43.39Z": "Autres travaux de finition",
  "43.91A": "Travaux de charpente",
  "43.91B": "Travaux de couverture par éléments",
  "43.99A": "Travaux d'étanchéification",
  "43.99B": "Travaux de montage de structures métalliques",
  "43.99C": "Travaux de maçonnerie générale et gros œuvre de bâtiment",
  "43.99D": "Autres travaux spécialisés de construction",
  "43.99E": "Location avec opérateur de matériel de construction",
};

export function libelleActivite(naf: string | null | undefined): string | null {
  const code = (naf ?? "").trim().toUpperCase();
  if (!code) return null;
  return NAF[code] ?? `Code d'activité ${code}`;
}
