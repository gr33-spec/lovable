import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { ListeLue, ListeReader, ListeRequest } from "../application/liste-reader.js";

/**
 * Lecture SIMULÉE d'une liste (développement et tests, jamais en ligne ; crédit API à zéro). Trois listes enregistrées,
 * choisies par le nom du fichier déposé : « manuscrite » (liste écrite à la main), « bon » (bon de négoce) et « tableau ».
 * Sans mot reconnu : la liste manuscrite. En ligne, seul le modèle lit.
 */
export const LISTES_ENREGISTREES: Readonly<Record<"manuscrite" | "bon" | "tableau", ListeLue>> = {
  manuscrite: {
    lignes: [
      { designation: "Tuile romane canal rouge", quantite: "1250", unite: "pièces" },
      { designation: "Faîtière ronde à emboîtement", quantite: "42", unite: "pièces" },
      { designation: "Liteau sapin 27x38", quantite: "480", unite: "m" },
      { designation: "Écran sous-toiture", quantite: "4", unite: "rouleaux" },
      { designation: "Pointes inox", quantite: "3", unite: "kg" },
    ],
  },
  bon: {
    lignes: [
      { designation: "Ardoise naturelle 32x22 Espagne 1er choix", quantite: "2760", unite: "pièces" },
      { designation: "Crochet inox 110 mm", quantite: "2800", unite: "pièces" },
      { designation: "Clou cuivre 3,1x28", quantite: "5", unite: "kg" },
      { designation: "Gouttière zinc demi-ronde dév. 33", quantite: "12", unite: "longueurs de 3 m" },
    ],
  },
  tableau: {
    lignes: [
      { designation: "Plaque de plâtre BA13 2,50x1,20", quantite: "84", unite: "plaques" },
      { designation: "Rail R48", quantite: "36", unite: "u" },
      { designation: "Montant M48", quantite: "120", unite: "u" },
      { designation: "Vis TTPC 25", quantite: "4", unite: "boîtes" },
      { designation: "Bande à joint", quantite: "2", unite: "rouleaux" },
      { designation: "Enduit de finition", quantite: "3", unite: "sacs" },
    ],
  },
};

export class FakeListeReader implements ListeReader {
  readonly provider = "fake";

  async lire(request: ListeRequest): Promise<ReadAttempt<ListeLue>> {
    const nom = request.fileName.toLowerCase();
    // Plan « finition », bloc 6 : une photo floue ou coupée, où le modèle ne lit aucune ligne.
    if (nom.includes("floue")) {
      return { provider: this.provider, model: "claude-opus-5-5", usage: { inputTokens: 1800, outputTokens: 20 }, status: "success", output: { ...structuredClone(LISTES_ENREGISTREES.manuscrite), lignes: [] }, errorCode: null, durationMs: 1 };
    }
    const cle = nom.includes("tableau") ? "tableau" : nom.includes("bon") ? "bon" : "manuscrite";
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: 1800, outputTokens: 220 },
      status: "success",
      output: structuredClone(LISTES_ENREGISTREES[cle]),
      errorCode: null,
      durationMs: 1,
    };
  }
}
