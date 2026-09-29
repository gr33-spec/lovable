import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { ImageRef } from "../image-ref";
import { publicFileUrl, putFile, removeFiles } from "./storage";

// Traitement des photos importées : le fichier n'est JAMAIS conservé tel
// quel. Il est décodé (ce qui prouve que c'est une vraie image, quelle que
// soit son extension), redressé, débarrassé de ses métadonnées (dont la
// position GPS du téléphone), puis réencodé en plusieurs tailles WebP.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // limite des fonctions Vercel : 4,5 Mo
export const VARIANT_WIDTHS = [320, 640, 1024, 1600];
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);
const MAX_PIXELS = 60_000_000; // ~ 60 mégapixels : protège contre les « bombes » de décompression

export class ImageRejectedError extends Error {}

export interface ProcessedImage {
  width: number;
  height: number;
  widths: number[];
  placeholder: string;
  contentHash: string;
  bytes: number;
  variants: { key: string; body: Buffer; contentType: string }[];
}

export async function processImage(input: Buffer, id: string, kind: "product" | "brand"): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageRejectedError("Le fichier est vide.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageRejectedError("Photo trop lourde (4 Mo maximum après préparation).");
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
  } catch {
    throw new ImageRejectedError("Ce fichier n'est pas une image lisible (formats acceptés : JPEG, PNG, WebP, HEIC).");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new ImageRejectedError("Format d'image non pris en charge.");
  if (!meta.width || !meta.height) throw new ImageRejectedError("Dimensions de l'image illisibles.");
  const oriented = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error", animated: false }).rotate();
  const master = await oriented.toBuffer({ resolveWithObject: true });
  const { width, height } = master.info;
  if (Math.min(width, height) < (kind === "product" ? 300 : 32)) throw new ImageRejectedError("Photo trop petite (300 pixels minimum).");

  const widths = VARIANT_WIDTHS.filter((w) => w <= width);
  if (widths.length === 0 || widths[widths.length - 1] < Math.min(width, 1600)) widths.push(Math.min(width, 1600));
  const unique = [...new Set(widths)].sort((a, b) => a - b);

  const variants: ProcessedImage["variants"] = [];
  for (const w of unique) {
    const body = await sharp(master.data).resize({ width: w, withoutEnlargement: true }).webp({ quality: w <= 640 ? 78 : 82, effort: 4, smartSubsample: true }).toBuffer();
    variants.push({ key: `images/${id}/${w}.webp`, body, contentType: "image/webp" });
  }
  // Image de partage (Facebook, WhatsApp, Messenger) : JPEG, universellement accepté.
  const og = await sharp(master.data).flatten({ background: "#ffffff" }).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  variants.push({ key: `images/${id}/og.jpg`, body: og, contentType: "image/jpeg" });

  const tiny = await sharp(master.data).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  return {
    width,
    height,
    widths: unique,
    placeholder: `data:image/webp;base64,${tiny.toString("base64")}`,
    contentHash: createHash("sha256").update(input).digest("hex"),
    bytes: variants.reduce((s, v) => s + v.body.length, 0),
    variants,
  };
}

export async function storeVariants(processed: ProcessedImage): Promise<void> {
  await Promise.all(processed.variants.map((v) => putFile("public", v.key, v.body, v.contentType)));
}

export async function deleteImageFiles(id: string, widths: number[]): Promise<void> {
  await removeFiles("public", [...widths.map((w) => `images/${id}/${w}.webp`), `images/${id}/og.jpg`]);
}

export interface ImageRow {
  id: string;
  width: number;
  height: number;
  widths: number[];
  placeholder: string;
  alt: string;
}

/** Référence sérialisable envoyée aux composants (aucune donnée interne). */
export function toImageRef(row: ImageRow): ImageRef {
  return {
    id: row.id,
    w: row.width,
    h: row.height,
    widths: row.widths,
    ph: row.placeholder,
    alt: row.alt,
    base: publicFileUrl(`images/${row.id}`),
  };
}

export function ogImageUrl(row: Pick<ImageRow, "id">): string {
  return publicFileUrl(`images/${row.id}/og.jpg`);
}
