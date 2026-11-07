/**
 * LE CONTACT AU NÉGOCE : L'E-MAIL DU COMMERCIAL (Greg, lot final, point 2) : « Un commercial qui voit ton nom répond. Une
 * adresse contact@, rarement. » Une adresse générale (contact@, accueil@, info@, commercial@…) se signale gentiment, sans
 * jamais bloquer l'ajout.
 */
export const PHRASE_EMAIL_COMMERCIAL = "Un commercial qui voit ton nom répond. Une adresse contact@, rarement.";
export const PHRASE_ADRESSE_GENERIQUE = "C'est une adresse générale. Si tu as celle de ton commercial, mets plutôt la sienne : il répondra plus vite.";

const PREFIXES_GENERIQUES = [
  "contact", "contacts", "accueil", "info", "infos", "information", "commercial", "commerciale", "commerce", "vente", "ventes",
  "devis", "agence", "magasin", "comptoir", "administration", "admin", "secretariat", "direction", "service", "serviceclient",
  "service-client", "sav", "hello", "bonjour", "bienvenue", "noreply", "no-reply", "office", "sales", "mail", "email",
];

/** Vrai pour une adresse de service (« contact@negoce.fr », « Info.Lannion@… ») plutôt que celle d'une personne. */
export function estAdresseGenerique(email: string): boolean {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  if (!local) return false;
  const tete = local.split(/[._+-]/)[0] ?? local;
  return PREFIXES_GENERIQUES.includes(local) || PREFIXES_GENERIQUES.includes(tete);
}
