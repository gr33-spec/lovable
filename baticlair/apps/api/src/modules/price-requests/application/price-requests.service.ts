import { isWorkQuantity, lineKind, parseUnit, tradeProfile } from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { DocumentsService } from "../../documents/index.js";
import type { SupplierRepository } from "../../suppliers/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { priceRequestEmail } from "./price-request-email.js";
import type { PriceRequestRecord, PriceRequestRepository, RecipientStatus } from "./price-request.repository.js";

export interface PriceRequestView extends PriceRequestRecord {
  /** E-mail prêt à envoyer, par destinataire. */
  emails: Map<string, { subject: string; body: string }>;
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
  ) {}

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
    const takeoff = await this.requests.validatedTakeoff(tenant, projectId);
    if (!takeoff)
      throw validationFailed("Validate the materials list first", {
        reason: "takeoff_not_validated",
      });
    const profile = tradeProfile(takeoff.trade);
    // Les prestations (pose, dépose…) ne se commandent pas : elles ne partent pas chez le fournisseur.
    const lines = takeoff.lines.flatMap((l) => {
      const { kind, family } = lineKind(l.designation, profile);
      if (kind === "labor") return [];
      // Surface d'ouvrage (« liteaux 120 m² ») : demandée comme telle, jamais comme une quantité d'achat.
      return [{ ...l, ...(kind === "material" && isWorkQuantity(family, parseUnit(l.unit)) ? { basis: "work" as const } : {}) }];
    });
    if (lines.length === 0) throw validationFailed("Nothing to order", { reason: "no_material" });
    const supplierIds = await this.checkSuppliers(tenant, input.supplierIds);
    const created = await this.requests.create(tenant, {
      projectId,
      takeoffId: takeoff.id,
      lines,
      message: input.message,
      dueDate: input.dueDate,
      supplierIds,
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
