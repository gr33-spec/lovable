import { PDFDocument } from "pdf-lib";

/** Copie les pages demandées (numéros à partir de 1) dans un nouveau PDF. */
export async function extractPdfPages(bytes: Uint8Array, pages: readonly number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const target = await PDFDocument.create();
  const copied = await target.copyPages(source, pages.map((p) => p - 1));
  for (const page of copied) target.addPage(page);
  return target.save();
}

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}
