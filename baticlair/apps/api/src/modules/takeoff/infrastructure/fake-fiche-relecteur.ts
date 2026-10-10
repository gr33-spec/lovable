import { normalizeText } from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { FicheRelecteur, RelectureInput, RelectureQuestion, RelectureWire } from "../application/fiche-relecture.js";

/**
 * Relecture SIMULÉE (développement et tests, jamais en ligne). Règle fixe : une phrase de la réponse qui contient les mots
 * d'un bouton règle la question dont elle nomme la pièce (« les bacs façonnés » → la couverture, « les bandes je les
 * plie » → les bandes) ; un nombre règle une question chiffrée. « il manque … » ouvre une donnée manquante.
 */
const words = (t: string) => normalizeText(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
const FACONNE_ARTISAN = /\b(?:je (?:les )?(?:plie|faconne)|plie(?:e|es|s)? (?:sur place|moi)|moi[- ]meme|sur place)\b/;
const FACONNE_COMMANDE = /\b(?:command|achet|tout fait|faconne(?:e|es|s)? (?:par|chez)|pre ?faconn)/;

function choose(q: RelectureQuestion, phrase: string): string | null {
  const n = normalizeText(phrase);
  if (/faconnage/.test(q.key)) {
    if (FACONNE_COMMANDE.test(n)) return q.options.find((o) => /command/i.test(o.label))?.value ?? null;
    if (FACONNE_ARTISAN.test(n)) return q.options.find((o) => /moi|fa[cç]onne/i.test(o.label) && !/command/i.test(o.label))?.value ?? null;
  }
  const hit = q.options.filter((o) => words(o.label).length > 0 && words(o.label).every((w) => words(n).includes(w)));
  if (hit.length === 1) return hit[0]!.value;
  const num = /(\d+(?:[.,]\d+)?)/.exec(n)?.[1];
  return num && q.unit && q.unit !== "u" ? num.replace(",", ".") : null;
}

/** La pièce que nomme une question (« Couverture zinc à joint debout », « Bande de ventilation en Z… »). */
const pieceOf = (q: RelectureQuestion) => words(q.text.split(":")[0] ?? "");

export class FakeFicheRelecteur implements FicheRelecteur {
  readonly provider = "fake";

  async relire(input: RelectureInput): Promise<ReadAttempt<RelectureWire>> {
    const phrases = input.texte.split(/[,;.]|\bet\b|\bmais\b/).map((p) => p.trim()).filter(Boolean);
    const reponses: RelectureWire["reponses"] = [];
    for (const q of [input.question, ...input.ouvertes]) {
      // La phrase qui nomme la pièce de la question ; à défaut, pour la question posée, toute la réponse.
      const own = phrases.find((p) => pieceOf(q).some((w) => w.length > 3 && words(p).includes(w) && !["zinc", "quartz"].includes(w)) || (/\bbac/.test(normalizeText(p)) && /joint debout|couverture/i.test(q.text)));
      const phrase = own ?? (q === input.question ? input.texte : null);
      const v = phrase ? choose(q, phrase) : null;
      if (v) reponses.push({ question: q.key, valeur: v });
    }
    const manque = /il manque (.+)/i.exec(input.texte);
    const label = /faconnage/.test(input.question.key) ? "façonnage" : input.question.text.replace(/\s*\?$/, "").split(":").pop()!.trim();
    return {
      provider: this.provider,
      model: "claude-opus-5-5",
      usage: { inputTokens: 600, outputTokens: 80 },
      status: "success",
      output: {
        fiche: [{ donnee: label.charAt(0).toUpperCase() + label.slice(1), valeur: input.texte }],
        reponses,
        manque: manque ? { donnee: manque[1]!.trim(), question: `${manque[1]!.trim()} ?` } : { donnee: "", question: "" },
      },
      errorCode: null,
      durationMs: 1,
    };
  }
}
