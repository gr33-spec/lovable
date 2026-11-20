import { dossierEcriture, ECRITURE_PAGE_PROMPT, ECRITURE_PAGE_SYSTEM, LIMITES_PAGE, proposerTextes, texteSur, type ProfilPourEcrire } from "@baticlair/domain";
import { z } from "zod";
import type { LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import type { AppLogger } from "../../../platform/logging/logger.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";

/**
 * « MOBIIZ M'AIDE À L'ÉCRIRE » (Greg, 16 novembre 2026) : une accroche et une présentation proposées à partir du profil,
 * que l'artisan modifie ; rien n'est enregistré sans lui. COMPTE COMME UNE ANALYSE IA : même garde que le scan d'une liste
 * (analyses offertes, plafond caché de l'abonné, e-mail vérifié, vérifiés AVANT tout appel) ; l'appel réussi est noté au
 * journal (`ai_execution`, tâche `aide_ecriture_page`) et compté avec les analyses offertes. IA coupée, en panne, ou plus
 * d'analyse : le code propose seul, à partir du profil, gratuitement, et le dit.
 */
export const TACHE_AIDE_ECRITURE = "aide_ecriture_page";

const schema = z.object({ accroche: z.string().max(400), presentation: z.string().max(4000) });

export interface PropositionTextes {
  accroche: string;
  presentation: string;
  /** ia : écrite par l'IA (une analyse comptée) ; profil : tirée du profil par le code (gratuite). */
  source: "ia" | "profil";
  /** Pourquoi le code a écrit seul (plus d'analyses offertes…), en une phrase, ou null. */
  phrase: string | null;
}

export class AideEcriture {
  constructor(
    private readonly lecteur: LecteurIa | null,
    private readonly meter: AnalysisMeter,
    private readonly recorder: AiUsageRecorder,
    private readonly logger: AppLogger,
  ) {}

  async proposer(companyId: string, userId: string, profil: ProfilPourEcrire, libelles: Record<string, string>, brouillon: { accroche: string | null; presentation: string | null }): Promise<PropositionTextes> {
    const parLeCode = (phrase: string | null): PropositionTextes => ({ ...proposerTextes(profil, libelles), source: "profil", phrase });
    if (!this.lecteur) return parLeCode(null);
    try {
      await this.meter.verifierScan(companyId, userId);
    } catch (err) {
      const phrase = (err as { details?: { phrase?: string } }).details?.phrase ?? "Tes analyses offertes sont utilisées : voici une proposition tirée de ton profil.";
      return parLeCode(phrase);
    }
    const a = await this.lecteur.read({
      system: ECRITURE_PAGE_SYSTEM,
      schema,
      document: { numberedText: dossierEcriture(profil, libelles, brouillon), imagePdf: null, imagePages: [] },
      documentName: "profil de l'entreprise",
      tag: `${ECRITURE_PAGE_PROMPT.id}-v${ECRITURE_PAGE_PROMPT.version}`,
    });
    await this.recorder
      .record({ companyId, userId, task: TACHE_AIDE_ECRITURE, route: "text", provider: a.provider, model: a.model, promptId: ECRITURE_PAGE_PROMPT.id, promptVersion: ECRITURE_PAGE_PROMPT.version, attempt: 1, usage: a.usage, status: a.status === "success" && a.output ? "success" : a.status === "success" ? "invalid_output" : a.status, errorCode: a.errorCode, durationMs: a.durationMs })
      .catch((err) => this.logger.warn({ err: String(err) }, "aide_ecriture_journal"));
    const accroche = texteSur(a.output?.accroche, LIMITES_PAGE.accroche);
    const presentation = texteSur(a.output?.presentation, LIMITES_PAGE.presentation);
    if (a.status !== "success" || !accroche || !presentation) return parLeCode(null);
    return { accroche, presentation, source: "ia", phrase: null };
  }
}
