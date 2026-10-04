/**
 * Documents déposés dans un chantier (devis client, devis fournisseurs).
 * Voir docs/document-pipeline.md.
 */
export type DocumentPurpose = "client_quote" | "supplier_quote" | "sketch";
export type DocumentStatus = "stored" | "read" | "failed";
export type PageRoute = "text" | "vision" | "skip";

/**
 * Version du pipeline de lecture. Elle change à chaque modification qui
 * peut changer le résultat (règles de routage, reconstitution des lignes) :
 * un retraitement crée alors un nouveau DocumentProcessing.
 */
export const PIPELINE_VERSION = "read-v1";

/** Raisons d'un document illisible, traduites en message par l'interface. */
/** `read_failed` : échec technique de notre côté, le fichier n'est pas en cause. */
export type UnreadableReason = "not_pdf" | "empty" | "encrypted" | "corrupted" | "too_many_pages" | "read_failed";

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

/** Une image (JPEG, PNG, WebP) se reconnaît à ses premiers octets, jamais à son extension. */
export function imageMimeType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("latin1") === "WEBP") return "image/webp";
  return null;
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
