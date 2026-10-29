import type { OrderGap } from "@baticlair/domain";
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
  /** R7 : l'étiquette de réponse (dans l'adresse « Répondre » et l'objet de la demande). */
  etiquette: string | null;
  /** Lot final, point 6 : l'artisan a été prévenu que ce négoce n'a pas répondu (mi-délai ou veille). */
  rappelLe?: Date | null;
}

/**
 * §47.5 retour fournisseur : ce que l'artisan a commandé chez le fournisseur retenu. « as_is » : la liste telle
 * qu'envoyée ; « modified » : le bon de commande (collé, ou photographié puis lu), comparé ligne à ligne.
 */
export interface OrderFeedback {
  supplierId: string;
  outcome: "as_is" | "modified";
  /** D'où viennent les lignes commandées : rien (tel quel), le texte collé, ou la photo lue (document). */
  source: "none" | "text" | "document";
  documentId?: string | null;
  /** Une photo déposée attend sa lecture. */
  pendingReading?: boolean;
  gaps: OrderGap[];
  at: string;
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
  /** §48.5 : les articles envoyés à part (clés de la liste) ; vide = toute la liste. */
  itemKeys: string[];
  /** §47.5 : le retour du fournisseur retenu (null tant que l'artisan n'a rien dit). */
  orderFeedback: OrderFeedback | null;
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
  /** Lot final, points 1, 3 et 4 : le prénom de l'artisan, le métier du chantier, son modèle de message, tu ou vous. */
  prenom?: string | null;
  trade?: string | null;
  modeleMessage?: string | null;
  tutoie?: boolean;
  project: { id: string; name: string; address: string | null; siteNotes: string | null };
  /** Coordonnées du compte (§45.2, §45.3) ; e-mail de l'artisan à défaut d'un e-mail d'entreprise. */
  company: { address: string | null; siret: string | null; phone: string | null; email: string | null };
  /** Logo du compte (PNG ou JPEG), lu au rendu du PDF. */
  logo: { bytes: Uint8Array; type: string } | null;
}

export interface PriceRequestRepository {
  /**
   * Dernière liste de matériaux VALIDÉE du chantier. `anyStatus` : la dernière liste, même pas encore validée (§48.5 :
   * une sélection de lignes prêtes part sans attendre le reste de la liste).
   */
  validatedTakeoff(tenant: TenantContext, projectId: string, options?: { anyStatus?: boolean }): Promise<ValidatedTakeoff | null>;
  sender(tenant: TenantContext, projectId: string): Promise<Sender | null>;
  /** Lot final, point 4 : le message modifié et le tutoiement, gardés comme modèle personnel. */
  saveModele(tenant: TenantContext, m: { message?: string | undefined; tutoie?: boolean | undefined }): Promise<void>;
  /** Les croquis rattachés à un article de la liste (clé de l'article), avec la précision de l'artisan. */
  itemSketches(tenant: TenantContext, projectId: string): Promise<{ id: string; nom: string; itemKey: string; note: string | null }[]>;
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
      itemKeys?: string[];
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
  /** R7 : l'étiquette de réponse posée à l'envoi (`adresse+r<étiquette>@mobiiz.fr`). */
  setEtiquette(tenant: TenantContext, recipientId: string, etiquette: string): Promise<void>;
  delete(tenant: TenantContext, id: string): Promise<boolean>;
  /** Classe la demande (fournisseurs retenus facultatifs) ; `null` la rouvre. */
  classify(tenant: TenantContext, id: string, retainedSupplierIds: string[] | null): Promise<void>;
  /** §47.5 : le retour fournisseur (remplace le précédent). */
  setOrderFeedback(tenant: TenantContext, id: string, feedback: OrderFeedback | null): Promise<void>;
}

export const PRICE_REQUEST_REPOSITORY = Symbol("PRICE_REQUEST_REPOSITORY");
