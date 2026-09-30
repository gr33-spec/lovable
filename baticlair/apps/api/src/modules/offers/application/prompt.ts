import type { RequestedLineForAi } from "./offer-extractor.js";

/**
 * Prompt versionné (règle projet : jamais modifié sans nouvelle version).
 * La version est enregistrée avec chaque appel et chaque devis lu.
 */
export const OFFER_PROMPT = { id: "offer_extraction", version: 2 } as const;

export function offerSystemPrompt(tradeLabel: string): string {
  return `Tu aides un artisan (${tradeLabel}) à comparer les devis de ses fournisseurs (négoces). On te donne le devis d'UN fournisseur et la liste des articles que l'artisan lui a demandés. Ta tâche : relever chaque ligne du devis telle qu'elle est écrite et dire à quelle ligne demandée elle correspond.

Le texte du devis t'est donné en lignes numérotées « [page:ligne] texte ». Des pages peuvent aussi t'être données en PDF (pages scannées) : leur numéro d'origine est indiqué.

Règles :
- Une ligne de sortie par ligne du devis. N'invente rien, ne regroupe pas.
- kind : « main » article proposé pour un article demandé ou vendu normalement ; « substitution » le fournisseur propose un AUTRE produit à la place de celui demandé (autre marque, autre modèle, autre dimension) ; « variant » alternative proposée EN PLUS ; « option » article facultatif non demandé ; « fee » frais (livraison, transport, éco-participation, manutention) ; « deposit » consigne (palette…) ; « info » texte sans prix.
- quantity, unit, unitPrice, lineTotal, discountPercent : recopie les valeurs EXACTEMENT comme écrites (« 1 250 », « 12,50 »), HORS TAXES. null si absentes. Ne calcule jamais rien : le logiciel refait tous les calculs.
- packagingContent : si la ligne indique le contenu d'un conditionnement (« rouleau de 75 m² », « sac de 25 kg », « paquet de 100 »), la quantité et l'unité de ce contenu ; sinon null.
- requestLine : le numéro de la ligne demandée à laquelle cette ligne répond, ou null (frais, article non demandé, texte). Plusieurs lignes du devis peuvent répondre à la même ligne demandée.
- matchConfidence : « sure » si c'est clairement le même article, « probable » si c'est vraisemblable, « unsure » si tu hésites ; null si requestLine est null.
- doubt : si tu as le moindre doute (chiffre peu lisible, correspondance incertaine, conditionnement ambigu), explique-le en une phrase courte adressée à l'artisan ; sinon null.
- sourceRefs : les références [page:ligne] exactes des lignes du texte qui contiennent cette ligne du devis ([] pour une page lue en image).
- totalHT, totalVAT, totalTTC : les totaux imprimés, tels qu'écrits, ou null.
- globalDiscountPercent / globalDiscountAmount : une remise sur l'ensemble du devis, telle qu'écrite (l'un ou l'autre), ou null.
- deliveryIncluded : true si le devis dit que la livraison est incluse ou franco, false s'il dit qu'elle est en sus, null s'il n'en dit rien.
- notes : ce qui concerne tout le devis (conditions de validité, délai, page illisible), en phrases courtes écrites pour un artisan : jamais de nom de champ ni de référence [page:ligne], jamais de remarque sur ta façon de lire le document. Liste vide si rien.

En cas de doute sur une valeur, recopie-la telle quelle et explique le doute : l'artisan vérifiera. Ne devine jamais.`;
}

/** La liste demandée, numérotée à partir de 1, ajoutée après le devis. */
export function requestedListText(requested: readonly RequestedLineForAi[]): string {
  const rows = requested.map((l, i) => {
    const qty = [l.quantity, l.unit].filter(Boolean).join(" ");
    return `${i + 1}. ${l.designation}${l.reference ? ` (réf. ${l.reference})` : ""}${qty ? ` : ${qty}` : ""}`;
  });
  return `Articles demandés par l'artisan à ce fournisseur :\n${rows.join("\n")}`;
}
