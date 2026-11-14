import type { z } from "zod";
import type { ReadAttempt } from "./document-reader.js";
import type { LecteurIa, ReadRequest } from "./lecteur-ia.js";

/**
 * LES RÉPONSES ENREGISTRÉES (revue du 26 octobre 2026, lot 1) : un lecteur qui rejoue une réponse déjà obtenue, par
 * étiquette de prompt (`tag`, « lecture_devis-v4 ») et, si besoin, par empreinte du texte lu. Zéro réseau, zéro coût :
 * pour les tests et la démo (`AI_PROVIDER=enregistre`). Une demande sans enregistrement répond « provider_error »,
 * comme un fournisseur en panne, pour que le code d'erreur soit lui aussi testé.
 */
export type Enregistrements = Readonly<Record<string, unknown>>;

export class LecteurEnregistre implements LecteurIa {
  readonly provider = "enregistre";

  constructor(
    private readonly enregistrements: Enregistrements,
    readonly model = "enregistre",
  ) {}

  read<S extends z.ZodType>(request: ReadRequest<S>): Promise<ReadAttempt<z.infer<S>>> {
    const base = { provider: this.provider, model: this.model, usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0 };
    const cle = [`${request.tag}#${empreinte(request.document.numberedText)}`, request.tag].find((k) => k in this.enregistrements);
    if (!cle) return Promise.resolve({ ...base, status: "provider_error", output: null, errorCode: "pas_d_enregistrement" });
    const lu = request.schema.safeParse(this.enregistrements[cle]);
    return Promise.resolve(lu.success ? { ...base, status: "success", output: lu.data as z.infer<S>, errorCode: null } : { ...base, status: "invalid_output", output: null, errorCode: "schema" });
  }
}

/** Une empreinte courte et stable d'un texte (FNV-1a 32 bits) : clé d'un enregistrement propre à un document. */
export function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
