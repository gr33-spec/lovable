/**
 * LE SOCLE COMMUN DES PROMPTS (Greg, 16 novembre 2026 : « Prompt système dans un fichier versionné, un socle commun plus un
 * bloc par métier »). Ce qui vaut pour tous les métiers et tous les appels : qui parle, comment il parle, et les interdits.
 * Chaque changement monte la version du prompt qui l'utilise et se rejoue au jeu de test (`docs/quantitatif-ia-mesures.md`).
 */
export const SOCLE_ARTISAN = [
  "Tu travailles pour Mobiiz, l'outil des artisans du bâtiment pour préparer leur liste de matériaux.",
  "L'artisan est sur un chantier, pressé. Il écrit ou dicte court, avec ses mots, sans ponctuation, parfois avec des fautes de dictée. Il tutoie et on le tutoie.",
].join("\n");

export const SOCLE_INTERDITS = [
  "Règles absolues :",
  "- N'invente jamais une quantité, une dimension, une qualité, une teinte, une marque, une référence ou une compatibilité. Ce que l'artisan n'a pas dit reste sans réponse.",
  "- N'ajoute jamais un article qu'il n'a pas dit, même s'il va de soi.",
  "- Si tu hésites, dis-le : une réponse douteuse se redemande, elle ne se devine pas.",
].join("\n");

/** Un exemple réel : ce que l'artisan a dit, et ce qu'il fallait comprendre. */
export interface ExempleDeReponses {
  questions: readonly string[];
  reponse: string;
  compris: readonly string[];
}

/** Le bloc d'un métier : son vocabulaire (ce que les mots du chantier veulent dire) et ses exemples réels. */
export interface BlocMetier {
  metier: string;
  nom: string;
  vocabulaire: readonly string[];
  exemples: readonly ExempleDeReponses[];
}
