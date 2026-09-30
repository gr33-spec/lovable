import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { DocumentInput } from "../../../platform/ai/document-reader.js";
import type { TenantContext } from "../../tenancy/index.js";
import type { DocumentRepository, DocumentWithProcessing } from "./document.repository.js";

export interface PdfPageTools {
  extract(bytes: Uint8Array, pages: readonly number[]): Promise<Uint8Array>;
  pageCount(bytes: Uint8Array): Promise<number>;
}

export interface PreparedDocument {
  input: DocumentInput;
  processingId: string | null;
  pagesText: number;
  pagesVision: number;
}

/**
 * Ce que l'IA doit lire d'un document déjà déposé : le texte numéroté des
 * pages propres, l'image des autres ; le PDF entier si la lecture locale a
 * échoué pour une raison technique. Commun à toutes les lectures par l'IA.
 */
export class DocumentAiInput {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly pdf: PdfPageTools,
    private readonly limits: { maxPages: number },
  ) {}

  async prepare(tenant: TenantContext, doc: DocumentWithProcessing): Promise<PreparedDocument> {
    const processing = doc.processing;
    const readFailed = processing?.status === "failed" && processing.errorCode === "read_failed";
    if (processing?.status === "failed" && !readFailed) {
      throw new DomainError("unreadable_document", "Document cannot be read", { reason: processing.errorCode ?? "corrupted" });
    }
    if (!processing || readFailed) {
      const content = await this.documents.readContent(tenant, doc.id);
      if (!content) throw notFound("Document");
      const count = await this.pdf.pageCount(content.bytes);
      if (count > this.limits.maxPages) {
        throw new DomainError("unreadable_document", "Too many pages", { reason: "too_many_pages" });
      }
      const pages = Array.from({ length: count }, (_, i) => i + 1);
      return {
        input: { numberedText: "", imagePdf: content.bytes, imagePages: pages },
        processingId: processing?.id ?? null,
        pagesText: 0,
        pagesVision: count,
      };
    }

    const pages = await this.documents.findPages(tenant, processing.id);
    const textPages = pages.filter((p) => p.route === "text");
    const visionPages = pages.filter((p) => p.route === "vision").map((p) => p.pageNumber);
    if (textPages.length === 0 && visionPages.length === 0) {
      throw validationFailed("No page to read", { reason: "nothing_to_read" });
    }
    const numberedText = textPages.flatMap((p) => p.lines.map((l) => `[${l.ref}] ${l.text}`)).join("\n");
    let imagePdf: Uint8Array | null = null;
    if (visionPages.length > 0) {
      const content = await this.documents.readContent(tenant, doc.id);
      if (!content) throw notFound("Document");
      imagePdf = await this.pdf.extract(content.bytes, visionPages);
    }
    return {
      input: { numberedText, imagePdf, imagePages: visionPages },
      processingId: processing.id,
      pagesText: textPages.length,
      pagesVision: visionPages.length,
    };
  }

  /** Texte de chaque ligne citable du document, par référence « page:ligne ». */
  async sourceLines(tenant: TenantContext, documentId: string): Promise<Map<string, string>> {
    const doc = await this.documents.findById(tenant, documentId);
    const processing = doc?.processing;
    const map = new Map<string, string>();
    if (!processing || processing.status !== "completed") return map;
    for (const page of await this.documents.findPages(tenant, processing.id)) {
      if (page.route !== "text") continue;
      for (const line of page.lines) map.set(line.ref, line.text);
    }
    return map;
  }
}
