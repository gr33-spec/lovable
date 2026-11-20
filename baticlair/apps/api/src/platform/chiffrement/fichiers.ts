import type { PrismaClient } from "../../generated/prisma/client.js";
import { estChiffre, type Chiffreur } from "./chiffreur.js";

/**
 * LES FICHIERS DÉJÀ EN BASE (lot B, 16 novembre 2026) : toutes les colonnes d'octets du schéma, table et colonne. Le test
 * `chiffrement-fichiers.test.ts` vérifie que la liste suit le schéma : une colonne de fichiers ajoutée sans y figurer fait
 * échouer le test.
 */
export const COLONNES_DE_FICHIERS: readonly (readonly [table: string, colonne: string])[] = [
  ["company", "logo"],
  ["document_blob", "bytes"],
  ["upload_part", "bytes"],
  ["reponse_negoce_fichier", "contenu"],
  ["bon_commande", "pdf"],
  ["facture_negoce", "pdf"],
  ["grille_negoce_fichier", "contenu"],
  ["email_recu_fichier", "contenu"],
  ["consultation_achat_groupe", "pdf"],
  ["fichier_pro", "contenu"],
  ["image_profil", "contenu"],
  ["signalement", "capture"],
];

export interface ReleveFichiers {
  table: string;
  colonne: string;
  total: number;
  chiffres: number;
  convertis: number;
}

/**
 * Chiffre (ou remet en clair) les fichiers déjà en base, un par un, sans rien supprimer. `sens` absent : relevé seul, rien
 * n'est écrit. Rejouable : un fichier déjà dans le bon état n'est pas touché. S'arrête à la première erreur (clé absente ou
 * mauvaise clé) : un fichier illisible n'est jamais écrasé. `brut` est le client SANS chiffrement (`PrismaService.$brut`).
 */
export async function convertirFichiers(brut: PrismaClient, chiffreur: Chiffreur, sens?: "chiffrer" | "dechiffrer"): Promise<ReleveFichiers[]> {
  if (sens && !chiffreur.actif) throw new Error("CHIFFREMENT_CLE manque : rien ne peut être chiffré ni remis en clair.");
  const releve: ReleveFichiers[] = [];
  for (const [table, colonne] of COLONNES_DE_FICHIERS) {
    // Les noms viennent de la liste ci-dessus, jamais d'une saisie.
    const lignes = await brut.$queryRawUnsafe<{ ref: string }[]>(`SELECT ctid::text AS ref FROM "${table}" WHERE "${colonne}" IS NOT NULL`);
    const r: ReleveFichiers = { table, colonne, total: lignes.length, chiffres: 0, convertis: 0 };
    for (const { ref } of lignes) {
      const [ligne] = await brut.$queryRawUnsafe<{ contenu: Uint8Array }[]>(`SELECT "${colonne}" AS contenu FROM "${table}" WHERE ctid = $1::tid`, ref);
      if (!ligne) continue;
      const chiffre = estChiffre(ligne.contenu);
      if (chiffre) r.chiffres++;
      if (!sens || (sens === "chiffrer") === chiffre) continue;
      const nouveau = sens === "chiffrer" ? chiffreur.chiffrer(ligne.contenu) : chiffreur.dechiffrer(ligne.contenu);
      await brut.$executeRawUnsafe(`UPDATE "${table}" SET "${colonne}" = $1 WHERE ctid = $2::tid`, nouveau, ref);
      r.convertis++;
      r.chiffres += sens === "chiffrer" ? 1 : -1;
    }
    releve.push(r);
  }
  return releve;
}
