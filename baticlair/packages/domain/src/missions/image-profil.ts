/**
 * L'IMAGE DU PROFIL MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 12) : un logo ou une photo
 * d'entreprise, carrée, montrée avec le nom de l'entreprise dans le profil public, les annonces, les réponses et les
 * conversations. Sans image : les initiales.
 *
 * Tout se décide ici, en code pur : le type RÉEL du fichier (ses octets, jamais son nom), son poids, sa forme carrée, sa
 * taille, et le retrait des métadonnées (position GPS, appareil, auteur, date, commentaires) avant de la garder.
 */
export const IMAGE_PROFIL_MAX_OCTETS = 400_000;
export const IMAGE_PROFIL_COTE_MIN = 96;
export const IMAGE_PROFIL_COTE_MAX = 1024;
/** Le côté de l'image recadrée par l'écran avant l'envoi. */
export const IMAGE_PROFIL_COTE = 512;

export type FauteImageProfil = "vide" | "trop_lourde" | "type" | "illisible" | "carree" | "dimensions";
export const PHRASE_FAUTE_IMAGE_PROFIL: Record<FauteImageProfil, string> = {
  vide: "Ce fichier est vide.",
  trop_lourde: "Cette image est trop lourde (400 Ko au plus). Recadre-la depuis cet écran.",
  type: "Choisis une image JPEG ou PNG.",
  illisible: "Cette image n'a pas pu être lue. Essaie avec une autre.",
  carree: "L'image doit être carrée. Recadre-la depuis cet écran.",
  dimensions: "L'image doit mesurer entre 96 et 1 024 pixels de côté.",
};
export const PHRASE_FORMATS_IMAGE_PROFIL = "JPEG ou PNG, recadrée en carré. Les informations cachées de la photo (lieu, appareil, date) sont retirées.";

/** Le motif d'un signalement qui vise l'image du profil (et non une conversation). */
export const MOTIF_IMAGE_PROFIL = "image-profil";

export interface ImageProfilPropre {
  type: "image/jpeg" | "image/png";
  contenu: Uint8Array;
  cote: number;
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const u32 = (o: Uint8Array, i: number) => ((o[i]! << 24) | (o[i + 1]! << 16) | (o[i + 2]! << 8) | o[i + 3]!) >>> 0;
const u16 = (o: Uint8Array, i: number) => (o[i]! << 8) | o[i + 1]!;

function joindre(morceaux: Uint8Array[]): Uint8Array {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const sortie = new Uint8Array(total);
  let i = 0;
  for (const m of morceaux) {
    sortie.set(m, i);
    i += m.length;
  }
  return sortie;
}

/** JPEG : on garde l'image et ses tables ; les blocs d'application (EXIF, XMP, IPTC, GPS, profil) et les commentaires partent. */
function nettoyerJpeg(o: Uint8Array): { contenu: Uint8Array; largeur: number; hauteur: number } | null {
  const garde: Uint8Array[] = [o.subarray(0, 2)];
  let i = 2;
  let largeur = 0;
  let hauteur = 0;
  while (i + 4 <= o.length) {
    if (o[i] !== 0xff) return null;
    const m = o[i + 1]!;
    if (m === 0xff) {
      i++;
      continue;
    }
    // Début des données de l'image : tout le reste est l'image elle-même.
    if (m === 0xda) {
      garde.push(o.subarray(i));
      return largeur > 0 && hauteur > 0 ? { contenu: joindre(garde), largeur, hauteur } : null;
    }
    const taille = u16(o, i + 2);
    if (taille < 2 || i + 2 + taille > o.length) return null;
    const cadre = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (cadre && taille >= 7) {
      hauteur = u16(o, i + 5);
      largeur = u16(o, i + 7);
    }
    const metadonnee = (m >= 0xe1 && m <= 0xef) || m === 0xfe;
    if (!metadonnee) garde.push(o.subarray(i, i + 2 + taille));
    i += 2 + taille;
  }
  return null;
}

/** PNG : seuls les blocs qui font l'image restent ; textes, EXIF, date, profil et densité partent. */
function nettoyerPng(o: Uint8Array): { contenu: Uint8Array; largeur: number; hauteur: number } | null {
  const GARDES = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  const garde: Uint8Array[] = [o.subarray(0, 8)];
  let i = 8;
  let largeur = 0;
  let hauteur = 0;
  let fin = false;
  while (i + 12 <= o.length) {
    const taille = u32(o, i);
    const nom = String.fromCharCode(o[i + 4]!, o[i + 5]!, o[i + 6]!, o[i + 7]!);
    if (i + 12 + taille > o.length) return null;
    if (nom === "IHDR") {
      if (taille < 8) return null;
      largeur = u32(o, i + 8);
      hauteur = u32(o, i + 12);
    }
    if (GARDES.has(nom)) garde.push(o.subarray(i, i + 12 + taille));
    i += 12 + taille;
    if (nom === "IEND") {
      fin = true;
      break;
    }
  }
  return fin && largeur > 0 && hauteur > 0 ? { contenu: joindre(garde), largeur, hauteur } : null;
}

/** L'image prête à être gardée (sans métadonnées), ou la raison du refus. */
export function nettoyerImageProfil(octets: Uint8Array): ImageProfilPropre | { faute: FauteImageProfil } {
  if (octets.length === 0) return { faute: "vide" };
  if (octets.length > IMAGE_PROFIL_MAX_OCTETS) return { faute: "trop_lourde" };
  const jpeg = octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
  const png = PNG.every((b, i) => octets[i] === b);
  if (!jpeg && !png) return { faute: "type" };
  const propre = jpeg ? nettoyerJpeg(octets) : nettoyerPng(octets);
  if (!propre) return { faute: "illisible" };
  if (propre.largeur !== propre.hauteur) return { faute: "carree" };
  if (propre.largeur < IMAGE_PROFIL_COTE_MIN || propre.largeur > IMAGE_PROFIL_COTE_MAX) return { faute: "dimensions" };
  return { type: jpeg ? "image/jpeg" : "image/png", contenu: propre.contenu, cote: propre.largeur };
}
