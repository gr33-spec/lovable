import { PDFDocument } from "pdf-lib";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { looksLikePdf } from "../domain/document.js";

export interface UploadedPart {
  fileName: string;
  bytes: Uint8Array;
}

type PhotoKind = "jpeg" | "png";

/** Le type réel se lit dans le contenu (jamais dans l'extension). */
function photoKind(bytes: Uint8Array): PhotoKind | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return null;
}

/** Côté le plus long d'une page photo : celui d'un A4 (842 pt). */
const PAGE_LONG_SIDE_PT = 842;

/**
 * Photos d'un devis (une par page) → un seul PDF, dans l'ordre. Le PDF ne
 * contient que des images : la lecture passe donc par l'IA « en image ».
 * Dates fixes : les mêmes photos donnent le même fichier (anti-doublon).
 */
export async function photosToPdf(photos: { kind: PhotoKind; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Devis fournisseur (photos)");
  pdf.setProducer("BatiClair");
  pdf.setCreator("BatiClair");
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  for (const photo of photos) {
    // Copie : pdf-lib lit le tampon depuis son début (ignore le décalage des vues partagées).
    const bytes = photo.bytes.slice();
    const image = photo.kind === "jpeg" ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
    const scale = PAGE_LONG_SIDE_PT / Math.max(image.width, image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  }
  return pdf.save();
}

/**
 * Ce que l'artisan dépose pour un devis reçu : un PDF, ou une ou plusieurs
 * photos (JPEG/PNG) rassemblées en un PDF. Tout le reste est refusé.
 */
export async function assembleQuote(parts: UploadedPart[]): Promise<UploadedPart> {
  const [first] = parts;
  if (!first) throw new DomainError("validation_failed", "Missing file", { reason: "no_file" });
  if (parts.length === 1 && looksLikePdf(first.bytes)) return first;

  const photos = parts.map((p) => ({ kind: photoKind(p.bytes), bytes: p.bytes }));
  if (photos.some((p) => p.kind === null)) {
    if (parts.some((p) => looksLikePdf(p.bytes))) {
      throw new DomainError("validation_failed", "One PDF or photos only", { reason: "one_pdf_or_photos" });
    }
    throw new DomainError("unreadable_document", "Not a PDF nor a photo", { reason: "not_pdf" });
  }
  let bytes: Uint8Array;
  try {
    bytes = await photosToPdf(photos as { kind: PhotoKind; bytes: Uint8Array }[]);
  } catch {
    throw new DomainError("unreadable_document", "Unreadable photo", { reason: "corrupted" });
  }
  const base = first.fileName.replace(/\.[^.]*$/, "").trim() || "devis";
  return { fileName: `${base}.pdf`, bytes };
}
