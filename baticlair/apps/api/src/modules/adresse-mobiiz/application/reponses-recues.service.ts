import { adresseNue, etiquetteDansObjet, lireAdresseMobiiz, NOM_APP, nomExpediteur } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { EmailRecu, LecteurEmailRecu } from "../../../platform/email/contact-entrant.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { AppLogger } from "../../../platform/logging/logger.js";
import type { NotificationsGroupeService } from "../../../platform/notifications/notifications-artisan.js";
import type { PriceRequestsService } from "../../price-requests/index.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { AdresseMobiizService } from "./adresse-mobiiz.service.js";

/** Au-delà, les pièces jointes d'un e-mail reçu ne sont pas gardées (nommées « trop lourdes »). */
export const RECU_MAX_OCTETS = 10 * 1024 * 1024;

export interface EmailRecuVue {
  id: string;
  de: string;
  /** Le nom affiché de l'expéditeur (« Négoce Dupont »), sinon son adresse. */
  expediteur: string;
  objet: string;
  texte: string | null;
  recuLe: string;
  luLe: string | null;
  /** La demande à laquelle il est rattaché (le négoce et le chantier), sinon null : il est dans « Reçus ». */
  demande: { recipientId: string; projectId: string; negoce: string } | null;
  fichiers: { id: string; nom: string; type: string; taille: number; devisRecu: boolean }[];
  tropLourdes: string[];
}

type Evenement = { email_id?: string; from?: string; to?: string[] | string; subject?: string; created_at?: string };

/**
 * R7 : LES RÉPONSES DES NÉGOCES ARRIVENT DANS MOBIIZ. Un e-mail reçu sur une adresse Mobiiz est gardé (corps et pièces
 * jointes), rattaché à sa demande quand l'étiquette de réponse ou le repère de l'objet la nomme (un PDF joint devient
 * alors le devis reçu du négoce, comme déposé à la main), sinon posé dans « Reçus » pour être rattaché d'un tap ; et
 * l'artisan est prévenu (push et e-mail à son adresse personnelle), jamais à une adresse Mobiiz (pas de boucle).
 */
export class ReponsesRecuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adresses: AdresseMobiizService,
    private readonly priceRequests: PriceRequestsService,
    private readonly notifications: NotificationsGroupeService,
    private readonly domaine: string | null,
    private readonly logger: AppLogger,
    private readonly now: () => Date = () => new Date(),
    /** Les adresses d'envoi de l'application (contact@, l'adresse de réponse) : un e-mail parti d'elles n'est jamais repris. */
    private readonly adressesInternes: readonly string[] = [],
  ) {}

  /** Le webhook : null quand l'e-mail ne vise aucune adresse Mobiiz (la suite du routage décide). */
  async recevoir(evenement: Evenement, lecteur: LecteurEmailRecu): Promise<{ traite: boolean; raison?: string; id?: string; rattache?: boolean } | null> {
    if (!this.domaine) return null;
    const to = Array.isArray(evenement.to) ? evenement.to : evenement.to ? [evenement.to] : [];
    const cible = lireAdresseMobiiz(to, this.domaine);
    if (!cible) return null;
    const companyId = await this.adresses.entrepriseDe(cible.adresse);
    // Correction après test de Greg (30 octobre 2026) : une adresse que personne n'a ne perd jamais l'e-mail.
    if (!companyId) return this.mettreDeCote(evenement, to, lecteur);
    return this.ranger(companyId, cible, evenement, lecteur);
  }

  /** L'e-mail d'une adresse inconnue, gardé pour l'admin (corps, noms des pièces jointes, identifiant Resend). */
  private async mettreDeCote(evenement: Evenement, to: string[], lecteur: LecteurEmailRecu) {
    const lu = evenement.email_id ? await lecteur.lire(evenement.email_id).catch(() => null) : null;
    const m = await this.prisma.emailMisDeCote.create({
      data: {
        adresse: to.map(adresseNue).find((a) => a.endsWith(`@${this.domaine}`)) ?? to.join(", "),
        de: evenement.from ?? "",
        objet: lu?.subject ?? evenement.subject ?? "",
        texte: lu ? (lu.text ?? texteDuHtml(lu.html)) : null,
        emailId: evenement.email_id ?? null,
        pieces: lu ? [...lu.attachments.map((p) => p.filename), ...lu.tropLourdes] : [],
        recuLe: new Date(lu?.date ?? evenement.created_at ?? this.now().toISOString()),
      },
    });
    this.logger.warn({ id: m.id }, "adresse mobiiz: e-mail mis de côté (adresse inconnue)");
    return { traite: false, raison: "adresse_inconnue", misDeCote: true, id: m.id };
  }

  /** Les e-mails mis de côté qui attendent l'admin, du plus récent au plus ancien. */
  async misDeCote() {
    const liste = await this.prisma.emailMisDeCote.findMany({ where: { rattacheLe: null }, orderBy: { recuLe: "desc" }, take: 200 });
    return liste.map((m) => ({ id: m.id, adresse: m.adresse, de: m.de, objet: m.objet, texte: m.texte, pieces: m.pieces, recuLe: m.recuLe.toISOString() }));
  }

  /** L'admin rattache un e-mail mis de côté à l'entreprise d'une adresse Mobiiz : il rejoint ses reçus, l'artisan est prévenu. */
  async rattacherMisDeCote(id: string, adresseMobiiz: string, lecteur: LecteurEmailRecu) {
    const m = await this.prisma.emailMisDeCote.findUnique({ where: { id } });
    if (!m || m.rattacheLe) throw notFound("E-mail");
    const nom = adresseMobiiz.trim().toLowerCase().replace(/@.*$/, "");
    const companyId = await this.adresses.entrepriseDe(nom);
    if (!companyId) throw validationFailed("Unknown Mobiiz address", { reason: "adresse_inconnue", phrase: "Aucune entreprise n'a cette adresse Mobiiz." });
    const r = await this.ranger(companyId, { adresse: nom, etiquette: null }, { email_id: m.emailId ?? undefined, from: m.de, to: [m.adresse], subject: m.objet, created_at: m.recuLe.toISOString() }, lecteur, m.texte);
    await this.prisma.emailMisDeCote.update({ where: { id }, data: { rattacheLe: this.now(), companyId } });
    return r;
  }

  /** Range l'e-mail chez l'entreprise : sa demande (étiquette ou repère de l'objet), sinon « Reçus » ; prévient l'artisan. */
  private async ranger(companyId: string, cible: { adresse: string; etiquette: string | null }, evenement: Evenement, lecteur: LecteurEmailRecu, texteGarde: string | null = null) {
    const to = Array.isArray(evenement.to) ? evenement.to : evenement.to ? [evenement.to] : [];
    const from = evenement.from ?? "";
    // Pas de boucle : un e-mail parti d'une adresse d'envoi de l'application (contact@, réponse) n'est jamais repris ; une
    // autre adresse du domaine (un vrai négoce ne l'a jamais, mais la recette, si) passe.
    const expediteur = adresseNue(from);
    if (this.adressesInternes.includes(expediteur) || expediteur === `${cible.adresse}@${this.domaine}`) return { traite: false, raison: "boucle" };
    const lu = evenement.email_id ? await lecteur.lire(evenement.email_id).catch(() => null) : null;
    const recu: EmailRecu = lu ?? {
      from,
      to,
      subject: evenement.subject ?? "",
      date: evenement.created_at ?? this.now().toISOString(),
      text: texteGarde,
      html: null,
      attachments: [],
      tropLourdes: [],
    };
    const destinataire = await this.demandeVisee(companyId, cible.etiquette ?? etiquetteDansObjet(evenement.subject ?? "") ?? etiquetteDansObjet(recu.subject));
    const fichiers: { nom: string; type: string; contenu: Uint8Array }[] = [];
    const tropLourdes = [...recu.tropLourdes];
    let total = 0;
    for (const p of recu.attachments) {
      const contenu = new Uint8Array(Buffer.from(p.contentBase64, "base64"));
      if (total + contenu.length > RECU_MAX_OCTETS) {
        tropLourdes.push(p.filename);
        continue;
      }
      total += contenu.length;
      fichiers.push({ nom: p.filename, type: p.contentType, contenu });
    }
    const email = await this.prisma.emailRecuArtisan.create({
      data: {
        companyId,
        adresse: cible.adresse,
        recipientId: destinataire?.id ?? null,
        projectId: destinataire?.priceRequest.projectId ?? null,
        de: from,
        objet: recu.subject,
        texte: recu.text ?? texteDuHtml(recu.html),
        recuLe: new Date(recu.date),
        tropLourdes,
        fichiers: { create: fichiers.map((f) => ({ nom: f.nom, type: f.type, taille: f.contenu.length, contenu: new Uint8Array(f.contenu) })) },
      },
      include: { fichiers: { select: { id: true, nom: true, type: true } } },
    });
    let rattache = false;
    if (destinataire) rattache = await this.devisDepuisPdf(companyId, destinataire.id, email.id);
    const negoce = destinataire?.supplier.name ?? nomExpediteur(from);
    const url = destinataire ? `/chantiers/${destinataire.priceRequest.projectId}#fournisseurs` : "/recus";
    await this.notifications
      .prevenir(
        companyId,
        { titre: `${negoce} t'a répondu`, corps: destinataire ? "Sa réponse est sur ton chantier, dans Mobiiz." : "Son e-mail est dans tes reçus, dans Mobiiz.", url, etiquette: `recu-${email.id}` },
        { objet: `${negoce} t'a répondu par e-mail`, texte: `${negoce} t'a écrit à ton adresse ${NOM_APP} (objet : ${recu.subject || "sans objet"}).\n\n${destinataire ? "Sa réponse est sur ton chantier" : "Son e-mail est dans tes reçus"} : ${this.notifications.lienVers(url)}\n\n${NOM_APP}` },
      )
      .catch((err: unknown) => this.logger.warn({ err }, "adresse mobiiz: artisan non prévenu"));
    this.logger.info({ adresse: cible.adresse, rattache }, "adresse mobiiz: e-mail reçu");
    return { traite: true, id: email.id, rattache };
  }

  /** La demande que l'étiquette nomme, si elle est bien de cette entreprise. */
  private async demandeVisee(companyId: string, etiquette: string | null) {
    if (!etiquette) return null;
    const r = await this.prisma.priceRequestRecipient.findUnique({ where: { etiquette }, include: { priceRequest: { select: { projectId: true, companyId: true } }, supplier: { select: { name: true } } } });
    return r && r.priceRequest.companyId === companyId ? r : null;
  }

  /** Le premier PDF de l'e-mail devient le devis reçu de la demande (sauf si elle en a déjà un). */
  private async devisDepuisPdf(companyId: string, recipientId: string, emailId: string): Promise<boolean> {
    const pdf = await this.prisma.emailRecuFichier.findFirst({ where: { emailId, type: "application/pdf", documentId: null }, orderBy: { id: "asc" } });
    if (!pdf) return false;
    const tenant = await this.tenantDe(companyId);
    if (!tenant) return false;
    try {
      const vue = await this.priceRequests.attachQuote(tenant, recipientId, { fileName: pdf.nom, bytes: new Uint8Array(pdf.contenu) });
      const documentId = vue.recipients.find((r) => r.id === recipientId)?.document?.id ?? null;
      if (documentId) await this.prisma.emailRecuFichier.update({ where: { id: pdf.id }, data: { documentId } });
      return true;
    } catch (err) {
      // Déjà un devis sur cette demande, ou PDF illisible : l'e-mail reste rattaché, le fichier reste à ouvrir.
      this.logger.info({ err: err instanceof DomainError ? err.code : String(err) }, "adresse mobiiz: PDF non rattaché comme devis");
      return false;
    }
  }

  /** Le propriétaire de l'entreprise agit pour elle (le webhook n'a pas de session). */
  private async tenantDe(companyId: string): Promise<TenantContext | null> {
    const m = await this.prisma.membership.findFirst({ where: { companyId, role: "owner" }, include: { company: { select: { trades: true } } } });
    return m ? { companyId, userId: m.userId, role: "owner", trades: m.company.trades } : null;
  }

  /** Les demandes parties (à qui, quel chantier), pour rattacher un e-mail reçu sans repère. */
  async demandesParties(tenant: TenantContext): Promise<{ recipientId: string; projectId: string; chantier: string; negoce: string; envoyeeLe: string | null; recue: boolean }[]> {
    const liste = await this.prisma.priceRequestRecipient.findMany({
      where: { priceRequest: { companyId: tenant.companyId }, sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 100,
      include: { supplier: { select: { name: true } }, priceRequest: { select: { projectId: true, project: { select: { name: true } } } } },
    });
    return liste.map((r) => ({ recipientId: r.id, projectId: r.priceRequest.projectId, chantier: r.priceRequest.project.name, negoce: r.supplier.name, envoyeeLe: r.sentAt?.toISOString() ?? null, recue: !!r.documentId }));
  }

  async lister(tenant: TenantContext, projectId?: string): Promise<EmailRecuVue[]> {
    const liste = await this.prisma.emailRecuArtisan.findMany({
      where: { companyId: tenant.companyId, ...(projectId ? { projectId } : {}) },
      orderBy: [{ recuLe: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { fichiers: { select: { id: true, nom: true, type: true, taille: true, documentId: true } }, recipient: { include: { supplier: { select: { name: true } }, priceRequest: { select: { projectId: true } } } } },
    });
    return liste.map((e) => this.vue(e));
  }

  async un(tenant: TenantContext, id: string): Promise<EmailRecuVue> {
    const e = await this.charger(tenant, id);
    if (!e.luLe) await this.prisma.emailRecuArtisan.update({ where: { id }, data: { luLe: this.now() } });
    return this.vue({ ...e, luLe: e.luLe ?? this.now() });
  }

  async fichier(tenant: TenantContext, id: string, fichierId: string): Promise<{ nom: string; type: string; contenu: Uint8Array }> {
    await this.charger(tenant, id);
    const f = await this.prisma.emailRecuFichier.findFirst({ where: { id: fichierId, emailId: id } });
    if (!f) throw notFound("Fichier");
    return { nom: f.nom, type: f.type, contenu: new Uint8Array(f.contenu) };
  }

  /** « Rattacher à une demande » : l'e-mail rejoint le chantier du négoce et son PDF devient le devis reçu. */
  async rattacher(tenant: TenantContext, id: string, recipientId: string): Promise<EmailRecuVue> {
    if (tenant.role === "viewer") throw new DomainError("forbidden", "Read-only membership");
    const e = await this.charger(tenant, id);
    if (e.recipientId) throw validationFailed("Already attached", { reason: "deja_rattache", phrase: "Cet e-mail est déjà rattaché à une demande." });
    const r = await this.prisma.priceRequestRecipient.findFirst({ where: { id: recipientId, priceRequest: { companyId: tenant.companyId } }, include: { priceRequest: { select: { projectId: true } } } });
    if (!r) throw notFound("Recipient");
    await this.prisma.emailRecuArtisan.update({ where: { id }, data: { recipientId: r.id, projectId: r.priceRequest.projectId } });
    await this.devisDepuisPdf(tenant.companyId, r.id, id);
    return this.un(tenant, id);
  }

  private async charger(tenant: TenantContext, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Email");
    const e = await this.prisma.emailRecuArtisan.findFirst({
      where: { id, companyId: tenant.companyId },
      include: { fichiers: { select: { id: true, nom: true, type: true, taille: true, documentId: true } }, recipient: { include: { supplier: { select: { name: true } }, priceRequest: { select: { projectId: true } } } } },
    });
    if (!e) throw notFound("Email");
    return e;
  }

  private vue(e: {
    id: string;
    de: string;
    objet: string;
    texte: string | null;
    recuLe: Date;
    luLe: Date | null;
    tropLourdes: string[];
    fichiers: { id: string; nom: string; type: string; taille: number; documentId: string | null }[];
    recipient: { id: string; supplier: { name: string }; priceRequest: { projectId: string } } | null;
  }): EmailRecuVue {
    return {
      id: e.id,
      de: e.de,
      expediteur: nomExpediteur(e.de),
      objet: e.objet,
      texte: e.texte,
      recuLe: e.recuLe.toISOString(),
      luLe: e.luLe?.toISOString() ?? null,
      demande: e.recipient ? { recipientId: e.recipient.id, projectId: e.recipient.priceRequest.projectId, negoce: e.recipient.supplier.name } : null,
      fichiers: e.fichiers.map((f) => ({ id: f.id, nom: f.nom, type: f.type, taille: f.taille, devisRecu: !!f.documentId })),
      tropLourdes: e.tropLourdes,
    };
  }
}

/** Le texte d'un e-mail qui n'a que du HTML. */
export function texteDuHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() || null;
}
