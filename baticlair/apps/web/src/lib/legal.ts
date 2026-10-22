/** Les pages légales (plan du 20 octobre 2026, bloc 6) : l'éditeur, l'hébergeur, la version des CGU acceptée à l'inscription. */
export const VERSION_CGU = "2026-10-22";

export const EDITEUR = {
  nom: "BATI INVEST",
  forme: "SARL",
  siret: "910 796 325 00017",
  adresse: "6 impasse du Ouipoure, 22620 Ploubazlanec",
  tva: "FR61910796325",
  produit: "BatiClair",
};

export const HEBERGEUR = { nom: "Vercel Inc.", adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis", site: "vercel.com" };

export const PAGES_LEGALES: readonly { href: string; label: string }[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/conditions-negoce", label: "Conditions négoce" },
  { href: "/confidentialite", label: "Confidentialité" },
];
