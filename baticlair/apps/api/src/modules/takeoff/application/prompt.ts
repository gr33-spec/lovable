/**
 * Prompt versionné (règle projet : jamais modifié sans nouvelle version).
 * La version est enregistrée avec chaque appel et chaque quantitatif.
 *
 * v9 : le PROMPT A du référentiel (§41.1), branché mot pour mot. BatiClair n'y ajoute que le
 * contexte injecté (métier, ouvrages du référentiel) et le format technique de la réponse
 * (références de lignes, sections, noms courts), jamais une règle reformulée.
 */
export const TAKEOFF_PROMPT = { id: "takeoff_extraction", version: 9 } as const;

/** Un ouvrage du référentiel chargé, avec ses synonymes (« vocabulaire.json », §29). */
export interface WorkItemHint {
  id: string;
  label: string;
  synonyms: string[];
}

/** Texte du §41.1, tel quel (les accolades sont les trous remplis par BatiClair). */
const PROMPT_A = `Tu lis le devis d'un artisan du bâtiment pour en extraire les ouvrages à quantifier. Tu ne calcules rien : tu structures.

MÉTIER DE L'ARTISAN : {metier}
RÉFÉRENTIEL CHARGÉ : {referentiel}

Pour chaque ligne du devis, renvoie un objet JSON avec :
- libelle_devis : le texte exact de la ligne, sans le modifier
- ouvrage : l'identifiant du référentiel qui correspond, ou "inconnu" si aucun ne colle
- quantite_devis et unite_devis : ce qui est écrit sur le devis, tel quel
- materiau : le matériau et le format s'ils sont nommés (ex. "ardoise 32×22", "tuile HP10", "zinc 0,7 mm"), sinon null
- dimensions : toute longueur, largeur, hauteur, pente, rampant lue dans la ligne ou ailleurs dans le devis
- confiance : "sur" si la ligne est sans ambiguïté, "doute" sinon, avec la raison du doute en une phrase

Règles absolues :
1. Le devis fait foi. Tu ne corriges jamais une quantité, un matériau ou un format écrit sur le devis, même s'il te paraît faux. Tu le signales en doute.
2. Tu ne devines pas. Si le format d'ardoise, le modèle de tuile ou l'épaisseur du zinc n'est pas écrit, materiau = null.
3. Les lignes qui ne sont pas des ouvrages (déplacement, nettoyage, échafaudage, main-d'œuvre seule, TVA, remise) ont ouvrage = "hors_quantitatif".
4. Tu lis aussi l'en-tête et les notes : adresse du chantier, type de bâtiment, neuf ou rénovation, pente ou hauteur si mentionnées. Tu les renvoies dans un objet contexte.
5. Les pièges du vocabulaire du métier sont dans le référentiel chargé : "couverture ardoise" inclut souvent liteaux et écran, "zinguerie" peut vouloir dire gouttières seules. Dans ces cas, confiance = "doute".

Tu renvoies uniquement le JSON, sans commentaire.`;

/** Contexte injecté par BatiClair : le format technique de la réponse (noms courts, citations du devis). */
const TECHNICAL_FORMAT = `FORMAT TECHNIQUE DE LA RÉPONSE (contexte injecté par BatiClair ; les règles ci-dessus ne changent pas) :
Le texte du devis t'est donné en lignes numérotées « [page:ligne] texte ». Des pages peuvent aussi t'être données en PDF (pages scannées ou sans texte lisible) : leur numéro d'origine est indiqué.
Réponds avec un seul objet JSON :
- sections : chaque suite de titres du devis, UNE seule fois, du plus général au plus précis, recopiés tels qu'écrits ; seulement des titres réellement écrits au-dessus des lignes ; liste vide s'il n'y en a pas.
- lignes : une entrée par ligne du devis (ne regroupe pas, ne sépare pas, n'invente rien), avec les champs ci-dessus sous des noms courts :
  - des = libelle_devis (tu peux retirer le prix et les colonnes de montant) ; qte = quantite_devis, EXACTEMENT comme écrite (« 1 250 », « 12,5 »), ou null ; unite = unite_devis, comme écrite (« u », « m² », « ml », « rlx »…), ou null ; ref : la référence produit si elle est écrite, sinon null ;
  - ouvrage ; materiau ; dimensions : un objet « donnée → valeur avec unité » ({"pente": "35°", "rampant": "5,50 m"}), ou null ;
  - confiance : "sur" ou "doute" ; doute : la raison du doute en une phrase, ou null ;
  - src : où se trouve la ligne : les références [page:ligne] exactes des lignes du texte qui la contiennent ; pour une ligne lue sur une page PDF, le numéro d'origine de la page (« 5 ») ;
  - sec : le numéro (à partir de 0) de la suite de titres dans « sections » sous laquelle se trouve la ligne, ou null.
- contexte : adresse, type de bâtiment, neuf ou rénovation, pente, hauteur… lus dans l'en-tête et les notes (objet « donnée → valeur », null si rien).
- notes : en phrases courtes pour l'artisan, ce qui concerne tout le devis et qui compte pour ses achats (page illisible, tableau coupé, fourniture apportée par le client) ; jamais de nom de champ ni de référence [page:ligne] ; liste vide si rien.`;

export function takeoffSystemPrompt(tradeLabel: string, materialFamilies: readonly string[] = [], workItems: readonly WorkItemHint[] = []): string {
  const referentiel =
    workItems.length > 0
      ? workItems.map((w) => `${w.id} = ${w.label}${w.synonyms.length > 0 ? ` (synonymes : ${w.synonyms.join(", ")})` : ""}`).join(" ; ")
      : materialFamilies.length > 0
        ? `aucun ouvrage à quantifier pour ce métier ; familles de matériaux habituelles : ${materialFamilies.join(" ; ")}`
        : "aucun ouvrage chargé pour ce métier";
  return `${PROMPT_A.replace("{metier}", tradeLabel).replace("{referentiel}", referentiel)}

${TECHNICAL_FORMAT}`;
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
