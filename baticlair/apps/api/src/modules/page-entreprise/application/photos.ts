import sharp, { type Metadata } from "sharp";
import { DomainError } from "../../../platform/errors/domain-error.js";

/**
 * MA PAGE MOBIIZ, LES PHOTOS (Greg, 16 novembre 2026) : « l'artisan envoie sa photo telle quelle depuis son téléphone ;
 * Mobiiz la compresse et la redimensionne automatiquement en plusieurs tailles, en arrière-plan ». Formats modernes (AVIF
 * et WebP) à trois largeurs, plus un JPEG 1200 × 630 pour l'aperçu des réseaux (WhatsApp, Facebook lisent mal l'AVIF).
 * Le sens de la photo est redressé, ses métadonnées (lieu GPS, appareil, date, auteur) ne sont JAMAIS gardées.
 */
export const PHOTO_MAX_OCTETS = 10 * 1024 * 1024;
export const PHOTO_MIN_COTE = 300;
const PIXELS_MAX = 100_000_000;

export const LARGEURS: Record<"galerie" | "couverture", number[]> = {
  galerie: [480, 960, 1600],
  couverture: [640, 1280, 1920],
};

export type TypeImage = "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "image/heic";

/** Le format lu dans les octets (jamais dans le nom). */
export function typeDesOctets(o: Uint8Array): TypeImage | null {
  if (o.length < 12) return null;
  if (o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "image/jpeg";
  if (o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47) return "image/png";
  const ascii = (a: number, b: number) => Buffer.from(o.subarray(a, b)).toString("latin1");
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") {
    const marque = ascii(8, 12);
    if (/^avi[fs]$/.test(marque)) return "image/avif";
    if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(marque)) return "image/heic";
  }
  return null;
}

const refus = (reason: string, phrase: string) => new DomainError("validation_failed", phrase, { reason, phrase });

/** Contrôle à l'arrivée (avant de répondre) : poids, format réel, dimensions. Rend les dimensions redressées. */
export async function controlerPhoto(octets: Buffer): Promise<{ largeur: number; hauteur: number }> {
  if (octets.length === 0) throw refus("photo_vide", "Aucune photo reçue.");
  if (octets.length > PHOTO_MAX_OCTETS) throw refus("photo_trop_lourde", "Cette photo dépasse 10 Mo.");
  const type = typeDesOctets(octets);
  if (type === "image/heic") throw refus("photo_heic", "Ce format (HEIC) n'est pas encore lu : choisis la photo depuis ta galerie, elle sera convertie.");
  if (!type) throw refus("photo_type", "Choisis une photo (JPEG, PNG, WebP ou AVIF).");
  let meta: Metadata;
  try {
    meta = await sharp(octets, { limitInputPixels: PIXELS_MAX }).metadata();
  } catch {
    throw refus("photo_illisible", "Cette photo est illisible. Essaie avec une autre.");
  }
  const tourne = (meta.orientation ?? 1) >= 5;
  const largeur = (tourne ? meta.height : meta.width) ?? 0;
  const hauteur = (tourne ? meta.width : meta.height) ?? 0;
  if (Math.min(largeur, hauteur) < PHOTO_MIN_COTE) throw refus("photo_trop_petite", `Cette photo est trop petite (${PHOTO_MIN_COTE} pixels au moins de côté).`);
  return { largeur, hauteur };
}

export interface FichierProduit {
  nom: string;
  type: string;
  octets: Buffer;
  largeur: number;
}

/** Les fichiers à déposer : AVIF et WebP à chaque largeur (jamais plus grand que l'original), et le JPEG de partage. */
export async function produireVariantes(octets: Buffer, role: "galerie" | "couverture"): Promise<{ fichiers: FichierProduit[]; largeur: number; hauteur: number }> {
  const base = sharp(octets, { limitInputPixels: PIXELS_MAX }).rotate();
  const meta = await sharp(octets, { limitInputPixels: PIXELS_MAX }).metadata();
  const tourne = (meta.orientation ?? 1) >= 5;
  const info = { width: (tourne ? meta.height : meta.width) ?? 0, height: (tourne ? meta.width : meta.height) ?? 0 };
  const largeurs = [...new Set(LARGEURS[role].map((l) => Math.min(l, info.width)))];
  const fichiers: FichierProduit[] = [];
  for (const l of largeurs) {
    const taille = base.clone().resize({ width: l, withoutEnlargement: true });
    const [avif, webp] = await Promise.all([taille.clone().avif({ quality: role === "couverture" ? 45 : 50, effort: 3 }).toBuffer(), taille.clone().webp({ quality: 78 }).toBuffer()]);
    fichiers.push({ nom: `${l}.avif`, type: "image/avif", octets: avif, largeur: l }, { nom: `${l}.webp`, type: "image/webp", octets: webp, largeur: l });
  }
  const partage = await base.clone().resize({ width: 1200, height: 630, fit: "cover", position: "attention" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  fichiers.push({ nom: "partage.jpg", type: "image/jpeg", octets: partage, largeur: 1200 });
  return { fichiers, largeur: info.width, hauteur: info.height };
}
