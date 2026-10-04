import { ApiError, MAX_REQUEST_BYTES } from "@/lib/api";

/** Un devis photographié page par page : 10 pages au plus. */
export const MAX_QUOTE_PHOTOS = 10;

export function isPhoto(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|heic|heif)$/i.test(file.name);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError("unreadable_document", 422, undefined, undefined, "photo_unreadable"));
    };
    img.src = url;
  });
}

/** Photo → JPEG réduit (côté le plus long ≤ `maxSide`). Lit aussi le HEIC de l'iPhone dans Safari. */
async function toJpeg(img: HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new ApiError("unreadable_document", 422, undefined, undefined, "photo_unreadable");
  return blob;
}

/** Réglages essayés dans l'ordre, jusqu'à tenir dans la taille d'envoi (lisible avant tout). */
const LEVELS = [
  { maxSide: 2000, quality: 0.8 },
  { maxSide: 1600, quality: 0.7 },
  { maxSide: 1200, quality: 0.6 },
];

/** Photos du devis, allégées pour l'envoi : renvoie les fichiers JPEG à déposer, dans l'ordre. */
export async function preparePhotos(files: File[]): Promise<File[]> {
  const images = await Promise.all(files.map(loadImage));
  // La conversion en PDF côté serveur ajoute un peu de poids : on garde une marge.
  const budget = MAX_REQUEST_BYTES * 0.95;
  for (const level of LEVELS) {
    const blobs = await Promise.all(images.map((img) => toJpeg(img, level.maxSide, level.quality)));
    if (blobs.reduce((sum, b) => sum + b.size, 0) <= budget) {
      return blobs.map((b, i) => new File([b], `${files[i]!.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`, { type: "image/jpeg" }));
    }
  }
  throw new ApiError("payload_too_large", 413);
}
