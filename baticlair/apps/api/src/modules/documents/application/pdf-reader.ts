import type { PdfContent, UnreadableReason } from "../domain/document.js";

/**
 * Lecture locale d'un PDF (texte par page, sans IA et sans service externe).
 */
export interface PdfReader {
  read(bytes: Uint8Array, options: { maxPages: number }): Promise<PdfContent>;
}

export const PDF_READER = Symbol("PDF_READER");

export class PdfReadError extends Error {
  constructor(
    readonly reason: UnreadableReason,
    message: string,
  ) {
    super(message);
    this.name = "PdfReadError";
  }
}
