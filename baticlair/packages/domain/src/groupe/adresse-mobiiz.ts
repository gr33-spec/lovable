
/**
 * L'ADRESSE MOBIIZ DE L'ARTISAN (Greg, 26 et 27 octobre 2026, R7) : chaque entreprise a son adresse sur le domaine
 * (`toitures-martin@mobiiz.fr`). C'est elle qui envoie ses demandes de prix ; les réponses des négoces (et tout ce qu'ils
 * y envoient) arrivent dans Mobiiz. Une adresse donnée n'est jamais reprise par une autre entreprise (« rien n'est
 * supprimé ») : l'ancienne reste active quand l'artisan en change.
 *
 * Ici, le pur calcul : le nom de l'adresse tiré du nom de l'entreprise, les noms réservés, l'étiquette de réponse
 * (`toitures-martin+r<étiquette>@mobiiz.fr`, « Répondre » d'un négoce retrouve sa demande) et le repère dans l'objet
 * (`[réf. <étiquette>]`) quand un négoce répond depuis un autre outil. Fichier SANS DÉPENDANCE : le site l'importe tel
 * quel (le nom de l'application lui est passé) ; `adresse-mobiiz-phrases.ts` y applique le nom de l'application pour l'API.
 */
export const ADRESSES_RESERVEES = ["contact", "bonjour", "admin", "support", "noreply", "no-reply", "postmaster", "abuse", "mobiiz", "reponses", "chasseur", "info", "hello", "test", "demo", "webmaster", "hostmaster", "security", "facturation", "factures", "rgpd", "dpo"];

export const ADRESSE_MIN = 3;
export const ADRESSE_MAX = 40;

/** Le nom d'adresse tiré d'un nom (entreprise, commune) : minuscules sans accent, lettres, chiffres et tirets. */
export function nomAdresse(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, ADRESSE_MAX)
    .replace(/-+$/g, "");
}

export type RefusAdresse = "trop_courte" | "trop_longue" | "caracteres" | "reservee";

/** Ce que l'artisan peut choisir : 3 à 40 caractères, lettres sans accent, chiffres, tirets, jamais un nom réservé. */
export function fauteAdresse(adresse: string): RefusAdresse | null {
  if (adresse.length < ADRESSE_MIN) return "trop_courte";
  if (adresse.length > ADRESSE_MAX) return "trop_longue";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adresse)) return "caracteres";
  if (ADRESSES_RESERVEES.includes(adresse) || /^(lot|r)-?\d+$/.test(adresse)) return "reservee";
  return null;
}

export const PHRASES_REFUS_ADRESSE: Record<RefusAdresse, string> = {
  trop_courte: "Trois caractères au moins.",
  trop_longue: "Quarante caractères au plus.",
  caracteres: "Lettres sans accent, chiffres et tirets seulement.",
  reservee: "Cette adresse est réservée.",
};

/** Une étiquette de réponse : 8 caractères lisibles (ni 0/O ni 1/I/L), tirés au sort. */
export const ALPHABET_ETIQUETTE = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Les adresses à essayer dans l'ordre pour une entreprise : son nom, puis son nom et sa commune, puis son nom numéroté.
 * Un nom trop court ou réservé prend « artisan » devant.
 */
export function candidatsAdresse(nomEntreprise: string, commune: string | null | undefined, alea: () => number = Math.random): string[] {
  let base = nomAdresse(nomEntreprise);
  if (base.length < ADRESSE_MIN || fauteAdresse(base) === "reservee") base = nomAdresse(`artisan ${base}`.trim());
  if (fauteAdresse(base)) base = "artisan";
  const liste = [base];
  const lieu = commune ? nomAdresse(commune) : "";
  if (lieu && fauteAdresse(`${base}-${lieu}`) === null) liste.push(`${base}-${lieu}`);
  for (let n = 2; n <= 50; n++) liste.push(`${base}-${n}`.slice(0, ADRESSE_MAX));
  // Au-delà (cinquante homonymes) : un suffixe tiré au sort, jamais à court.
  const tronque = base.slice(0, ADRESSE_MAX - 6);
  for (let i = 0; i < 10; i++) {
    let suffixe = "";
    for (let j = 0; j < 5; j++) suffixe += ALPHABET_ETIQUETTE[Math.floor(alea() * ALPHABET_ETIQUETTE.length)]!;
    liste.push(`${tronque}-${suffixe}`);
  }
  return liste;
}

export function etiquetteDepuis(octets: Uint8Array): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET_ETIQUETTE[octets[i]! % ALPHABET_ETIQUETTE.length];
  return s;
}

/** L'adresse de réponse d'une demande : `nom+r<étiquette>@domaine`. */
export const adresseReponseArtisan = (adresse: string, etiquette: string, domaine: string): string => `${adresse}+r${etiquette}@${domaine}`;
/** L'expéditeur affiché chez le négoce : « Toitures Martin via Mobiiz <toitures-martin@mobiiz.fr> ». */
export const expediteurViaApp = (nomEntreprise: string, adresse: string, domaine: string, nomApp: string): string => `${nomEntreprise.replace(/[<>"\r\n]/g, " ").replace(/\s+/g, " ").trim()} via ${nomApp} <${adresse}@${domaine}>`;
/** Le repère ajouté à l'objet de la demande : un négoce qui répond depuis un autre outil le garde. */
export const repereObjet = (etiquette: string): string => `[réf. ${etiquette}]`;
export const objetAvecRepere = (objet: string, etiquette: string): string => `${objet} ${repereObjet(etiquette)}`;

/** L'étiquette lue dans un objet (« Re: Demande de devis [réf. ab12cd34] »), sinon null. */
export function etiquetteDansObjet(objet: string): string | null {
  const m = /\[r[ée]f\.?\s*([a-z2-9]{8})\]/i.exec(objet);
  return m ? m[1]!.toLowerCase() : null;
}

/** L'adresse du domaine visée par un e-mail reçu : le nom et, s'il y en a une, l'étiquette de réponse. */
export function lireAdresseMobiiz(to: readonly string[], domaine: string): { adresse: string; etiquette: string | null } | null {
  for (const brut of to) {
    const nue = (/<([^>]+)>/.exec(brut)?.[1] ?? brut).trim().toLowerCase();
    const m = /^([a-z0-9][a-z0-9-]*)(?:\+r([a-z0-9]{8}))?@(.+)$/.exec(nue);
    if (!m || m[3] !== domaine.toLowerCase()) continue;
    return { adresse: m[1]!, etiquette: m[2] ?? null };
  }
  return null;
}

/** L'adresse nue d'un « Nom <adresse> ». */
export function adresseNue(s: string): string {
  return (/<([^>]+)>/.exec(s)?.[1] ?? s).trim().toLowerCase();
}

/** Le nom affiché d'un expéditeur (« Négoce Dupont <ventes@dupont.fr> » → « Négoce Dupont »), sinon l'adresse. */
export function nomExpediteur(s: string): string {
  const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(s);
  return m ? m[1]!.trim() : adresseNue(s);
}

/** Les phrases de l'écran dédié (Greg, 27 octobre 2026, mot pour mot), pour le nom d'application donné. */
export const phrasesAdresse = (nomApp: string) =>
  ({
    titre: `Voici ton adresse ${nomApp} :`,
    envoie: "C'est elle qui envoie tes demandes de prix.",
    recoit: `Les réponses des négoces arrivent ici, dans ${nomApp}.`,
    donne: "Donne-la à tes négoces : tout ce qu'ils y envoient arrive ici.",
    rappel: `Les réponses arrivent dans ${nomApp}, on te prévient.`,
  }) as const;
