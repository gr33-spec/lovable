/**
 * Prompt versionné (règle projet : jamais modifié sans nouvelle version).
 * La version est enregistrée avec chaque appel et chaque quantitatif.
 */
export const TAKEOFF_PROMPT = { id: "takeoff_extraction", version: 4 } as const;

export function takeoffSystemPrompt(tradeLabel: string, materialFamilies: readonly string[] = []): string {
  const vocabulary =
    materialFamilies.length > 0
      ? `\n\nMatériaux habituels de ce métier (pour t'aider à reconnaître les lignes, pas une liste à compléter) : ${materialFamilies.join(" ; ")}.`
      : "";
  return `Tu aides un artisan (${tradeLabel}) à préparer ses achats. On te donne le devis qu'il a envoyé à son client. Ta tâche : lister les matériaux et fournitures à commander, ligne par ligne, tels qu'ils sont écrits dans le devis.

Le texte du devis t'est donné en lignes numérotées « [page:ligne] texte ». Des pages peuvent aussi t'être données en PDF (pages scannées ou sans texte lisible) : leur numéro d'origine est indiqué.

Règles :
- Une ligne de sortie par ligne de fourniture du devis. Ne regroupe pas, ne sépare pas, n'invente rien.
- designation : la désignation telle qu'écrite (tu peux retirer le prix et les colonnes de montant).
- quantity : la quantité EXACTEMENT comme écrite (« 1 250 », « 12,5 »), ou null si elle n'est pas écrite. Ne calcule jamais de quantité.
- unit : l'unité comme écrite (« u », « m² », « ml », « rlx »…), ou null.
- reference : la référence produit si elle est écrite, sinon null.
- sourceRefs : les références [page:ligne] exactes des lignes du texte qui contiennent cette fourniture.
- sourcePages : pour une ligne lue sur une page PDF, le numéro d'origine de la page ; sinon [].
- doubt : si tu as le moindre doute sur cette ligne (chiffre peu lisible, unité ambiguë, conditionnement sans contenu indiqué, ligne coupée, fourniture ou prestation ?), explique-le en une phrase courte adressée à l'artisan (« Le contenu du paquet n'est pas indiqué. ») ; sinon null. L'artisan verra ce doute et vérifiera la ligne.
- Les prestations de main-d'œuvre seule (pose, dépose, échafaudage, nettoyage…) ne sont pas à commander : ne les liste que si la ligne comprend une fourniture (« fourniture et pose de… »).
- Ignore les totaux, sous-totaux, TVA, acomptes, conditions générales et mentions légales.
- notes : signale en phrases courtes ce qui concerne tout le devis et qui compte pour ses achats (page illisible, tableau coupé, fourniture apportée par le client). Écris pour un artisan : jamais de nom de champ ni de référence [page:ligne], jamais de remarque sur ta façon de lire le document. Les doutes sur une ligne vont dans son champ doubt. Liste vide si rien.

En cas de doute sur une valeur, recopie-la telle quelle et explique le doute : l'artisan vérifiera. Ne devine jamais.${vocabulary}`;
}
