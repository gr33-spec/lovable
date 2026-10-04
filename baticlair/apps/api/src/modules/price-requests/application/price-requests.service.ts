import { briefFacts, briefSentence, communeOf, groupIdenticalLines, parseUnit, withoutLabour } from "@baticlair/domain";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { DocumentsService } from "../../documents/index.js";
import type { SupplierRepository } from "../../suppliers/index.js";
import type { ReviewedTakeoff } from "../../takeoff/index.js";
import type { RequestedLine } from "./price-request-email.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { priceRequestEmail, requestedQuantityText, supplierLineLabel } from "./price-request-email.js";
import type { PriceRequestRecord, PriceRequestRepository, RecipientStatus } from "./price-request.repository.js";
import { packetDocument, packetMail, packetPdf, packetSubject, priceLeak, type PacketDocument, type PacketSender, type PacketSupply, type SketchFile, type SupplierPacket } from "./supplier-packet.js";

export interface PriceRequestView extends PriceRequestRecord {
  /** E-mail prêt à envoyer, par destinataire : le texte des trois blocs (§43.5). */
  emails: Map<string, { subject: string; body: string }>;
}

/** La date du jour, AAAA-MM-JJ, en heure de Paris. */
const today = (now: Date) => now.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
const fileName = (chantier: string) =>
  `demande-de-devis-${chantier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "chantier"}.pdf`;
/** Référence courte du chantier (§45.3), stable : la fin de son identifiant. */
export const shortReference = (projectId: string) => `CH-${projectId.replace(/-/g, "").slice(-6).toUpperCase()}`;

/**
 * LA DEMANDE DE DEVIS (§42, §43, §45), assemblée depuis le quantitatif, la lecture du devis et les réponses
 * de l'artisan. Aucun prix n'entre ici : les montants du devis client ne sont jamais lus.
 */
export function buildPacket(
  reviewed: ReviewedTakeoff,
  sender: {
    companyName: string;
    projectName: string;
    projectAddress: string | null;
    projectId?: string;
    projectNotes?: string | null;
    /** Coordonnées du compte (§45.2 signature, §45.3 en-tête). */
    profile?: PacketSender;
  },
  options: { date: string; joindreDetail: boolean; message: string | null; dueDate: Date | null },
  /** Les lignes reprises du devis telles qu'elles partent (identiques réunies, §43.5 : une ligne par article). */
  direct: readonly RequestedLine[],
  /** Croquis rattachés aux articles (clé de l'article) : la ligne dit « croquis joint », le PDF les montre. */
  sketches: readonly { id: string; nom: string; itemKey: string; note: string | null }[] = [],
): SupplierPacket {
  const { purchase, takeoff, validation } = reviewed;
  // Un croquis suit l'article de la liste : par sa clé (article calculé), ou par la ligne du devis reprise telle quelle.
  const keyed = new Map<string, string>();
  for (const b of purchase.toBuy) keyed.set(b.key, b.kind === "computed" ? b.label : supplierLineLabel(takeoff.lines.find((l) => b.lineIds.includes(l.id))?.designation ?? b.label));
  const croquis = sketches.filter((s) => keyed.has(s.itemKey)).map((s) => ({ article: keyed.get(s.itemKey)!, id: s.id, nom: s.nom, commentaire: s.note }));
  const withSketch = new Set(croquis.map((c) => c.article));
  const precision = (label: string, own?: string | null) => [own, withSketch.has(label) ? "croquis joint" : null].filter(Boolean).join(" ; ") || null;
  // §45.3 bloc 2 : désignation · quantité dans l'unité de vente (et la longueur à couvrir quand elle diffère) · précision.
  const fournitures: PacketSupply[] = [
    ...purchase.toBuy
      .filter((b) => b.kind === "computed")
      // Le matériau principal d'abord : dans l'ordre des lignes du devis d'où viennent les articles (§45.3).
      .map((b, i) => ({ b, i, at: Math.min(...b.lineIds.map((id) => takeoff.lines.findIndex((l) => l.id === id)).filter((x) => x >= 0), Number.MAX_SAFE_INTEGER) }))
      .sort((x, y) => x.at - y.at || x.i - y.i)
      .map(({ b }) => ({
        designation: b.label,
        quantite: `${b.quantity ?? "quantité à préciser"}${b.approx ? ` (${b.approx})` : ""}`,
        precision: precision(b.label, b.precision),
        ...(b.consumable ? { consommable: true } : {}),
        cle: b.key,
      })),
    ...direct.map((l) => {
      const item = purchase.toBuy.find((b) => b.kind === "direct" && takeoff.lines.some((t) => b.lineIds.includes(t.id) && t.designation === l.designation));
      return {
        designation: `${supplierLineLabel(l.designation)}${l.reference ? ` (réf. ${l.reference})` : ""}`,
        quantite: requestedQuantityText(l),
        precision: precision(supplierLineLabel(l.designation), item?.precision),
        ...(item ? { cle: item.key } : {}),
      };
    }),
  ];
  const articles = fournitures.map((f) => `${f.designation} : ${f.quantite}${f.precision ? ` (${f.precision})` : ""}`);
  // §45.3 bloc 3 : la ligne du devis avec sa mesure, et une demande simple. Jamais la cuisine interne.
  const a_chiffrer = purchase.toQuote.map((q) => {
    const line = q.lineIds[0] ? takeoff.lines.find((l) => l.id === q.lineIds[0]) : undefined;
    return `${supplierLineLabel(line?.designation ?? q.label)}${q.measure ? ` · ${q.measure}` : ""} : merci de proposer ce que vous avez`;
  });
  // §45.3 bloc 1 : 5 à 8 faits confirmés (jamais une hypothèse de l'app tant que l'artisan ne l'a pas confirmée).
  const brief = { ...reviewed.brief, ville: reviewed.brief.ville ?? communeOf(sender.projectAddress) };
  // La note de l'artisan (§44 : « accès par la cour ») : telle qu'écrite, deux lignes au plus, jamais une ligne qui parle
  // de prix ni une ligne de mesures (déjà lues comme faits). Elle passe avant les derniers faits, la ville ferme le bloc.
  const notes = (sender.projectNotes ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !priceLeak(l) && !/\d/.test(l))
    .slice(0, 2);
  const facts = briefFacts(brief);
  const where = brief.ville || brief.situation ? facts.slice(-1) : [];
  const resume = [...facts.slice(0, facts.length - where.length).slice(0, 8 - where.length - notes.length), ...notes, ...where];
  const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
  // Le devis sans les prix (§42) : une ligne par ouvrage, la main-d'œuvre seule exclue, jamais le prix.
  const kinds = new Map(validation.lines.map((l) => [l.lineId, l.kind]));
  const detail = takeoff.lines
    .filter((l) => kinds.get(l.id) !== "labor")
    .map((l) => ({
      // Marchandise seule : pas de « (Fourniture et pose) » chez le fournisseur.
      libelle: withoutLabour(l.designation),
      mesure: [l.quantityRaw, l.unitRaw].filter(Boolean).join(" ") || null,
      precisions: [
        ...(l.material ? [l.material] : []),
        ...Object.entries(l.dimensions ?? {}).map(([k, v]) => `${k} ${v}`),
        // §44.2 : la ligne visée par une phrase de la note reste au détail, marquée, et ne part pas dans la demande.
        ...(reviewed.excluded?.has(l.id) ? [`exclu par l'artisan (« ${reviewed.excluded.get(l.id)} »)`] : []),
      ],
    }));
  return {
    entreprise: sender.companyName,
    chantier: sender.projectName,
    commune: brief.ville,
    date: options.date,
    articles,
    a_chiffrer,
    resume,
    detail,
    joindre_detail: options.joindreDetail,
    question_lien: null,
    ...(croquis.length > 0 ? { croquis } : {}),
    fournitures,
    phrase: briefSentence(brief),
    expediteur: sender.profile ?? { nom: "", adresse: null, siret: null, telephone: null, email: null },
    ...(sender.projectId ? { reference: shortReference(sender.projectId) } : {}),
    message: options.message?.trim() || null,
    echeance: options.dueDate ? dateFr(options.dueDate) : null,
  };
}

/**
 * Demandes de prix d'un chantier. Pour le MVP, l'artisan envoie lui-même
 * l'e-mail préparé (sa messagerie) et dépose à la main le devis reçu ;
 * l'envoi et la réception automatiques reprendront les mêmes statuts.
 */
export class PriceRequestsService {
  constructor(
    private readonly requests: PriceRequestRepository,
    private readonly suppliers: SupplierRepository,
    private readonly documents: DocumentsService,
    /** Le quantitatif validé, revu par le moteur (liste d'achats, lecture du devis, hypothèses). */
    private readonly reviewedTakeoff: (tenant: TenantContext, takeoffId: string) => Promise<ReviewedTakeoff>,
    private readonly mailer: TransactionalEmailSender & { readonly deliversEmail: boolean },
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Des e-mails partent-ils vraiment du serveur (sinon : messagerie de l'artisan + PDF à télécharger) ? */
  get deliversEmail(): boolean {
    return this.mailer.deliversEmail;
  }

  async settings(tenant: TenantContext): Promise<{ attachQuoteDetail: boolean }> {
    return { attachQuoteDetail: await this.requests.attachQuoteDetail(tenant) };
  }

  async setSettings(tenant: TenantContext, settings: { attachQuoteDetail: boolean }): Promise<{ attachQuoteDetail: boolean }> {
    assertCanWrite(tenant);
    await this.requests.setAttachQuoteDetail(tenant, settings.attachQuoteDetail);
    return { attachQuoteDetail: settings.attachQuoteDetail };
  }

  /** Le PDF « Demande de devis » (§45.3) d'une demande : au nom d'un destinataire quand il est donné. */
  async pdf(tenant: TenantContext, requestId: string, recipientId?: string): Promise<{ filename: string; bytes: Uint8Array }> {
    const request = await this.requests.findById(tenant, requestId);
    if (!request?.packet) throw notFound("PriceRequest");
    const recipient = recipientId ? request.recipients.find((r) => r.id === recipientId) : undefined;
    const sender = await this.requests.sender(tenant, request.projectId);
    const bytes = await packetPdf(request.packet, await this.sketchFiles(tenant, request.packet), { logo: sender?.logo ?? null, destinataire: recipient?.supplier.name ?? null });
    return { filename: fileName(request.packet.chantier), bytes };
  }

  /** Les fichiers des croquis d'une commande (relus au rendu ; un croquis supprimé depuis est simplement absent). */
  private async sketchFiles(tenant: TenantContext, packet: SupplierPacket): Promise<SketchFile[]> {
    const files: SketchFile[] = [];
    for (const c of packet.croquis ?? []) {
      const content = await this.documents.content(tenant, c.id).catch(() => null);
      if (content) files.push({ id: c.id, mimeType: content.mimeType, bytes: content.bytes });
    }
    return files;
  }

  /**
   * Envoi par le serveur (§43) : le texte des trois blocs dans le corps, le PDF joint. Puis « envoyée ».
   * Sans prestataire d'e-mail, l'artisan envoie depuis sa messagerie : ce chemin répond 409.
   */
  async send(tenant: TenantContext, recipientId: string): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    if (!this.mailer.deliversEmail) throw new DomainError("conflict", "Email delivery is not enabled", { reason: "email_disabled" });
    const request = await this.requests.findByRecipient(tenant, recipientId);
    if (!request) throw notFound("PriceRequestRecipient");
    const recipient = request.recipients.find((r) => r.id === recipientId)!;
    if (!request.packet) throw new DomainError("conflict", "This request predates the supplier packet", { reason: "no_packet" });
    const pdf = await this.pdf(tenant, request.id, recipientId);
    await this.mailer.send({
      to: recipient.supplier.email,
      subject: packetSubject(request.packet),
      text: packetMail(request.packet),
      // Le PDF « Demande de devis » (les blocs + les croquis en pages), puis chaque croquis d'origine, pour le zoom.
      attachments: [
        { filename: pdf.filename, contentType: "application/pdf", contentBase64: Buffer.from(pdf.bytes).toString("base64") },
        ...(await this.sketchFiles(tenant, request.packet)).map((f) => ({
          filename: request.packet!.croquis?.find((c) => c.id === f.id)?.nom ?? "croquis",
          contentType: f.mimeType,
          contentBase64: Buffer.from(f.bytes).toString("base64"),
        })),
      ],
    });
    await this.requests.setStatus(tenant, recipientId, "sent");
    return this.reload(tenant, request.id);
  }

  /**
   * « Exporter la liste en PDF » (§21.3, §45.9) : la liste validée, rendue par LE MÊME générateur que le PDF envoyé au
   * fournisseur (un seul générateur, une seule mise en page, aucun prix) ; pour l'imprimer ou la donner au comptoir.
   */
  async exportPdf(tenant: TenantContext, projectId: string): Promise<{ filename: string; bytes: Uint8Array }> {
    const { packet, logo } = await this.order(tenant, projectId, { message: null, dueDate: null });
    return { filename: fileName(packet.chantier), bytes: await packetPdf(packet, await this.sketchFiles(tenant, packet), { logo }) };
  }

  /**
   * L'APERÇU AVANT ENVOI (§45.9) : le document exactement comme le fournisseur le recevra (même générateur que le PDF),
   * l'objet et le mail. Rien ne part tant que l'artisan n'a pas appuyé sur « Envoyer ».
   */
  async preview(tenant: TenantContext, projectId: string, input: { message: string | null; dueDate: Date | null; destinataire?: string | null }): Promise<{ subject: string; mail: string; document: PacketDocument; hasLogo: boolean }> {
    const { packet, logo } = await this.order(tenant, projectId, input);
    return { subject: packetSubject(packet), mail: packetMail(packet), document: packetDocument(packet, { destinataire: input.destinataire ?? null }), hasLogo: !!logo };
  }

  /** Ce qui part chez le fournisseur : les lignes de la demande et le document (§45), depuis la liste validée. */
  private async order(tenant: TenantContext, projectId: string, input: { message: string | null; dueDate: Date | null }) {
    const takeoff = await this.requests.validatedTakeoff(tenant, projectId);
    if (!takeoff)
      throw validationFailed("Validate the materials list first", {
        reason: "takeoff_not_validated",
      });
    // Ce qui part chez le fournisseur, c'est LA LISTE D'ACHATS : les articles calculés par BatiClair dans leur
    // unité de commande, les quantités écrites telles quelles dans le devis, et ce qui reste à faire chiffrer
    // pour la mesure du devis. Jamais une mesure d'ouvrage présentée comme une quantité d'article.
    const reviewed = await this.reviewedTakeoff(tenant, takeoff.id);
    const purchase = reviewed.purchase;
    const byId = new Map(takeoff.lines.map((l) => [l.id, l]));
    const computed: RequestedLine[] = purchase.toBuy
      .filter((b) => b.kind === "computed")
      .map((b) => {
        // « 5 longueurs de 4 m » : l'unité de commande que le fournisseur ne lit pas comme une unité reste dans l'intitulé.
        const known = b.order && parseUnit(b.order.unit) !== null;
        return {
          designation: known || !b.order ? b.label : `${b.label} (${b.order.unit})`,
          quantity: b.order?.count ?? null,
          unit: b.order ? (known ? b.order.unit : "u") : null,
          reference: null,
        };
      });
    const direct = purchase.toBuy
      .filter((b) => b.kind === "direct")
      .map((b) => {
        const line = b.lineIds[0] ? byId.get(b.lineIds[0]) : undefined;
        return { designation: line?.designation ?? b.label, quantity: line?.quantity ?? null, unit: line?.unit ?? null, reference: line?.reference ?? null, section: line?.section ?? [] };
      });
    const toQuote: RequestedLine[] = purchase.toQuote.map((q) => {
      const line = q.lineIds[0] ? byId.get(q.lineIds[0]) : undefined;
      return { designation: line?.designation ?? q.label, quantity: line?.quantity ?? null, unit: line?.unit ?? null, reference: line?.reference ?? null, basis: "work" as const };
    });
    // Le même article répété pièce par pièce part en une seule ligne, avec le total et ses titres communs.
    const grouped = groupIdenticalLines(direct).map(({ mergedFrom, section, ...l }) => ({
      ...l,
      ...(section.length > 0 ? { section } : {}),
      ...(mergedFrom > 1 ? { mergedFrom } : {}),
    }));
    const lines: RequestedLine[] = [...computed, ...grouped, ...toQuote];
    if (lines.length === 0) throw validationFailed("Nothing to order", { reason: "no_material" });
    // §43 : les trois blocs, figés avec la demande (le mail et le PDF en sont deux rendus).
    const sender = await this.requests.sender(tenant, projectId);
    const packet = buildPacket(
      reviewed,
      {
        companyName: sender?.companyName ?? "",
        projectName: sender?.project.name ?? "",
        projectAddress: sender?.project.address ?? null,
        projectId: sender?.project.id ?? projectId,
        projectNotes: sender?.project.siteNotes ?? null,
        profile: {
          nom: sender?.senderName ?? "",
          adresse: sender?.company.address ?? null,
          siret: sender?.company.siret ?? null,
          telephone: sender?.company.phone ?? null,
          email: sender?.company.email ?? null,
        },
      },
      { date: today(this.clock()), joindreDetail: await this.requests.attachQuoteDetail(tenant), message: input.message, dueDate: input.dueDate },
      grouped,
      await this.requests.itemSketches(tenant, projectId),
    );
    return { takeoff, lines, packet, logo: sender?.logo ?? null };
  }

  async create(
    tenant: TenantContext,
    projectId: string,
    input: {
      supplierIds: string[];
      message: string | null;
      dueDate: Date | null;
    },
  ): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const { takeoff, lines, packet } = await this.order(tenant, projectId, input);
    const supplierIds = await this.checkSuppliers(tenant, input.supplierIds);
    const created = await this.requests.create(tenant, {
      projectId,
      takeoffId: takeoff.id,
      lines,
      message: input.message,
      dueDate: input.dueDate,
      supplierIds,
      packet,
    });
    return this.view(tenant, created);
  }

  async addSuppliers(tenant: TenantContext, requestId: string, supplierIds: string[]): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    const already = new Set(request.recipients.map((r) => r.supplier.id));
    const ids = (await this.checkSuppliers(tenant, supplierIds)).filter((id) => !already.has(id));
    if (ids.length > 0) await this.requests.addRecipients(tenant, request.id, ids);
    return this.reload(tenant, request.id);
  }

  async listForProject(tenant: TenantContext, projectId: string): Promise<PriceRequestView[]> {
    const list = await this.requests.listByProject(tenant, projectId);
    return Promise.all(list.map((r) => this.view(tenant, r)));
  }

  /** « Envoyée » est posé quand l'artisan ouvre l'e-mail préparé ; il peut revenir en arrière. */
  async setStatus(tenant: TenantContext, recipientId: string, status: Exclude<RecipientStatus, "received">): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const request = await this.requests.findByRecipient(tenant, recipientId);
    if (!request) throw notFound("Recipient");
    const recipient = request.recipients.find((r) => r.id === recipientId)!;
    if (recipient.document)
      throw new DomainError("conflict", "A quote was already received", {
        reason: "quote_received",
      });
    await this.requests.setStatus(tenant, recipientId, status);
    return this.reload(tenant, request.id);
  }

  /** Devis PDF reçu d'un fournisseur : rangé dans le chantier et rattaché à sa demande. */
  async attachQuote(
    tenant: TenantContext,
    recipientId: string,
    file: { fileName: string | undefined; bytes: Uint8Array },
  ): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const request = await this.requests.findByRecipient(tenant, recipientId);
    if (!request) throw notFound("Recipient");
    const recipient = request.recipients.find((r) => r.id === recipientId)!;
    if (recipient.document)
      throw new DomainError("conflict", "A quote was already received", {
        reason: "quote_received",
      });
    const result = await this.documents.upload(tenant, request.projectId, {
      purpose: "supplier_quote",
      ...file,
    });
    const owner = (await this.requests.listByProject(tenant, request.projectId))
      .flatMap((r) => r.recipients)
      .find((r) => r.document?.id === result.document.id);
    if (owner)
      throw new DomainError("conflict", "This PDF is already attached to another supplier", {
        reason: "quote_already_attached",
        supplier: owner.supplier.name,
      });
    await this.requests.attachDocument(tenant, recipientId, result.document.id);
    return this.reload(tenant, request.id);
  }

  /**
   * « Classé » : l'artisan a fait son choix ; retenir un ou plusieurs
   * fournisseurs est facultatif. `classified: false` rouvre la demande.
   */
  async classify(tenant: TenantContext, requestId: string, classified: boolean, retainedSupplierIds: string[]): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const request = await this.requests.findById(tenant, requestId);
    if (!request) throw notFound("PriceRequest");
    const known = new Set(request.recipients.map((r) => r.supplier.id));
    if (retainedSupplierIds.some((id) => !known.has(id))) throw validationFailed("Unknown supplier", { reason: "not_a_recipient" });
    await this.requests.classify(tenant, request.id, classified ? [...new Set(retainedSupplierIds)] : null);
    return this.reload(tenant, request.id);
  }

  async remove(tenant: TenantContext, requestId: string): Promise<void> {
    assertCanWrite(tenant);
    if (!(await this.requests.delete(tenant, requestId))) throw notFound("PriceRequest");
  }

  private async checkSuppliers(tenant: TenantContext, ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0)
      throw validationFailed("Choose at least one supplier", {
        reason: "no_supplier",
      });
    const found = await this.suppliers.findByIds(tenant, unique);
    if (found.length !== unique.length) throw notFound("Supplier");
    if (found.some((s) => s.archived))
      throw validationFailed("Archived supplier", {
        reason: "supplier_archived",
      });
    return unique;
  }

  private async reload(tenant: TenantContext, id: string): Promise<PriceRequestView> {
    const request = await this.requests.findById(tenant, id);
    if (!request) throw notFound("PriceRequest");
    return this.view(tenant, request);
  }

  private async view(tenant: TenantContext, request: PriceRequestRecord): Promise<PriceRequestView> {
    const sender = await this.requests.sender(tenant, request.projectId);
    const emails = new Map<string, { subject: string; body: string }>();
    for (const r of request.recipients) {
      // Depuis §45 : le mail court, la liste est dans le PDF joint ; les demandes d'avant §43 gardent leur ancien e-mail.
      if (request.packet) {
        emails.set(r.id, { subject: packetSubject(request.packet), body: packetMail(request.packet) });
        continue;
      }
      emails.set(
        r.id,
        priceRequestEmail({
          companyName: sender?.companyName ?? "",
          senderName: sender?.senderName ?? "",
          projectName: sender?.project.name ?? "",
          projectAddress: sender?.project.address ?? null,
          supplierName: r.supplier.name,
          contactName: r.supplier.contactName,
          lines: request.lines,
          message: request.message,
          dueDate: request.dueDate,
        }),
      );
    }
    return { ...request, emails };
  }
}
