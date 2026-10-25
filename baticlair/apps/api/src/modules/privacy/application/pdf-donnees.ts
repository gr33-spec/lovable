import { pdfDeTexte, type BlocPdf } from "../../../platform/pdf/pdf-texte.js";

/**
 * « Télécharger mes données » en PDF LISIBLE (RGPD, accès, 24 octobre 2026) : le même contenu que le fichier JSON, mis en
 * page : un bloc par rubrique, une ligne par information (« clé : valeur »), les listes numérotées. Rien n'est retiré.
 */
const LIBELLES: Record<string, string> = {
  exportedAt: "Exporté le",
  exporteLe: "Exporté le",
  user: "Votre compte",
  companies: "Vos entreprises",
  compte: "Votre compte",
  depots: "Vos dépôts",
  abonnements: "Vos abonnements",
  grilles: "Vos grilles",
  commandesRecues: "Commandes reçues",
  commandeCommune: "Regroupement",
};

function valeur(v: unknown): string {
  if (v === null || v === undefined) return "(vide)";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function lignes(v: unknown, prefixe = "", profondeur = 0): string[] {
  if (Array.isArray(v)) {
    if (v.length === 0) return [`${prefixe}(aucun)`];
    return v.flatMap((x, i) => (x && typeof x === "object" && profondeur < 3 ? [`${prefixe}${i + 1}.`, ...lignes(x, `${prefixe}   `, profondeur + 1)] : [`${prefixe}${i + 1}. ${valeur(x)}`]));
  }
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => (x && typeof x === "object" && !(x instanceof Date) && profondeur < 3 ? [`${prefixe}${k} :`, ...lignes(x, `${prefixe}   `, profondeur + 1)] : [`${prefixe}${k} : ${valeur(x)}`]));
  }
  return [`${prefixe}${valeur(v)}`];
}

export async function pdfDesDonnees(titre: string, donnees: Record<string, unknown>): Promise<Uint8Array> {
  const blocs: BlocPdf[] = Object.entries(donnees).map(([cle, v]) => ({ titre: LIBELLES[cle] ?? cle, lignes: lignes(v) }));
  return pdfDeTexte(titre, blocs);
}
