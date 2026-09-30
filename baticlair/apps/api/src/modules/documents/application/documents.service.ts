import { createHash } from "node:crypto";
import {
  DEFAULT_EXTRACTION_POLICY,
  DEFAULT_TRADE,
  estimateDocumentCost,
  numberLines,
  priceTableAt,
  routePage,
  TRADE_PROFILES,
  type ExtractionPolicy,
} from "@baticlair/domain";
import { DomainError, notFound } from "../../../platform/errors/domain-error.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { cleanFileName, looksLikePdf, PIPELINE_VERSION, type DocumentPurpose, type UnreadableReason } from "../domain/document.js";
import type { DocumentRepository, DocumentWithProcessing, PageRecord } from "./document.repository.js";
import { PdfReadError, type PdfReader } from "./pdf-reader.js";

export interface UploadInput {
  purpose: DocumentPurpose;
  fileName: string | undefined;
  bytes: Uint8Array;
}

export interface DocumentLimits {
  maxBytes: number;
  maxPages: number;
}

export interface UploadResult {
  document: DocumentWithProcessing;
  /** Le même fichier était déjà dans ce chantier : rien n'a été ajouté ni relu. */
  duplicate: boolean;
}

const unreadable = (reason: UnreadableReason, message: string) =>
  new DomainError("unreadable_document", message, { reason });

/**
 * Dépôt et lecture des documents d'un chantier — étape B de l'audit des
 * coûts IA : tout ce qui se fait SANS IA (contrôle du fichier, empreinte,
 * texte page par page, choix texte / image / écarter, estimation du coût
 * de l'extraction à venir). Aucun appel payant ici.
 */
export class DocumentsService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly reader: PdfReader,
    private readonly limits: DocumentLimits,
    private readonly policy: ExtractionPolicy = DEFAULT_EXTRACTION_POLICY,
    private readonly now: () => Date = () => new Date(),
    private readonly onReadFailure: (error: unknown, documentId: string) => void = () => {},
  ) {}

  async upload(tenant: TenantContext, projectId: string, input: UploadInput): Promise<UploadResult> {
    assertCanWrite(tenant);
    if (!(await this.documents.projectExists(tenant, projectId))) throw notFound("Project");
    if (input.bytes.byteLength === 0) throw unreadable("empty", "Empty file");
    if (input.bytes.byteLength > this.limits.maxBytes) {
      throw new DomainError("payload_too_large", "Document too large", { maxBytes: this.limits.maxBytes });
    }
    // Le type réel se lit dans le contenu, jamais dans l'extension ou le type annoncé.
    if (!looksLikePdf(input.bytes)) throw unreadable("not_pdf", "Not a PDF");

    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const existing = await this.documents.findByHash(tenant, projectId, sha256);
    if (existing) {
      const doc = await this.documents.findById(tenant, existing.id);
      if (doc) return { document: doc, duplicate: true };
    }

    const trade = DEFAULT_TRADE;
    const created = await this.documents.create(
      tenant,
      {
        projectId,
        purpose: input.purpose,
        trade,
        originalName: cleanFileName(input.fileName),
        mimeType: "application/pdf",
        sizeBytes: input.bytes.byteLength,
        sha256,
      },
      input.bytes,
    );

    await this.read(tenant, created.id, trade, input.bytes);
    const doc = await this.documents.findById(tenant, created.id);
    if (!doc) throw notFound("Document");
    return { document: doc, duplicate: false };
  }

  /** Lecture locale : jamais d'erreur remontée à l'artisan, le résultat est enregistré (réussi ou non). */
  private async read(tenant: TenantContext, documentId: string, trade: string, bytes: Uint8Array): Promise<void> {
    const profile = TRADE_PROFILES[trade];
    if (!profile) throw new Error(`Profil métier inconnu : ${trade}`);
    let content;
    try {
      content = await this.reader.read(bytes, { maxPages: this.limits.maxPages });
    } catch (error) {
      // Un échec technique n'est jamais présenté comme un fichier abîmé.
      const code = error instanceof PdfReadError ? error.reason : "read_failed";
      if (!(error instanceof PdfReadError)) this.onReadFailure(error, documentId);
      await this.documents.saveProcessing(tenant, documentId, PIPELINE_VERSION, { status: "failed", errorCode: code });
      return;
    }

    const pages: PageRecord[] = content.pages.map((page) => {
      const routing = routePage(page, profile);
      const lines = numberLines(page);
      return {
        pageNumber: page.pageNumber,
        route: routing.route,
        reason: routing.reason,
        widthPt: page.widthPt,
        heightPt: page.heightPt,
        chars: routing.metrics.chars,
        metrics: { ...routing.metrics },
        lines: lines.map((l) => ({ ref: l.ref, text: l.text })),
      };
    });

    const estimate = estimateDocumentCost(pages, this.policy, priceTableAt(this.now()));
    await this.documents.saveProcessing(tenant, documentId, PIPELINE_VERSION, {
      status: "completed",
      pageCount: content.pageCount,
      pages,
      estimatedMicroUsd: estimate.totalMicroUsd,
      estimate: { ...estimate, policy: this.policy },
    });
  }

  list(tenant: TenantContext, projectId: string): Promise<DocumentWithProcessing[]> {
    return this.documents.listByProject(tenant, projectId);
  }

  async get(tenant: TenantContext, id: string): Promise<{ document: DocumentWithProcessing; pages: PageRecord[] }> {
    const document = await this.documents.findById(tenant, id);
    if (!document) throw notFound("Document");
    const pages = document.processing ? await this.documents.findPages(tenant, document.processing.id) : [];
    return { document, pages };
  }

  async content(tenant: TenantContext, id: string) {
    const content = await this.documents.readContent(tenant, id);
    if (!content) throw notFound("Document");
    return content;
  }
}
