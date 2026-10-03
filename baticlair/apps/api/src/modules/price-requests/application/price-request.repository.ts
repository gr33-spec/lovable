import type { SupplierPacket } from "./supplier-packet.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { RequestedLine } from "./price-request-email.js";

export type RecipientStatus = "to_send" | "sent" | "received" | "declined";

export interface RecipientRecord {
  id: string;
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
    email: string;
    phone: string | null;
  };
  status: RecipientStatus;
  sentAt: Date | null;
  document: { id: string; name: string; status: string } | null;
}

export interface PriceRequestRecord {
  id: string;
  projectId: string;
  takeoffId: string;
  lines: RequestedLine[];
  message: string | null;
  dueDate: Date | null;
  createdAt: Date;
  /** « Classé » : l'artisan a fait son choix. */
  classifiedAt: Date | null;
  retainedSupplierIds: string[];
  recipients: RecipientRecord[];
  /** §43 : les trois blocs envoyés au fournisseur, figés avec la demande (null pour une demande d'avant). */
  packet: SupplierPacket | null;
}

export interface ValidatedTakeoff {
  id: string;
  trade: string;
  /** Lignes validées, avec le rôle de leur quantité (mesure d'ouvrage ou à commander). */
  lines: (RequestedLine & { id: string; role: "measure" | "purchase" | "undetermined" | null })[];
}

export interface Sender {
  companyName: string;
  senderName: string;
  project: { name: string; address: string | null };
}

export interface PriceRequestRepository {
  /** Dernière liste de matériaux VALIDÉE du chantier. */
  validatedTakeoff(tenant: TenantContext, projectId: string): Promise<ValidatedTakeoff | null>;
  sender(tenant: TenantContext, projectId: string): Promise<Sender | null>;
  create(
    tenant: TenantContext,
    data: {
      projectId: string;
      takeoffId: string;
      lines: RequestedLine[];
      message: string | null;
      dueDate: Date | null;
      supplierIds: string[];
      packet: SupplierPacket;
    },
  ): Promise<PriceRequestRecord>;
  /** Case « Joindre le détail du chantier » (§42.2), mémorisée par entreprise. */
  attachQuoteDetail(tenant: TenantContext): Promise<boolean>;
  setAttachQuoteDetail(tenant: TenantContext, value: boolean): Promise<void>;
  addRecipients(tenant: TenantContext, requestId: string, supplierIds: string[]): Promise<void>;
  listByProject(tenant: TenantContext, projectId: string): Promise<PriceRequestRecord[]>;
  findById(tenant: TenantContext, id: string): Promise<PriceRequestRecord | null>;
  findByRecipient(tenant: TenantContext, recipientId: string): Promise<PriceRequestRecord | null>;
  /** Demande dont un destinataire a déposé ce devis. */
  findByDocument(tenant: TenantContext, documentId: string): Promise<PriceRequestRecord | null>;
  setStatus(tenant: TenantContext, recipientId: string, status: RecipientStatus): Promise<void>;
  attachDocument(tenant: TenantContext, recipientId: string, documentId: string): Promise<void>;
  delete(tenant: TenantContext, id: string): Promise<boolean>;
  /** Classe la demande (fournisseurs retenus facultatifs) ; `null` la rouvre. */
  classify(tenant: TenantContext, id: string, retainedSupplierIds: string[] | null): Promise<void>;
}

export const PRICE_REQUEST_REPOSITORY = Symbol("PRICE_REQUEST_REPOSITORY");
