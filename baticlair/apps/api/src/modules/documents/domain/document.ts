/**
 * Documents déposés dans un chantier (devis client, devis fournisseurs).
 * Voir docs/document-pipeline.md.
 */
export type DocumentPurpose = "client_quote" | "supplier_quote";
export type DocumentStatus = "stored" | "read" | "failed";
export type PageRoute = "text" | "vision" | "skip";

/**
 * Version du pipeline de lecture. Elle change à chaque modification qui
 * peut changer le résultat (règles de routage, reconstitution des lignes) :
 * un retraitement crée alors un nouveau DocumentProcessing.
 */
export const PIPELINE_VERSION = "read-v1";

/** Raisons d'un document illisible, traduites en message par l'interface. */
export type UnreadableReason = "not_pdf" | "empty" | "encrypted" | "corrupted" | "too_many_pages";

/** Un PDF commence par « %PDF- » (tolère quelques octets parasites avant, comme les lecteurs PDF). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  return head.includes("%PDF-");
}

/** Nom de fichier affichable : sans chemin, sans caractères de contrôle, 200 caractères au plus. */
export function cleanFileName(raw: string | undefined): string {
  const base = (raw ?? "").split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return cleaned.length > 0 ? cleaned : "document.pdf";
}

export interface PdfPageContent {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  lines: string[];
}

export interface PdfContent {
  pageCount: number;
  pages: PdfPageContent[];
}
