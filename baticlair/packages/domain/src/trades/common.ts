/**
 * Socle commun à tous les métiers : vocabulaire de la main-d'œuvre, de la
 * fourniture et des pages sans matériaux. Chaque profil y ajoute le sien.
 */
export const COMMON_LABOR: readonly string[] = [
  "main d oeuvre", "depose", "demontage", "echafaudage", "location", "benne", "evacuation",
  "mise en decharge", "nettoyage", "deplacement", "installation de chantier", "repli de chantier",
  "protection", "mise en securite", "diagnostic", "garantie", "etude", "prestation", "mise en service",
  // Verbes de prestation : ils ne comptent qu'en TÊTE de ligne ou avant tout matériau (voir lineKind).
  "installation", "application", "percement", "mesure", "essai", "formation", "frais de port",
];

/**
 * Les seuls mots qui retirent le matériau d'une ligne qui en nomme un (retour du fondateur, 2026-10-05) : « Pose de
 * tuiles » se commande, « pose seule » ou « tuiles fournies par le client » non. « Pose » seul ne retire jamais rien.
 */
export const LABOR_ONLY: readonly string[] = [
  "pose seule", "main d oeuvre seule", "fourni par le client", "fournie par le client", "fournis par le client",
  "fournies par le client", "hors fourniture",
];

export const COMMON_SUPPLY: readonly string[] = ["fourniture", "fournir", "fourni"];

export const COMMON_BOILERPLATE: readonly string[] = [
  "conditions generales de vente",
  "conditions generales",
  "clause de reserve de propriete",
  "reserve de propriete",
  "tribunal de commerce",
  "penalites de retard",
  "indemnite forfaitaire pour frais de recouvrement",
  "article 1",
  "article 2",
  "mediateur de la consommation",
  "droit de retractation",
  "garantie decennale",
];
