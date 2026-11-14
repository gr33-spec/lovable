import type { AppConfig } from "../../../platform/config/config.js";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AppLogger } from "../../../platform/logging/logger.js";

/**
 * SIGNALEMENT DE BUGS (Greg, 13 novembre 2026) : « Bouton « Signaler un problème » partout dans l'appli et côté négoce,
 * avec capture d'écran et page concernée jointes automatiquement. Accusé de réception automatique immédiat à l'utilisateur
 * (« Merci, on regarde »). Alerte e-mail à moi avec le résumé de l'agent reparateur et un lien pour valider la correction.
 * Une fois corrigé et déployé, mail automatique à l'utilisateur (« C'est corrigé, merci »). Liste des signalements dans
 * l'espace admin (statut : nouveau, en cours, corrigé). »
 *
 * Rien n'est corrigé sans l'accord de Greg : le réparateur écrit son résumé (Greg reçoit l'e-mail et le lien), Greg valide
 * la correction, puis le passage à « corrigé » envoie UNE fois l'e-mail à l'utilisateur.
 */
export const STATUTS_SIGNALEMENT = ["nouveau", "en_cours", "corrige"] as const;
export type StatutSignalement = (typeof STATUTS_SIGNALEMENT)[number];
export const GRAVITES_SIGNALEMENT = ["bloquant", "genant", "detail"] as const;
export const LIBELLES_GRAVITE: Record<(typeof GRAVITES_SIGNALEMENT)[number], string> = { bloquant: "Bloquant", genant: "Gênant", detail: "Détail" };
/** Une capture tient dans le corps d'une requête (1 Mo) : l'écran la réduit avant de l'envoyer. */
export const CAPTURE_MAX_OCTETS = 650_000;
const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;

export const OBJET_ACCUSE = "Merci, on regarde";
export const OBJET_CORRIGE = "C'est corrigé, merci";

/** La page concernée : le chemin seul, jamais un paramètre d'adresse ni un jeton (un lien de négoce porte un secret). */
export function pageSure(page: string): string {
  const chemin = (page.split(/[?#]/)[0] ?? "").trim() || "/";
  return chemin
    .split("/")
    .map((morceau) => (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(morceau) ? ":id" : morceau.length >= 20 && /^[A-Za-z0-9_-]+$/.test(morceau) ? ":jeton" : morceau))
    .join("/")
    .slice(0, 200);
}

/** Une image envoyée en « data: » : son type et ses octets, ou un refus dit clairement. */
export function lireCapture(dataUrl: string | null | undefined): { type: string; octets: Buffer } | null {
  if (!dataUrl) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || !(TYPES_IMAGE as readonly string[]).includes(m[1]!)) throw validationFailed("Unsupported capture", { reason: "capture_invalide", message: "La capture doit être une image (JPEG, PNG ou WebP)." });
  const octets = Buffer.from(m[2]!, "base64");
  if (octets.length > CAPTURE_MAX_OCTETS) throw validationFailed("Capture too large", { reason: "capture_trop_lourde", message: "La capture est trop lourde." });
  return { type: m[1]!, octets };
}

export interface NouveauSignalement {
  message: string;
  page: string;
  origine: "artisan" | "negoce" | "public";
  email?: string | null;
  contexte?: string | null;
  capture?: string | null;
  companyId?: string | null;
  userId?: string | null;
}

export class SignalementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: TransactionalEmailSender,
    private readonly config: AppConfig,
    private readonly logger: AppLogger,
  ) {}

  /** Qui reçoit l'alerte : l'adresse des alertes, sinon le premier admin. Sans l'un ni l'autre, rien ne part. */
  private destinataireDesAlertes(): string | null {
    return this.config.alerts.email ?? this.config.groupe.admins[0] ?? null;
  }
  private lienAdmin(id: string): string {
    return `${this.config.webAppUrl}/admin/signalements?id=${id}`;
  }
  /** Un e-mail de signalement ne doit jamais faire échouer le signalement lui-même. */
  private async envoyer(email: { to: string; subject: string; text: string }): Promise<void> {
    try {
      await this.emails.send(email);
    } catch (e) {
      this.logger.error({ err: e }, `signalement : e-mail « ${email.subject} » non parti`);
    }
  }

  async creer(n: NouveauSignalement): Promise<{ id: string; accuse: boolean }> {
    const capture = lireCapture(n.capture);
    const page = pageSure(n.page);
    const email = n.email?.trim().toLowerCase() || null;
    const s = await this.prisma.signalement.create({
      data: {
        origine: n.origine,
        page,
        message: n.message.trim(),
        email,
        companyId: n.companyId ?? null,
        userId: n.userId ?? null,
        contexte: n.contexte?.slice(0, 300) ?? null,
        ...(capture ? { capture: new Uint8Array(capture.octets), captureType: capture.type } : {}),
      },
      select: { id: true },
    });
    // 1. L'accusé de réception, tout de suite.
    // Un négoce est vouvoyé (recette du 13 novembre 2026).
    if (email) await this.envoyer({ to: email, subject: OBJET_ACCUSE, text: `Bonjour,\n\nMerci, on regarde. ${n.origine === "negoce" ? "Votre" : "Ton"} signalement est bien arrivé :\n\n« ${n.message.trim().slice(0, 500)} »\n\nOn ${n.origine === "negoce" ? "vous" : "te"} prévient dès que c'est corrigé.\n\nL'équipe Mobiiz` });
    // 2. L'alerte à Greg : ce qui est signalé, où, et le lien vers l'espace admin.
    const greg = this.destinataireDesAlertes();
    if (greg)
      await this.envoyer({
        to: greg,
        subject: `Nouveau signalement : ${page}`,
        text: `Un problème vient d'être signalé (${n.origine}).\n\nPage : ${page}\nMessage : ${n.message.trim().slice(0, 1500)}\nCapture d'écran : ${capture ? "jointe au signalement" : "aucune"}\n\nLe voir dans l'espace admin : ${this.lienAdmin(s.id)}\n\nL'agent réparateur l'analyse quand tu le demandes ; rien n'est corrigé sans ton accord.`,
      });
    return { id: s.id, accuse: !!email };
  }

  async lister(statut?: StatutSignalement) {
    const rows = await this.prisma.signalement.findMany({
      where: statut ? { statut } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, createdAt: true, statut: true, origine: true, page: true, message: true, email: true, contexte: true, captureType: true, resume: true, gravite: true, correctionValidee: true, corrigeLe: true, mailCorrigeLe: true },
    });
    const comptes = await this.prisma.signalement.groupBy({ by: ["statut"], _count: { _all: true } });
    return {
      signalements: rows.map(({ captureType, ...r }) => ({ ...r, capture: !!captureType })),
      comptes: Object.fromEntries(STATUTS_SIGNALEMENT.map((st) => [st, comptes.find((c) => c.statut === st)?._count._all ?? 0])),
    };
  }

  async capture(id: string): Promise<{ type: string; octets: Buffer }> {
    const s = await this.prisma.signalement.findUnique({ where: { id }, select: { capture: true, captureType: true } }).catch(() => null);
    if (!s?.capture || !s.captureType) throw notFound("Capture");
    return { type: s.captureType, octets: Buffer.from(s.capture) };
  }

  /**
   * Le suivi par l'admin. Le résumé du réparateur prévient Greg (e-mail avec le lien pour valider la correction) ; « corrigé »
   * n'est accepté qu'après la validation de Greg et envoie UNE fois « C'est corrigé, merci » à l'utilisateur.
   */
  async suivre(id: string, m: { statut?: StatutSignalement; resume?: string; gravite?: (typeof GRAVITES_SIGNALEMENT)[number]; validerLaCorrection?: boolean }, maintenant = new Date()) {
    const avant = await this.prisma.signalement.findUnique({ where: { id } }).catch(() => null);
    if (!avant) throw notFound("Signalement");
    const validee = m.validerLaCorrection ? maintenant : avant.correctionValidee;
    if (m.statut === "corrige" && !validee) throw validationFailed("Fix not approved", { reason: "correction_non_validee", message: "Valide d'abord la correction proposée." });
    const resume = m.resume?.trim();
    const apres = await this.prisma.signalement.update({
      where: { id },
      data: {
        ...(m.statut ? { statut: m.statut } : resume && avant.statut === "nouveau" ? { statut: "en_cours" } : {}),
        ...(resume !== undefined ? { resume: resume || null } : {}),
        ...(m.gravite ? { gravite: m.gravite } : {}),
        ...(m.validerLaCorrection ? { correctionValidee: maintenant } : {}),
        ...(m.statut === "corrige" && !avant.corrigeLe ? { corrigeLe: maintenant } : {}),
      },
    });
    // Le résumé du réparateur, nouveau ou changé : Greg reçoit l'e-mail avec le lien pour valider la correction.
    const greg = this.destinataireDesAlertes();
    if (resume && resume !== avant.resume && greg) {
      const gravite = apres.gravite ? LIBELLES_GRAVITE[apres.gravite as keyof typeof LIBELLES_GRAVITE] : "à estimer";
      await this.envoyer({ to: greg, subject: `Signalement analysé (${gravite}) : ${apres.page}`, text: `Le réparateur a analysé le signalement.\n\nPage : ${apres.page}\nGravité : ${gravite}\n\n${resume.slice(0, 3000)}\n\nValider la correction : ${this.lienAdmin(id)}\n\nRien n'est corrigé tant que tu n'as pas validé.` });
    }
    // « C'est corrigé, merci » : une seule fois, à l'utilisateur qui a signalé.
    let mailCorrige = false;
    if (apres.statut === "corrige" && apres.email && !apres.mailCorrigeLe) {
      const pris = await this.prisma.signalement.updateMany({ where: { id, mailCorrigeLe: null }, data: { mailCorrigeLe: maintenant } });
      if (pris.count === 1) {
        await this.envoyer({ to: apres.email, subject: OBJET_CORRIGE, text: apres.origine === "negoce" ? `Bonjour,\n\nC'est corrigé, merci. Le problème que vous nous avez signalé est réglé :\n\n« ${apres.message.slice(0, 500)} »\n\nSi vous le voyez encore, signalez-le de nouveau depuis la page.\n\nL'équipe Mobiiz` : `Bonjour,\n\nC'est corrigé, merci. Le problème que tu nous as signalé est réglé :\n\n« ${apres.message.slice(0, 500)} »\n\nSi tu le vois encore, signale-le de nouveau depuis l'application.\n\nL'équipe Mobiiz` });
        mailCorrige = true;
      }
    }
    return { id, statut: apres.statut, correctionValidee: !!apres.correctionValidee, mailCorrige };
  }
}
