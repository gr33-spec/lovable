import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * LES FICHIERS CHIFFRÉS AU REPOS (revue, lot B, Greg, 26 octobre 2026 : « Sans cette clé, rien ne doit pouvoir être
 * chiffré. ») : AES-256-GCM avec `CHIFFREMENT_CLE` (32 octets en base64, posée par Greg dans Vercel). Sans clé, `chiffrer`
 * rend le fichier tel quel, comme avant : rien n'est chiffré, rien n'est perdu. Un fichier chiffré porte l'en-tête `MZC1`,
 * puis l'IV (12 octets), l'étiquette (16 octets) et le contenu ; un fichier sans en-tête (déposé avant, ou sans clé) se relit
 * tel quel. Relire un fichier chiffré sans la clé est une erreur franche, jamais un contenu illisible servi.
 */
const ENTETE = Buffer.from("MZC1");
const IV = 12;
const ETIQUETTE = 16;

export class CleDeChiffrementAbsente extends Error {
  constructor() {
    super("Encrypted file but CHIFFREMENT_CLE is not set");
  }
}

/** Lit la clé : 32 octets en base64, ou null quand la variable est vide. Une clé de mauvaise longueur fait échouer le démarrage. */
export function lireCle(valeur: string | undefined): Buffer | null {
  if (!valeur?.trim()) return null;
  const cle = Buffer.from(valeur.trim(), "base64");
  if (cle.length !== 32) throw new Error("CHIFFREMENT_CLE must be 32 bytes in base64 (openssl rand -base64 32)");
  return cle;
}

export const estChiffre = (contenu: Uint8Array): boolean => contenu.length >= ENTETE.length + IV + ETIQUETTE && Buffer.from(contenu.subarray(0, ENTETE.length)).equals(ENTETE);

export class Chiffreur {
  constructor(private readonly cle: Buffer | null) {}

  get actif(): boolean {
    return this.cle !== null;
  }

  /** Sans clé : le contenu tel quel. Avec : `MZC1` + IV + étiquette + contenu chiffré. Jamais chiffré deux fois. */
  chiffrer(contenu: Uint8Array): Buffer {
    if (!this.cle || estChiffre(contenu)) return Buffer.from(contenu);
    const iv = randomBytes(IV);
    const c = createCipheriv("aes-256-gcm", this.cle, iv);
    const corps = Buffer.concat([c.update(contenu), c.final()]);
    return Buffer.concat([ENTETE, iv, c.getAuthTag(), corps]);
  }

  /** Un fichier sans en-tête se rend tel quel ; un fichier chiffré exige la clé (sinon `CleDeChiffrementAbsente`). */
  dechiffrer(contenu: Uint8Array): Buffer {
    if (!estChiffre(contenu)) return Buffer.from(contenu);
    if (!this.cle) throw new CleDeChiffrementAbsente();
    const b = Buffer.from(contenu);
    const iv = b.subarray(ENTETE.length, ENTETE.length + IV);
    const etiquette = b.subarray(ENTETE.length + IV, ENTETE.length + IV + ETIQUETTE);
    const d = createDecipheriv("aes-256-gcm", this.cle, iv);
    d.setAuthTag(etiquette);
    return Buffer.concat([d.update(b.subarray(ENTETE.length + IV + ETIQUETTE)), d.final()]);
  }
}
