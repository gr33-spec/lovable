/**
 * LES E-MAILS ENTRANTS, BLINDÉS (Greg, 22 novembre 2026 : « un spam d'arnaque arrivé sur contact@mobiiz.fr et transféré
 * chez moi habillé du logo Mobiiz ; ça ne doit plus jamais arriver, ni pour moi ni pour un artisan »). Comme Gmail et
 * Outlook : chaque message reçu (contact@ et les adresses Mobiiz des artisans) est jugé sur l'authentification que le
 * serveur de réception a calculée (SPF, DKIM, DMARC : Resend les donne, l'expéditeur ne peut pas les écrire), sur ses
 * pièces jointes et sur son expéditeur ; ce qui est suspect va en Indésirables, jamais supprimé en silence. Un message
 * externe n'est jamais habillé en Mobiiz : bandeau, expéditeur réel, objet « [Externe] », liens en texte non cliquable.
 * Sans import : le site et le serveur lisent le même fichier.
 */

/** Le verdict d'un des trois contrôles, tel que Resend le donne (`authentication.spf|dkim|dmarc`). */
export type VerdictAuth = "pass" | "fail" | "gray" | "processing_failed" | "unknown";
export interface Authentification {
  spf?: VerdictAuth | string | null;
  dkim?: VerdictAuth | string | null;
  dmarc?: VerdictAuth | string | null;
}

export const BANDEAU_EXTERNE = "Message externe, non vérifié par Mobiiz";
export const PREFIXE_EXTERNE = "[Externe]";

/**
 * Les pièces jointes qui ne passent jamais (comme Gmail : exécutables, scripts, archives qui pourraient les cacher,
 * documents à macros, pages web et raccourcis). PDF, images et documents bureautiques sans macro passent.
 */
const EXTENSIONS_DANGEREUSES = new Set([
  // Exécutables et installeurs
  "exe", "com", "scr", "pif", "bat", "cmd", "msi", "msp", "mst", "dll", "cpl", "app", "apk", "dmg", "pkg", "deb", "rpm", "bin", "run", "jar", "gadget", "reg", "inf",
  // Scripts
  "js", "jse", "vbs", "vbe", "wsf", "wsh", "wsc", "ps1", "psm1", "sh", "py", "hta", "msc", "lnk", "url", "scf", "iqy", "slk",
  // Archives et images disque
  "zip", "rar", "7z", "gz", "tgz", "tar", "bz2", "xz", "cab", "iso", "img", "vhd", "vhdx", "arj", "lzh", "ace", "z",
  // Documents à macros
  "docm", "dotm", "xlsm", "xltm", "xlam", "xlsb", "pptm", "potm", "ppam", "ppsm", "sldm",
  // Pages web et fichiers qui ouvrent un navigateur ou un lien
  "htm", "html", "xhtml", "shtml", "mht", "mhtml", "svg", "xht", "xml", "chm", "one",
]);

/** Les types MIME qui disent la même chose, quel que soit le nom du fichier. */
const TYPES_DANGEREUX = [/x-ms(?:download|dos-program)/, /x-executable/, /x-msi/, /java-archive/, /x-sh\b/, /javascript/, /vbscript/, /zip/, /x-rar/, /x-7z/, /x-tar/, /gzip/, /macroenabled/i, /text\/html/, /svg/, /hta/];

/** Vrai quand la pièce jointe ne doit jamais passer : extension dangereuse (même cachée derrière une autre) ou type dangereux. */
export function pieceDangereuse(nom: string, type = ""): boolean {
  const n = nom.trim().toLowerCase().replace(/[\s.]+$/, "");
  const parties = n.split(".").slice(1);
  if (parties.some((ext) => EXTENSIONS_DANGEREUSES.has(ext))) return true;
  return TYPES_DANGEREUX.some((r) => r.test(type.toLowerCase()));
}

/** L'adresse nue d'un « Nom <adresse> », en minuscules. */
export function adresseNueEntrante(s: string): string {
  return (/<([^>]+)>/.exec(s)?.[1] ?? s).trim().toLowerCase();
}

/** Le domaine d'une adresse (« negoce.fr »), sinon « ». */
export const domaineDe = (adresse: string): string => adresseNueEntrante(adresse).split("@")[1] ?? "";

/** Vrai quand le domaine est celui de l'application ou un de ses sous-domaines. */
export const estDuDomaine = (domaine: string, domaineApp: string): boolean => !!domaineApp && (domaine === domaineApp || domaine.endsWith(`.${domaineApp}`));

export interface VerdictEntrant {
  /** Suspect : le message va en Indésirables, sans alerte « X t'a répondu », sans devis rattaché. */
  suspect: boolean;
  /** Les raisons, en mots simples (« DMARC refusé »), pour l'artisan et pour l'admin. */
  raisons: string[];
  /** Les pièces jointes retenues (jamais gardées ni renvoyées), par leur nom. */
  piecesBloquees: string[];
  /** Vrai seulement quand le domaine de l'expéditeur est prouvé (DMARC passé, ou DKIM passé aligné). */
  authentifie: boolean;
}

/**
 * Le verdict d'un message reçu. Suspect quand : DMARC échoue ; SPF ET DKIM échouent tous les deux ; le message se dit de
 * Mobiiz sans le prouver (usurpation) ; il porte une pièce jointe dangereuse. Sans résultat d'authentification (lecture
 * impossible), le message n'est pas déclaré suspect mais reste « non vérifié » : il ne passe jamais pour authentifié.
 */
export function verdictEntrant(m: { de: string; authentification: Authentification | null | undefined; pieces: readonly { nom: string; type?: string }[]; domaineApp: string | null }): VerdictEntrant {
  const a = m.authentification ?? {};
  const raisons: string[] = [];
  const domaine = domaineDe(m.de);
  if (a.dmarc === "fail") raisons.push("DMARC refusé : le domaine de l'expéditeur ne reconnaît pas ce message");
  if (a.spf === "fail" && a.dkim === "fail") raisons.push("Expéditeur non authentifié (SPF et DKIM refusés)");
  if (!domaine || !m.de.includes("@")) raisons.push("Adresse d'expéditeur illisible");
  const authentifie = a.dmarc === "pass" || (a.dkim === "pass" && a.spf !== "fail");
  if (m.domaineApp && estDuDomaine(domaine, m.domaineApp) && a.dmarc !== "pass") raisons.push(`Se fait passer pour ${m.domaineApp} sans le prouver`);
  const piecesBloquees = m.pieces.filter((p) => pieceDangereuse(p.nom, p.type)).map((p) => p.nom);
  if (piecesBloquees.length) raisons.push(`Pièce jointe dangereuse : ${piecesBloquees.join(", ")}`);
  return { suspect: raisons.length > 0, raisons, piecesBloquees, authentifie };
}

/**
 * Les liens d'un message externe, rendus NON CLIQUABLES (comme un filtre de messagerie) : « https://site.fr/x » devient
 * « hxxps://site[.]fr/x » ; une adresse « www.site.fr » devient « www[.]site[.]fr ». Le texte reste lisible.
 */
export function liensDesactives(texte: string): string {
  const casserDomaine = (d: string) => d.replace(/\./g, "[.]");
  return texte
    .replace(/\bht(tps?):\/\/([^\s/<>"')\]]*[^\s/<>"')\].,;:!?])/gi, (_m, reste: string, domaine: string) => `hxx${reste.slice(1)}://${casserDomaine(domaine)}`)
    .replace(/(^|[\s(<"'])(www\.[^\s/<>"')\]]*[^\s/<>"')\].,;:!?])/gi, (_m, avant: string, domaine: string) => `${avant}${casserDomaine(domaine)}`);
}

/** L'objet d'un message externe, préfixé « [Externe] » une seule fois. */
export function objetExterne(objet: string): string {
  const o = objet.trim() || "(sans objet)";
  return o.startsWith(PREFIXE_EXTERNE) ? o : `${PREFIXE_EXTERNE} ${o}`;
}

/** Au-delà, une adresse reçoit un volume anormal : une alerte part à l'admin (une par adresse et par heure). */
export const SEUIL_VOLUME_HEURE = 30;
export const volumeAnormal = (recusDerniereHeure: number): boolean => recusDerniereHeure >= SEUIL_VOLUME_HEURE;
