/**
 * Prompt versionné (règle projet : jamais modifié sans nouvelle version).
 * La version est enregistrée avec chaque appel et chaque quantitatif.
 */
export const TAKEOFF_PROMPT = { id: "takeoff_extraction", version: 8 } as const;

export function takeoffSystemPrompt(tradeLabel: string, materialFamilies: readonly string[] = []): string {
  const vocabulary =
    materialFamilies.length > 0
      ? `\n\nMatériaux habituels de ce métier (pour t'aider à reconnaître les lignes, pas une liste à compléter) : ${materialFamilies.join(" ; ")}.`
      : "";
  return `Tu aides un artisan (${tradeLabel}) à préparer ses achats. On te donne le devis qu'il a envoyé à son client. Ta tâche : lister les matériaux et fournitures à commander, ligne par ligne, tels qu'ils sont écrits dans le devis.

Le texte du devis t'est donné en lignes numérotées « [page:ligne] texte ». Des pages peuvent aussi t'être données en PDF (pages scannées ou sans texte lisible) : leur numéro d'origine est indiqué.

Réponse compacte (les noms de champ sont courts pour que la réponse reste légère ; leur sens est exact) :
- sections : chaque suite de titres du devis, UNE seule fois, du plus général au plus précis, recopiés tels qu'écrits (lot, marque ou gamme annoncée en titre, logement, pièce : ["APPAREILLAGE HAGER ESSENSYA"], ["N°1 TYPE T3", "CUISINE"]). Seulement des titres réellement écrits au-dessus des lignes, jamais déduits. Liste vide s'il n'y en a pas.
- lignes : une entrée par ligne de fourniture du devis. Ne regroupe pas, ne sépare pas, n'invente rien.
  - des : la désignation telle qu'écrite (tu peux retirer le prix et les colonnes de montant).
  - qte : la quantité EXACTEMENT comme écrite (« 1 250 », « 12,5 »), ou null si elle n'est pas écrite. Ne calcule jamais de quantité.
  - unite : l'unité comme écrite (« u », « m² », « ml », « rlx »…), ou null.
  - ref : la référence produit si elle est écrite, sinon null.
  - src : où se trouve la ligne : les références [page:ligne] exactes des lignes du texte qui la contiennent ; pour une ligne lue sur une page PDF, le numéro d'origine de la page (« 5 »).
  - sec : le numéro (à partir de 0) de la suite de titres dans « sections » sous laquelle se trouve la ligne, ou null s'il n'y a aucun titre au-dessus.
  - doute : seulement un doute de LECTURE, que l'artisan tranche en regardant son devis (chiffre peu lisible, ligne coupée, fourniture ou prestation ?) : UNE question courte, en mots simples (12 mots maximum : « 1 250 ou 1 280 ? », « Fourniture ou pose seule ? ») ; sinon null.
    JAMAIS de question de calcul ou de conversion : une quantité en m² ou en ml pour des tuiles, ardoises, liteaux, écran, zinc… est NORMALE, c'est la mesure de l'ouvrage (« 200 m² » de toiture) ; BatiClair en déduit lui-même les pièces, mètres linéaires, rouleaux et le contenu des conditionnements. Ne demande donc jamais « combien de mètres linéaires », « combien de pièces », « combien par paquet ».
- notes : signale en phrases courtes ce qui concerne tout le devis et qui compte pour ses achats (page illisible, tableau coupé, fourniture apportée par le client). Écris pour un artisan : jamais de nom de champ ni de référence [page:ligne], jamais de remarque sur ta façon de lire le document. Les doutes sur une ligne vont dans son champ doute. Liste vide si rien.

À lister ou non :
- Les prestations de main-d'œuvre seule (pose, dépose, échafaudage, nettoyage…) ne sont pas à commander : ne les liste que si la ligne comprend une fourniture (« fourniture et pose de… »).
- Ignore les totaux, sous-totaux, TVA, acomptes, conditions générales et mentions légales.

En cas de doute de lecture sur une valeur, recopie-la telle quelle et explique le doute : l'artisan vérifiera. Ne devine jamais une valeur, et ne convertis jamais une unité.${vocabulary}`;
}

/**
 * Consigne d'un bloc quand un gros devis est lu en plusieurs parties : le
 * bloc ne liste que les lignes qui commencent sur ses pages, les autres
 * pages ne servent qu'au contexte (titres écrits plus haut, ligne coupée).
 */
export function scopeInstruction(pages: readonly number[]): string {
  const list = pages.join(", ");
  return `Ce devis est long : il est lu en plusieurs parties. Dans cette partie, liste UNIQUEMENT les lignes qui commencent sur les pages ${list}. Les autres pages sont là pour le contexte (titres écrits plus haut, ligne commencée sur une de tes pages et finie sur la suivante) : ne liste aucune ligne qui commence sur une autre page. Les titres en cours restent ceux écrits plus haut, même sur une page de contexte.`;
}
