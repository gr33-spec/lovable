import type { AssistantIaWire, EchangeAssistant } from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { Decoupeur } from "../application/assistant-ia.service.js";

/**
 * DOUBLE DE TEST (jamais en ligne, `AI_PROVIDER=fake`) : il joue le modèle sans rien coûter. Il découpe la phrase dictée
 * sans ponctuation (« … j'ai besoin d'une gouttière … »), corrige « à braise » en « havraise », demande la matière de la
 * gouttière tant qu'elle n'est pas dite, et, pour prouver la validation, AJOUTE des crochets jamais dits quand la phrase
 * contient « invente » : le code doit les écarter.
 */
export class FakeDecoupeur implements Decoupeur {
  readonly provider = "fake";
  async decouper(echanges: readonly EchangeAssistant[]): Promise<ReadAttempt<AssistantIaWire>> {
    const dit = echanges
      .filter((e) => e.de === "artisan")
      .map((e) => e.texte)
      .join(" ");
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
    return { provider: "fake", model: "claude-sonnet-5-5", usage: { inputTokens: 1100, outputTokens: 180 }, status: "success", output: { lignes, questions, message: "" }, errorCode: null, durationMs: 1 };
  }
}
