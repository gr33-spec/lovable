import type { TenantContext } from "../../tenancy/index.js";
import type { DocumentPurpose, DocumentStatus, PageRoute } from "../domain/document.js";

export interface NewDocument {
  projectId: string;
  purpose: DocumentPurpose;
  trade: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export interface DocumentRecord extends NewDocument {
  id: string;
  pageCount: number | null;
  status: DocumentStatus;
  createdAt: Date;
}

export interface NumberedLineRecord {
  ref: string;
  text: string;
}

export interface PageRecord {
  pageNumber: number;
  route: PageRoute;
  reason: string;
  widthPt: number;
  heightPt: number;
  chars: number;
  metrics: Record<string, number>;
  lines: NumberedLineRecord[];
}

export interface ProcessingRecord {
  id: string;
  pipelineVersion: string;
  status: "processing" | "completed" | "failed";
  errorCode: string | null;
  pagesTotal: number;
  pagesText: number;
  pagesVision: number;
  pagesSkipped: number;
  estimatedMicroUsd: bigint;
  actualMicroUsd: bigint;
  estimate: unknown;
  startedAt: Date;
  finishedAt: Date | null;
}

export type NewProcessing =
  | {
      status: "completed";
      pageCount: number;
      pages: PageRecord[];
      estimatedMicroUsd: number;
      estimate: unknown;
    }
  | { status: "failed"; errorCode: string };

export interface DocumentWithProcessing extends DocumentRecord {
  processing: ProcessingRecord | null;
}

export interface DocumentRepository {
  projectExists(tenant: TenantContext, projectId: string): Promise<boolean>;
  findByHash(tenant: TenantContext, projectId: string, sha256: string): Promise<DocumentRecord | null>;
  /** Enregistre le document et son contenu, et marque l'activité du chantier. */
  create(tenant: TenantContext, data: NewDocument, bytes: Uint8Array): Promise<DocumentRecord>;
  /** Enregistre le résultat d'une lecture et met à jour l'état du document. */
  saveProcessing(tenant: TenantContext, documentId: string, pipelineVersion: string, result: NewProcessing): Promise<void>;
  listByProject(tenant: TenantContext, projectId: string): Promise<DocumentWithProcessing[]>;
  findById(tenant: TenantContext, id: string): Promise<DocumentWithProcessing | null>;
  findPages(tenant: TenantContext, processingId: string): Promise<PageRecord[]>;
  readContent(tenant: TenantContext, id: string): Promise<{ bytes: Uint8Array; mimeType: string; originalName: string } | null>;
  /**
   * Supprime le document, son fichier et ses lectures. Les appels IA et les
   * analyses déjà décomptées sont conservés (coûts et paliers restent justes).
   */
  delete(tenant: TenantContext, id: string): Promise<boolean>;
}

export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY");
