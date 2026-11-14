import { z } from "zod";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { LecteurIa } from "../../../platform/ai/lecteur-ia.js";
import type { BudgetInterpretation } from "../../interpretation/index.js";
import { repondreParLeCode, type AdminVueService } from "./admin-vue.service.js";

export const TACHE_QUESTION_ADMIN = "admin_question";
export const QUESTION_ADMIN_PROMPT = { id: "admin_question", version: 1 } as const;

/** La consigne (envoyée telle quelle) : répondre avec les chiffres fournis, rien d'autre. */
export const QUESTION_ADMIN_SYSTEM = [
  "Tu réponds au fondateur de Mobiiz, une application pour les artisans du bâtiment. Il te pose une question sur l'activité de son application, en français simple.",
  "Tu reçois les CHIFFRES du jour (JSON) puis sa QUESTION. Réponds seulement avec ces chiffres.",
  "Règles absolues :",
  "- N'invente jamais un chiffre. Si la réponse n'est pas dans les chiffres fournis, dis-le en une phrase et dis ce que tu peux donner à la place.",
  "- Tu ne peux rien modifier : tu lis des chiffres. Si on te demande une action (supprimer, envoyer, changer), réponds que tu ne fais que lire.",
  "- Aucun détail de chantier, aucune donnée personnelle d'un artisan : tu n'en as pas, n'en suppose pas.",
  "- Réponse courte : deux à quatre phrases, au tutoiement, les chiffres en premier. Pas de liste à puces sauf pour nommer des négoces.",
  "- Un pourcentage se dit avec ses deux nombres (« 12 %, de 50 à 56 »).",
].join("\n");

const schema = z.object({ reponse: z.string().max(1200) });

/**
 * « POSE TA QUESTION » (Greg, 14 novembre 2026 : « je demande en langage normal […] il répond avec les chiffres. Lecture
 * seule, jamais de modification ; chiffres agrégés, pas le détail des chantiers »). Le CODE calcule les chiffres ; le modèle ne
 * reçoit qu'eux et la question, et ne peut donc rien lire d'autre ni rien changer. Éteint, plafond atteint ou panne : le code
 * répond seul (`repondreParLeCode`).
 */
export class QuestionAdminService {
  constructor(
    private readonly vue: AdminVueService,
    private readonly prisma: PrismaService,
    private readonly lecteur: LecteurIa | null,
    private readonly budget: BudgetInterpretation | null,
  ) {}

  async repondre(question: string, userId: string): Promise<{ reponse: string; ia: boolean }> {
    const chiffres = await this.vue.chiffres();
    const parLeCode = () => ({ reponse: repondreParLeCode(question, chiffres), ia: false });
    if (!this.lecteur) return parLeCode();
    if (this.budget && !(await this.budget.autorise().catch(() => false))) return parLeCode();
    const r = await this.lecteur
      .read({
        system: QUESTION_ADMIN_SYSTEM,
        schema,
        document: { numberedText: `CHIFFRES :\n${JSON.stringify(chiffres)}\n\nQUESTION : ${question}`, imagePdf: null, imagePages: [] },
        documentName: "question de l'admin",
        tag: `${QUESTION_ADMIN_PROMPT.id}-v${QUESTION_ADMIN_PROMPT.version}`,
      })
      .catch(() => null);
    // Le coût est compté sur l'entreprise de l'admin (le journal des appels IA demande une entreprise).
    const membre = await this.prisma.membership.findFirst({ where: { userId }, select: { companyId: true } }).catch(() => null);
    if (this.budget && membre) await this.budget.enregistrer({ companyId: membre.companyId, userId, attempt: r, provider: this.lecteur.provider }).catch(() => undefined);
    const texte = r && r.status === "success" && r.output ? (r.output as { reponse: string }).reponse.replace(/\s+\n/g, "\n").trim() : "";
    return texte ? { reponse: texte, ia: true } : parLeCode();
  }
}
