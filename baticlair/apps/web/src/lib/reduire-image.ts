/**
 * MA PAGE MOBIIZ : une photo de téléphone (souvent 4 à 10 Mo, parfois en HEIC sur iPhone) est réduite DANS LE NAVIGATEUR
 * avant l'envoi (2 560 px au plus, JPEG) : l'envoi est rapide en 4G et tient sous la limite de l'hébergeur (4 Mo par
 * requête). Le serveur fait ensuite les vraies tailles (AVIF, WebP). Le sens de la photo est respecté ; les métadonnées
 * (lieu GPS) disparaissent déjà ici. Un navigateur qui ne sait pas lire le fichier l'envoie tel quel s'il est assez léger.
 */
export const PHOTO_MAX_ENTREE = 10 * 1024 * 1024;
const ENVOI_MAX = 3_900_000;

export class PhotoRefusee extends Error {}

export async function reduireImage(fichier: File, cote = 2560, qualite = 0.86): Promise<Blob> {
  if (fichier.size > PHOTO_MAX_ENTREE) throw new PhotoRefusee("Cette photo dépasse 10 Mo.");
  let image: ImageBitmap | null = null;
  try {
    image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    image = null;
  }
  if (!image) {
    if (fichier.size <= ENVOI_MAX) return fichier;
    throw new PhotoRefusee("Ce format de photo n'est pas lu par ce navigateur. Essaie depuis la galerie du téléphone.");
  }
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const l = Math.round(image.width * echelle);
  const h = Math.round(image.height * echelle);
  const toile = document.createElement("canvas");
  toile.width = l;
  toile.height = h;
  const ctx = toile.getContext("2d");
  if (!ctx) return fichier;
  ctx.drawImage(image, 0, 0, l, h);
  image.close();
  for (const q of [qualite, 0.78, 0.7]) {
    const blob = await new Promise<Blob | null>((ok) => toile.toBlob(ok, "image/jpeg", q));
    if (blob && blob.size <= ENVOI_MAX) return blob;
  }
  throw new PhotoRefusee("Cette photo est trop lourde même réduite.");
}
