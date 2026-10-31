/**
 * LES DONNÉES DES CLIENTS DES ARTISANS (Greg, 24 octobre 2026, RGPD point 3) : un devis importé porte le nom, le
 * téléphone, l'e-mail et l'adresse d'un particulier. Avant tout stockage durable du texte et avant tout envoi à l'IA, ces
 * données sont retirées ; seule la commune du chantier reste (code postal et ville). Calcul pur, sans IA : des motifs
 * sûrs, qui préfèrent retirer un peu trop (l'en-tête de l'artisan aussi) que laisser passer un client.
 *
 * Ce qui reste lisible : les désignations, quantités, unités, prix, et « 22300 Lannion ».
 */

export const CLIENT_RETIRE = "[client]";
export const ADRESSE_RETIREE = "[adresse retirée]";
export const TELEPHONE_RETIRE = "[téléphone retiré]";
export const EMAIL_RETIRE = "[e-mail retiré]";

const MAJ = "A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ";
const NOM = `[${MAJ}][${MAJ}a-zàâäéèêëîïôöùûüç'’-]+`;
/** « M. Dupont », « Mme Le Goff », « Monsieur et Madame MARTIN Jean », « M. et Mme Kerbrat ». */
const CIVILITE = new RegExp(`\\b(?:M\\.|Mr\\.?|MM\\.|Mme|Mmes|Mlle|Monsieur|Madame|Mademoiselle)(?:\\s+(?:et|&)\\s+(?:Mme|Madame|M\\.|Monsieur))?\\s+(?:${NOM})(?:\\s+${NOM}){0,3}`, "gu");
/** « Client : … », « Maître d'ouvrage : … » : tout ce qui suit l'étiquette. */
const ETIQUETTE_CLIENT = /^(\s*(?:client(?:e)?|nom du client|nom|maître d['’]ouvrage|maitre d['’]ouvrage|destinataire|à l['’]attention de|a l['’]attention de|adressé à|adresse a|propriétaire|proprietaire)\s*:\s*)(.+)$/iu;
/** « Adresse : … », « Adresse du chantier : 3 rue … 22300 Lannion » : la rue tombe, la commune reste. */
const ETIQUETTE_ADRESSE = /^(\s*(?:adresse(?: du chantier| de livraison| client)?|lieu du chantier|chantier situé)\s*:\s*)(.+)$/iu;
const VOIES = "rue|avenue|av\\.|bd|boulevard|chemin|ch\\.|impasse|imp\\.|allée|allee|place|pl\\.|route|rte|quai|square|cours|passage|venelle|sentier|voie|résidence|residence|lotissement|lot\\.|hameau|lieu[- ]dit|cité|cite|villa|clos|parc|domaine|faubourg|fg|esplanade|rond[- ]point|carrefour|montée|montee|côte|cote|corniche|ruelle|traverse|mail|zone|za|zi|zac";
/** « 3 rue des Ajoncs », « 12 bis, avenue du Port », « Lieu-dit Kerbras » (sans numéro pour les lieux-dits). */
const VOIE_NUMEROTEE = new RegExp(`\\b\\d{1,4}\\s?(?:bis|ter|quater|[a-d])?\\b,?\\s+(?:${VOIES})\\b[^,;\\n]*?(?=\\s*(?:,|;|\\b\\d{5}\\b|$))`, "giu");
const VOIE_SANS_NUMERO = /\b(?:lieu[- ]dit|hameau|lotissement|résidence|residence)\s+[^,;\n]*?(?=\s*(?:,|;|\b\d{5}\b|$))/giu;
/** Téléphones français : 06 12 34 56 78, 06.12.34.56.78, 0612345678, +33 6 12 34 56 78, (0)2 96… */
const TELEPHONE = /(?:\+33\s?\(?0?\)?\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/gu;
const EMAIL = /\b[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}\b/gu;
/** Le code postal et la ville : ce qui reste du chantier. */
const COMMUNE = new RegExp(`\\b(\\d{5})\\s+(${NOM}(?:(?:-(?:sur-|sous-|lès-|les-|en-|de-|du-|la-|le-)?|\\s(?!-))${NOM}){0,4})`, "u");

export interface LigneAnonymisee {
  texte: string;
  /** Ce qui a été retiré de la ligne (types seulement, jamais la valeur). */
  retraits: ("client" | "adresse" | "telephone" | "email")[];
}

/** Retire d'une ligne de devis le nom, le téléphone, l'e-mail et la rue d'un particulier ; garde la commune. */
export function anonymiserLigne(ligne: string): LigneAnonymisee {
  const retraits: LigneAnonymisee["retraits"] = [];
  const marque = (quoi: LigneAnonymisee["retraits"][number]) => () => {
    retraits.push(quoi);
    return quoi === "client" ? CLIENT_RETIRE : quoi === "adresse" ? ADRESSE_RETIREE : quoi === "telephone" ? TELEPHONE_RETIRE : EMAIL_RETIRE;
  };
  let t = ligne;
  t = t.replace(EMAIL, marque("email"));
  t = t.replace(TELEPHONE, marque("telephone"));
  const client = ETIQUETTE_CLIENT.exec(t);
  if (client) {
    // L'étiquette reste, la valeur tombe ; une commune écrite dans la valeur reste.
    const commune = COMMUNE.exec(client[2]!);
    retraits.push("client");
    t = `${client[1]}${CLIENT_RETIRE}${commune ? `, ${commune[1]} ${commune[2]}` : ""}`;
  }
  const adresse = ETIQUETTE_ADRESSE.exec(t);
  if (adresse && !t.includes(CLIENT_RETIRE)) {
    const commune = COMMUNE.exec(adresse[2]!);
    retraits.push("adresse");
    t = `${adresse[1]}${commune ? `${ADRESSE_RETIREE}, ${commune[1]} ${commune[2]}` : ADRESSE_RETIREE}`;
  }
  t = t.replace(CIVILITE, marque("client"));
  t = t.replace(VOIE_NUMEROTEE, marque("adresse"));
  t = t.replace(VOIE_SANS_NUMERO, marque("adresse"));
  return { texte: t, retraits };
}

/** Les lignes d'un document ; `retraits` compte ce qui a été retiré (pour le journal, sans aucune valeur). */
export function anonymiserLignes(lignes: readonly string[]): { lignes: string[]; retraits: number; commune: string | null } {
  let retraits = 0;
  let commune: string | null = null;
  const out = lignes.map((l) => {
    const a = anonymiserLigne(l);
    retraits += a.retraits.length;
    if (!commune) {
      const m = COMMUNE.exec(a.texte);
      if (m) commune = `${m[1]} ${m[2]}`;
    }
    return a.texte;
  });
  return { lignes: out, retraits, commune };
}
