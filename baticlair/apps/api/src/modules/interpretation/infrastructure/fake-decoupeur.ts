import type { AssistantIaWire, EchangeAssistant } from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { Decoupeur, PhotoAssistant } from "../application/assistant-ia.service.js";

/**
 * DOUBLE DE TEST (jamais en ligne, `AI_PROVIDER=fake`) : il joue le modèle sans rien coûter. Il découpe la phrase dictée
 * sans ponctuation (« … j'ai besoin d'une gouttière … »), corrige « à braise » en « havraise », demande la matière de la
 * gouttière tant qu'elle n'est pas dite, et, pour prouver la validation, AJOUTE des crochets jamais dits quand la phrase
 * contient « invente » : le code doit les écarter.
 * UNE PHOTO : il ne voit rien ; le NOM du fichier joue l'image (« liste… » → liste, « devis… » → devis, « chat… » → autre,
 * sinon un chantier : ardoises et gouttière zinc, avec une quantité et un format inventés que le code doit retirer).
 */
export class FakeDecoupeur implements Decoupeur {
  readonly provider = "fake";
  async decouper(echanges: readonly EchangeAssistant[], photos: readonly PhotoAssistant[] = []): Promise<ReadAttempt<AssistantIaWire>> {
    const rendre = (output: AssistantIaWire): ReadAttempt<AssistantIaWire> => ({ provider: "fake", model: "claude-sonnet-5-5", usage: { inputTokens: photos.length ? 2600 : 1100, outputTokens: 180 }, status: "success", output, errorCode: null, durationMs: 1 });
    if (photos.length) {
      const nom = photos[0]!.nom.toLowerCase();
      if (/liste/.test(nom)) return rendre({ nature: "liste", lignes: [{ designation: "Ardoise", quantite: "1000", unite: "pièces" }], questions: [], message: "C'est une liste de matériaux écrite." });
      if (/devis/.test(nom)) return rendre({ nature: "devis", lignes: [], questions: [], message: "C'est un devis." });
      if (/chat/.test(nom)) return rendre({ nature: "autre", lignes: [], questions: [], message: "Je ne vois ni chantier ni liste sur cette photo." });
      return rendre({
        nature: "chantier",
        message: "Je vois une couverture en ardoises et une gouttière en zinc.",
        lignes: [
          { designation: "Ardoise naturelle", quantite: null, unite: null },
          { designation: "Gouttière zinc demi-ronde", quantite: "12", unite: "m" },
          { designation: "Ardoise naturelle 32×22", quantite: null, unite: null },
        ],
        questions: [
          { texte: "Tu refais toute la couverture ou une partie ?", choix: ["Toute la couverture", "Une partie"] },
          { texte: "Quelle surface de couverture, en m² ?", choix: [] },
        ],
      });
    }
    const dit = echanges
      .filter((e) => e.de === "artisan")
      .map((e) => e.texte)
      .join(" ");
    // La suite d'une photo de chantier : les matériaux vus, complétés par ce que l'artisan dit ensuite.
    const vu = echanges.find((e) => e.de === "photo")?.texte;
    if (vu) {
      const surface = /(\d+(?:[.,]\d+)?)\s*m²/i.exec(dit)?.[1] ?? null;
      const longueur = /(\d+(?:[.,]\d+)?)\s*m(?:ètres?)?\s+de\s+goutti/i.exec(dit)?.[1] ?? null;
      const format = /(\d{2})\s*[x× ]\s*(\d{2})/.exec(dit);
      return rendre({
        nature: "texte",
        message: "",
        lignes: vu.split(" ; ").map((d) => (/ardoise/i.test(d) ? { designation: `${d}${format ? ` ${format[1]}×${format[2]}` : ""}`, quantite: surface, unite: surface ? "m²" : null } : { designation: d, quantite: longueur, unite: longueur ? "m" : null })),
        questions: surface ? [] : [{ texte: "Quelle surface de couverture, en m² ?", choix: [] }],
      });
    }
    const lignes: AssistantIaWire["lignes"] = [];
    const questions: AssistantIaWire["questions"] = [];
    const ardoise = /(\d+(?:[.,]\d+)?)\s*m²\s*d'ardoises?\s+(\d{2})\s*[x× ]\s*(\d{2})/i.exec(dit);
    if (ardoise) lignes.push({ designation: `Ardoise naturelle ${ardoise[2]}×${ardoise[3]}${/espagne/i.test(dit) ? " Espagne" : ""}${/premier choix|1er choix/i.test(dit) ? " 1er choix" : ""}`, quantite: ardoise[1]!, unite: "m²" });
    const gouttiere = /goutti[èe]res?\s+de\s+(\d{2})/i.exec(dit);
    if (gouttiere) {
      const matiere = /\b(zinc|cuivre|pvc)\b/i.exec(dit)?.[1]?.toLowerCase();
      lignes.push({ designation: `Gouttière ${/braise|havraise/i.test(dit) ? "havraise" : "demi-ronde"}${matiere ? ` ${matiere}` : ""} développé ${gouttiere[1]}`, quantite: null, unite: null });
      if (!matiere) questions.push({ texte: `Gouttière de ${gouttiere[1]} : en zinc, en cuivre ou en PVC ?`, choix: ["Zinc", "Cuivre", "PVC"] });
    }
    if (/invente/i.test(dit)) lignes.push({ designation: "Crochets inox 100 mm", quantite: "950", unite: "pièces" });
    return rendre({ nature: "texte", lignes, questions, message: "" });
  }
}
