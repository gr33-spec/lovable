import { Controller, Headers, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { createHmac, timingSafeEqual } from "node:crypto";
import { numeroDuLotDansAdresse } from "@baticlair/domain";
import type { AppConfig } from "../../../platform/config/config.js";
import { forbidden, notFound } from "../../../platform/errors/domain-error.js";
import { HOURLY } from "../../../platform/http/rate-limit.module.js";
import { CONFIG, EMAIL_RECU, EMAIL_SENDER, LOGGER } from "../../../platform/tokens.js";
import { renvoyerContact, type LecteurEmailRecu } from "../../../platform/email/contact-entrant.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import type { AppLogger } from "../../../platform/logging/logger.js";
import { Public } from "../../identity/index.js";
import { DemandeService } from "../application/demande.service.js";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { unSeulTraitement } from "../../../platform/reprise/evenements.js";
import { ReponsesRecuesService } from "../../adresse-mobiiz/index.js";

/** Le webhook entrant de Resend (`email.received`), signé façon Svix : `svix-id`, `svix-timestamp`, `svix-signature`. */
export function signatureValide(secret: string, id: string | undefined, timestamp: string | undefined, signature: string | undefined, corps: Buffer): boolean {
  if (!id || !timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;
  const cle = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const attendue = createHmac("sha256", cle).update(`${id}.${timestamp}.`).update(corps).digest();
  return signature.split(" ").some((s) => {
    const [version, valeur] = s.split(",");
    if (version !== "v1" || !valeur) return false;
    const recue = Buffer.from(valeur, "base64");
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

/**
 * ÉTAPE 8 : la réponse d'un négoce par e-mail à `lot-<n°>@reponses.<domaine>` (section 7, étape 5). Le webhook ne prend
 * aucun devis par e-mail (sans la case d'accord, rien n'est pris en compte, section 6) : il renvoie au négoce son lien de
 * dépôt et journalise. Fermé sans secret ; signature obligatoire ; 404 drapeau éteint (sauf la boîte de contact).
 * Un e-mail à contact@mobiiz.fr part chez l'admin (`renvoyerContact`, Greg, 26 octobre 2026) ; un e-mail à l'adresse
 * Mobiiz d'un artisan arrive dans Mobiiz (R7, `ReponsesRecuesService`).
 */
@Controller("v1/webhooks")
export class WebhookResendController {
  constructor(
    @Inject(DemandeService) private readonly demande: DemandeService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(EMAIL_RECU) private readonly lecteur: LecteurEmailRecu,
    @Inject(EMAIL_SENDER) private readonly envoi: TransactionalEmailSender,
    @Inject(LOGGER) private readonly logger: AppLogger,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReponsesRecuesService) private readonly reponses: ReponsesRecuesService,
  ) {}

  @Public()
  @Throttle({ default: HOURLY(600) })
  @Post("resend")
  @HttpCode(200)
  async recevoir(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers("svix-id") id: string | undefined,
    @Headers("svix-timestamp") timestamp: string | undefined,
    @Headers("svix-signature") signature: string | undefined,
  ) {
    const secret = this.config.groupe.resendWebhookSecret;
    // La boîte de contact et les adresses Mobiiz (R7) vivent même sans le groupé ; sans rien de tout ça, la route n'existe pas.
    if (!this.config.groupe.enabled && !this.config.contact && !this.config.emailDomaine) throw notFound("Route");
    if (!secret || !req.rawBody || !signatureValide(secret, id, timestamp, signature, req.rawBody)) throw forbidden("Webhook signature");
    // Revue du 26 octobre 2026 : un envoi rejoué par Resend (même svix-id) n'est jamais traité deux fois.
    return unSeulTraitement(this.prisma, "resend", id, () => this.traiter(req));
  }

  private async traiter(req: { body?: unknown }) {
    const evenement = (req.body ?? {}) as { type?: string; data?: { email_id?: string; from?: string; to?: string[] | string; subject?: string; created_at?: string } };
    if (evenement.type !== "email.received" || !evenement.data?.from) return { traite: false, raison: "ignore" };
    const contact = await renvoyerContact(this.config.contact, evenement.data, this.lecteur, this.envoi, this.logger);
    if (contact) return contact;
    // R7 : un e-mail à l'adresse Mobiiz d'un artisan (réponse d'un négoce) arrive dans Mobiiz.
    const artisan = await this.reponses.recevoir(evenement.data, this.lecteur);
    if (artisan) return artisan;
    if (!this.config.groupe.enabled) return { traite: false, raison: "adresse_inconnue" };
    const domaine = this.config.groupe.reponsesDomaine;
    if (!domaine) return { traite: false, raison: "domaine_absent" };
    const to = Array.isArray(evenement.data.to) ? evenement.data.to : evenement.data.to ? [evenement.data.to] : [];
    const numero = numeroDuLotDansAdresse(to, domaine);
    if (numero === null) return { traite: false, raison: "adresse_inconnue" };
    return this.demande.reponseParEmail(numero, evenement.data.from);
  }
}
