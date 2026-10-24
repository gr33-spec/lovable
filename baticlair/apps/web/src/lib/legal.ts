/**
 * Les pages légales (plan du 20 octobre 2026, bloc 6 ; mise en conformité du 24 octobre) : l'éditeur, les hébergeurs, la
 * version des CGU acceptée à l'inscription.
 *
 * LE REPÈRE « [A COMPLETER] » (Greg, 24 octobre 2026) : une information que seul Greg peut donner (Kbis, contact,
 * directeur de la publication). Il est le même partout (`A_COMPLETER`) et la construction de PRODUCTION échoue tant qu'il
 * reste dans une page (`scripts/garde-a-completer.mjs`, lancé avant `next build`). Liste dans `docs/groupe/CONFORMITE.md`.
 */
export const A_COMPLETER = "[A COMPLETER]";

/** La version des CGU artisan. Une version MAJEURE (`VERSION_CGU_MAJEURE`) est redemandée à chaque compte. */
export const VERSION_CGU = "2026-10-24";
/** La dernière version qui demande une nouvelle acceptation : un compte qui a accepté avant la voit et l'accepte. */
export const VERSION_CGU_MAJEURE = "2026-10-24";

/** Une version acceptée (« 2026-10-22 ») est-elle à jour ? Les versions sont des dates : l'ordre alphabétique suffit. */
export const cguAJour = (acceptee: string | null | undefined) => !!acceptee && acceptee >= VERSION_CGU_MAJEURE;

export const EDITEUR = {
  nom: "BATI INVEST",
  forme: "SARL",
  capital: A_COMPLETER,
  rcs: A_COMPLETER,
  siren: "910 796 325",
  siret: "910 796 325 00017",
  adresse: "6 impasse du Ouipoure, 22620 Ploubazlanec",
  tva: "FR61910796325",
  produit: "BatiClair",
  /** Le directeur de la publication (LCEN, art. 6-III). */
  directeurPublication: A_COMPLETER,
  /** L'adresse e-mail de contact (LCEN) et des demandes RGPD. */
  contact: A_COMPLETER,
};

/** L'hébergeur du site et de l'API (code : `vercel.json`, région `fra1`). */
export const HEBERGEUR = { nom: "Vercel Inc.", adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis", site: "vercel.com", serveurs: "Francfort (Allemagne, Union européenne)" };
/** L'hébergeur de la base de données (code : PostgreSQL chez Neon, `docs/ARCHITECTURE.md`). Adresse à recopier depuis son DPA. */
export const HEBERGEUR_BASE = { nom: "Neon Inc.", adresse: A_COMPLETER, site: "neon.tech", serveurs: "Francfort (Allemagne, Union européenne)" };

/** Le tribunal compétent (CGU et conditions négoces, Greg, 24 octobre 2026). */
export const TRIBUNAL = "tribunal de commerce de Saint-Brieuc";

/** Le pied de toutes les pages : les quatre documents et le contact. */
export const PAGES_LEGALES: readonly { href: string; label: string }[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/conditions-negoce", label: "Conditions négoces" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales#contact", label: "Contact" },
];
