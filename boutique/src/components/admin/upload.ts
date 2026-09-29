"use client";

import type { ImageRef } from "@/lib/image-ref";

// Préparation des photos dans le navigateur avant l'envoi : une photo de
// téléphone (souvent 4 à 12 Mo, parfois en HEIC) est réduite à 2400 px et
// convertie en JPEG. L'envoi est plus rapide sur une connexion mobile et
// respecte la limite du serveur. Le serveur refait ensuite ses propres
// contrôles : ce qui arrive du navigateur n'est jamais considéré comme sûr.

const MAX_SIDE = 2400;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Certains navigateurs (formats HEIC sur Safari) décodent mieux via <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp|avif)$/i.test(file.name)) {
    throw new Error("Ce fichier n'est pas une photo.");
  }
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error("Format de photo non reconnu par ce navigateur. Essayez en JPEG ou PNG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(source, 0, 0, w, h);
  const keepAlpha = file.type === "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, keepAlpha ? "image/png" : "image/jpeg", 0.9));
  if (!blob) return file;
  // Un PNG très détaillé peut rester lourd : on repasse en JPEG si besoin.
  if (blob.size > 3.8 * 1024 * 1024) {
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (jpeg) return jpeg;
  }
  return blob;
}

export async function uploadImageFile(file: File, kind: "product" | "brand"): Promise<ImageRef> {
  const prepared = await prepareImage(file);
  const body = new FormData();
  body.append("file", prepared, "photo");
  body.append("kind", kind);
  let res: Response;
  try {
    res = await fetch("/api/admin/images", { method: "POST", body });
  } catch {
    throw new Error("Connexion perdue pendant l'envoi. Réessayez.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Envoi impossible.");
  return data.image as ImageRef;
}
