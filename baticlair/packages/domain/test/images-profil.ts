/** Des images minimales pour les tests de l'image du profil Missions : avec EXIF, GPS, commentaire et textes cachés. */
const texte = (t: string) => [...Buffer.from(t, "latin1")];
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const segment = (marqueur: number, corps: number[]) => [0xff, marqueur, ...u16(corps.length + 2), ...corps];

/** Un JPEG minimal : JFIF, EXIF avec une position GPS, un commentaire, le cadre (dimensions), puis les données. */
export function jpeg(largeur: number, hauteur: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    ...segment(0xe0, texte("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),
    ...segment(0xe1, texte("Exif\0\0GPS 48.8566N 2.3522E iPhone de Greg")),
    ...segment(0xfe, texte("pris chez M. Dupont, 3 rue des Ajoncs")),
    ...segment(0xc0, [8, ...u16(hauteur), ...u16(largeur), 1, 1, 0x11, 0]),
    ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12, 0x34, 0x56,
    0xff, 0xd9,
  ]);
}
const bloc = (nom: string, corps: number[]) => [...u32(corps.length), ...texte(nom), ...corps, 0, 0, 0, 0];
export function png(largeur: number, hauteur: number): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...bloc("IHDR", [...u32(largeur), ...u32(hauteur), 8, 2, 0, 0, 0]),
    ...bloc("tEXt", texte("Author\0Greg Martin, 06 12 34 56 78")),
    ...bloc("eXIf", texte("GPS 48.8566N")),
    ...bloc("IDAT", [1, 2, 3, 4]),
    ...bloc("IEND", []),
  ]);
}
