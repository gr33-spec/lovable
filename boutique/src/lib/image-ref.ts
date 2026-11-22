// Référence d'image partagée entre serveur et navigateur.

export interface ImageRef {
  id: string;
  w: number;
  h: number;
  widths: number[];
  /** Aperçu flou minuscule (data URI) affiché pendant le chargement. */
  ph: string;
  alt: string;
  /** Préfixe public des fichiers : <base>/<largeur>.webp */
  base: string;
}

export function imageSrc(img: ImageRef, targetWidth: number): string {
  const w = img.widths.find((x) => x >= targetWidth) ?? img.widths[img.widths.length - 1];
  return `${img.base}/${w}.webp`;
}

export function imageSrcSet(img: ImageRef): string {
  return img.widths.map((w) => `${img.base}/${w}.webp ${w}w`).join(", ");
}
