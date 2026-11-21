import type { OfferLineKind } from "@baticlair/domain";
import type { TenantContext } from "../../tenancy/index.js";

export type MatchConfidence = "sure" | "probable" | "unsure";

export interface OfferLineFields {
  kind: OfferLineKind;
  designation: string;
  reference: string | null;
  quantityRaw: string | null;
  unitRaw: string | null;
  /** Montants et taux en texte décimal (« 12.50 », « 0.10 »), tels que lus. */
  unitPrice: string | null;
  discountRate: string | null;
  lineTotal: string | null;
  packagingQuantity: string | null;
  packagingUnit: string | null;
  /** Rang (à partir de 0) de la ligne demandée correspondante, ou null. */
  requestIndex: number | null;
}

export interface NewOfferLine extends OfferLineFields {
  matchConfidence: MatchConfidence | null;
  aiDoubt: string | null;
  sourceRefs: string[];
}

export interface OfferLineRecord extends NewOfferLine {
  id: string;
  position: number;
  matchConfirmed: boolean;
  edited: boolean;
}

export interface OfferTotals {
  totalHT: string | null;
  totalVAT: string | null;
  totalTTC: string | null;
  globalDiscountRate: string | null;
  globalDiscountAmount: string | null;
  deliveryIncluded: boolean | null;
}

export interface OfferRecord extends OfferTotals {
  id: string;
  documentId: string;
  model: string;
  promptVersion: number;
  notes: string[];
  createdAt: Date;
  lines: OfferLineRecord[];
}

export interface NewOffer extends OfferTotals {
  documentId: string;
  analysisId: string | null;
  promptId: string;
  promptVersion: number;
  model: string;
  notes: string[];
  lines: NewOfferLine[];
}

export interface OfferRepository {
  findByDocument(tenant: TenantContext, documentId: string): Promise<OfferRecord | null>;
  findByDocuments(tenant: TenantContext, documentIds: string[]): Promise<OfferRecord[]>;
  /** Devis auquel appartient une ligne (dans l'entreprise active). */
  findByLine(tenant: TenantContext, lineId: string): Promise<OfferRecord | null>;
  create(tenant: TenantContext, data: NewOffer): Promise<OfferRecord>;
  /** Correction par l'artisan : la ligne devient sienne, sa correspondance est confirmée. */
  updateLine(tenant: TenantContext, lineId: string, fields: OfferLineFields): Promise<void>;
}

export const OFFER_REPOSITORY = Symbol("OFFER_REPOSITORY");
