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
  "zip", "zipx", "zst", "rar", "7z", "gz", "tgz", "tar", "bz2", "xz", "cab", "iso", "img", "vhd", "vhdx", "arj", "lzh", "ace", "z",
  // Installeurs et compléments Windows, messages imbriqués (saboteur, 22 novembre 2026)
  "xll", "msix", "msixbundle", "appx", "appxbundle", "appinstaller", "eml", "msg", "vb", "settingcontent-ms", "library-ms", "search-ms", "diagcab", "application", "xbap",
  // Documents à macros
  "docm", "dotm", "xlsm", "xltm", "xlam", "xlsb", "pptm", "potm", "ppam", "ppsm", "sldm",
  // Pages web et fichiers qui ouvrent un navigateur ou un lien
  "htm", "html", "xhtml", "shtml", "mht", "mhtml", "svg", "xht", "xml", "chm", "one",
]);

/** Les types MIME qui disent la même chose, quel que soit le nom du fichier. */
const TYPES_DANGEREUX = [/x-ms(?:download|dos-program)/, /x-executable/, /x-msi/, /java-archive/, /x-sh\b/, /javascript/, /vbscript/, /zip/, /x-rar/, /x-7z/, /x-tar/, /gzip/, /macroenabled/i, /text\/html/, /svg/, /hta/, /portable-executable/, /x-dosexec/, /xml/, /message\/rfc822/, /x-msdownload/];

/** Les caractères invisibles ou qui inversent le sens d'écriture : un nom qui en porte est fait pour tromper. */
const CARACTERES_TROMPEURS = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/;

/** Vrai quand la pièce jointe ne doit jamais passer : extension dangereuse (même cachée derrière une autre) ou type dangereux. */
export function pieceDangereuse(nom: string, type = ""): boolean {
  if (CARACTERES_TROMPEURS.test(nom)) return true;
  const n = nom.trim().toLowerCase().replace(/[\s.]+$/, "");
  const parties = n.split(".").slice(1);
  if (parties.some((ext) => EXTENSIONS_DANGEREUSES.has(ext))) return true;
  return TYPES_DANGEREUX.some((r) => r.test(type.toLowerCase()));
}

/**
 * Le contenu dit-il ce que le nom promet ? (saboteur, 22 novembre 2026 : un « devis.pdf » qui est un exécutable ou une
 * archive). Un PDF commence par « %PDF », une image par sa signature ; un exécutable (MZ, ELF) ou une archive (ZIP, RAR,
 * 7z, gzip) ne passe jamais, sauf l'enveloppe ZIP des documents bureautiques sans macro (docx, xlsx, pptx, odt, ods).
 */
export function contenuDangereux(nom: string, debut: Uint8Array): boolean {
  const ext = nom.trim().toLowerCase().replace(/[\s.]+$/, "").split(".").pop() ?? "";
  const commence = (...octets: number[]) => octets.every((o, i) => debut[i] === o);
  if (commence(0x4d, 0x5a) || commence(0x7f, 0x45, 0x4c, 0x46)) return true;
  const zip = commence(0x50, 0x4b, 0x03, 0x04) || commence(0x50, 0x4b, 0x05, 0x06);
  if (zip) return !["docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(ext);
  if (commence(0x52, 0x61, 0x72, 0x21) || commence(0x37, 0x7a, 0xbc, 0xaf) || commence(0x1f, 0x8b)) return true;
  if (ext === "pdf") return !commence(0x25, 0x50, 0x44, 0x46);
  const signatures: Record<string, number[][]> = { jpg: [[0xff, 0xd8, 0xff]], jpeg: [[0xff, 0xd8, 0xff]], png: [[0x89, 0x50, 0x4e, 0x47]], gif: [[0x47, 0x49, 0x46, 0x38]], webp: [[0x52, 0x49, 0x46, 0x46]] };
  const attendues = signatures[ext];
  return attendues ? !attendues.some((sig) => commence(...sig)) : false;
}

/**
 * Un « Nom <adresse> » lu comme une messagerie : la VRAIE adresse est le DERNIER « <…> » hors guillemets ; un « <…> »
 * écrit dans le nom affiché ne compte pas ; commentaire « (…) » et point final retirés.
 */
export function expediteurEntrant(s: string): { nom: string; adresse: string } {
  const masque = s.replace(/"(?:[^"\\]|\\.)*"/g, (m) => " ".repeat(m.length));
  const chevrons = [...masque.matchAll(/<([^<>]*)>/g)];
  const dernier = chevrons.at(-1);
  const nettoyer = (a: string) => a.replace(/\([^)]*\)/g, " ").trim().toLowerCase().replace(/\.+$/, "");
  if (dernier) return { nom: s.slice(0, dernier.index).replace(/["\\]/g, "").trim(), adresse: nettoyer(dernier[1]!) };
  const sansCommentaire = nettoyer(s);
  return { nom: "", adresse: /[^\s<>"]+@[^\s<>"]+/.exec(sansCommentaire)?.[0].replace(/\.+$/, "") ?? sansCommentaire };
}

/** L'adresse nue d'un « Nom <adresse> », en minuscules : la vraie. */
export function adresseNueEntrante(s: string): string {
  return expediteurEntrant(s).adresse;
}

/** Les lettres cyrilliques et grecques qui ressemblent à des lettres latines. */
const SOSIES: Record<string, string> = { а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d", ӏ: "l", ο: "o", α: "a", ι: "i", ν: "v", κ: "k", ı: "i", "0": "o", "1": "i" };

/** Le « squelette » d'un texte : sans accents, lettres sosies ramenées au latin, lettres seules (« mоbíiz.fr » → « mobiizfr »). */
export function squelette(texte: string): string {
  return [...texte.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()]
    .map((c) => SOSIES[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
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

/** Un verdict, en minuscules ; « softfail », « permerror », « temperror » comptent comme des refus. */
const refus = (v: string | null | undefined): boolean => ["fail", "softfail", "permerror", "temperror", "hardfail"].includes((v ?? "").toLowerCase());
const passe = (v: string | null | undefined): boolean => (v ?? "").toLowerCase() === "pass";

/**
 * Le verdict d'un message reçu. Suspect quand : DMARC échoue ; SPF ET DKIM échouent tous les deux ; le message se dit de
 * Mobiiz sans le prouver (adresse, sous-domaine, domaine sosie, nom affiché « Mobiiz ») ; le nom affiché porte une
 * adresse ; une pièce jointe est dangereuse. « Authentifié » est réservé à DMARC passé : le seul contrôle qui prouve le
 * domaine de l'expéditeur affiché. Sans résultat (lecture impossible), pas suspect, jamais authentifié.
 */
export function verdictEntrant(m: { de: string; authentification: Authentification | null | undefined; pieces: readonly { nom: string; type?: string; dangereux?: boolean }[]; domaineApp: string | null }): VerdictEntrant {
  const a = m.authentification ?? {};
  const raisons: string[] = [];
  const { nom, adresse } = expediteurEntrant(m.de);
  const domaine = adresse.split("@")[1] ?? "";
  if (refus(a.dmarc)) raisons.push("DMARC refusé : le domaine de l'expéditeur ne reconnaît pas ce message");
  if (refus(a.spf) && refus(a.dkim)) raisons.push("Expéditeur non authentifié (SPF et DKIM refusés)");
  if (!domaine || !adresse.includes("@")) raisons.push("Adresse d'expéditeur illisible");
  const authentifie = passe(a.dmarc);
  if (m.domaineApp) {
    const app = m.domaineApp.toLowerCase();
    const cle = squelette(app.split(".")[0] ?? app);
    const nomDomaine = domaine.split(".").slice(0, -1).join(".");
    if (estDuDomaine(domaine, app)) {
      if (!authentifie) raisons.push(`Se fait passer pour ${app} sans le prouver`);
    } else if (cle && (squelette(nomDomaine).includes(cle) || domaine.split(".").some((l) => l.startsWith("xn--")))) raisons.push(`Domaine qui imite ${app} : ${domaine}`);
    if (cle && squelette(nom).includes(cle) && !(estDuDomaine(domaine, app) && authentifie)) raisons.push(`Nom affiché « ${nom} » qui imite ${app}`);
  }
  if (nom.includes("@")) raisons.push("Une adresse est écrite dans le nom affiché");
  const piecesBloquees = m.pieces.filter((p) => p.dangereux || pieceDangereuse(p.nom, p.type)).map((p) => p.nom);
  if (piecesBloquees.length) raisons.push(`Pièce jointe dangereuse : ${piecesBloquees.join(", ")}`);
  return { suspect: raisons.length > 0, raisons: [...new Set(raisons)], piecesBloquees, authentifie };
}

/**
 * Les liens d'un message externe, rendus NON CLIQUABLES (comme un filtre de messagerie) : « https://site.fr/x » devient
 * « hxxps://site[.]fr/x » ; une adresse « www.site.fr » devient « www[.]site[.]fr ». Le texte reste lisible.
 */
export function liensDesactives(texte: string): string {
  return (
    texte
      // Tout schéma suivi de « :// », même collé à un mot (« voirhttps://… », « ftp:// ») : le « :// » est cassé.
      .replace(/h(?:tt|xx)p(s?):\/\//gi, (_m, s: string) => `hxxp${s}[:]//`)
      .replace(/([a-z][a-z0-9+.-]*):\/\//gi, "$1[:]//")
      // Tout nom de domaine (« www.site.fr », « bit.ly/x », « site.com/login ») : ses points deviennent « [.] ».
      // Longueurs bornées (un nom de domaine fait au plus 63 caractères par partie) : jamais de calcul sans fin sur un
      // texte énorme sans point (saboteur, 22 novembre 2026, corps de 3 Mo).
      .replace(/\b((?:[a-z0-9-]{1,63}\.){1,8}[a-z]{2,24})(?=$|[\s/:?#)\]>"',;!]|\.(?:\s|$))/gi, (d: string) => d.replace(/\./g, "[.]"))
  );
}

/** L'objet d'un message externe, préfixé « [Externe] » une seule fois. */
export function objetExterne(objet: string): string {
  const o = objet.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim() || "(sans objet)";
  return o.startsWith(PREFIXE_EXTERNE) ? o : `${PREFIXE_EXTERNE} ${o}`;
}

/** Au-delà, une adresse reçoit un volume anormal : une alerte part à l'admin (une par adresse et par heure). */
export const SEUIL_VOLUME_HEURE = 30;
export const volumeAnormal = (recusDerniereHeure: number): boolean => recusDerniereHeure >= SEUIL_VOLUME_HEURE;
