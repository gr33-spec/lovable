import type { PageForEstimate } from "@baticlair/domain";
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
  /** Pages à lire (texte ou image), pour décider du plan de lecture avant tout appel. */
  pages: PageForEstimate[];
  /** Ce que l'IA lit pour un bloc de pages (gros devis lu en plusieurs parties). */
  slice(pageNumbers: readonly number[]): Promise<DocumentInput>;
}

/** Taille d'une page A4 en points : dimension par défaut d'une page jamais analysée localement. */
const A4 = { widthPt: 595.28, heightPt: 841.89 };

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
        pages: pages.map((pageNumber) => ({ pageNumber, route: "vision" as const, chars: 0, ...A4 })),
        slice: async (wanted) => {
          const keep = pages.filter((p) => wanted.includes(p));
          return { numberedText: "", imagePdf: await this.pdf.extract(content.bytes, keep), imagePages: keep };
        },
      };
    }

    const pages = await this.documents.findPages(tenant, processing.id);
    const textPages = pages.filter((p) => p.route === "text");
    const visionPages = pages.filter((p) => p.route === "vision").map((p) => p.pageNumber);
    if (textPages.length === 0 && visionPages.length === 0) {
      throw validationFailed("No page to read", { reason: "nothing_to_read" });
    }
    const pageText = (p: (typeof textPages)[number]) => p.lines.map((l) => `[${l.ref}] ${l.text}`).join("\n");
    const numberedText = textPages.map(pageText).join("\n");
    let bytes: Uint8Array | null = null;
    let imagePdf: Uint8Array | null = null;
    if (visionPages.length > 0) {
      const content = await this.documents.readContent(tenant, doc.id);
      if (!content) throw notFound("Document");
      bytes = content.bytes;
      imagePdf = await this.pdf.extract(bytes, visionPages);
    }
    const readable = pages.filter((p) => p.route === "text" || p.route === "vision");
    return {
      input: { numberedText, imagePdf, imagePages: visionPages },
      processingId: processing.id,
      pagesText: textPages.length,
      pagesVision: visionPages.length,
      pages: readable.map((p) => ({
        pageNumber: p.pageNumber,
        route: p.route,
        chars: p.route === "text" ? pageText(p).length : 0,
        lines: p.route === "text" ? p.lines.length : 0,
        widthPt: p.widthPt,
        heightPt: p.heightPt,
      })),
      slice: async (wanted) => {
        const set = new Set(wanted);
        const text = textPages.filter((p) => set.has(p.pageNumber)).map(pageText).join("\n");
        const images = visionPages.filter((n) => set.has(n));
        return {
          numberedText: text,
          imagePdf: images.length > 0 && bytes ? await this.pdf.extract(bytes, images) : null,
          imagePages: images,
        };
      },
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
