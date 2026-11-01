import { AtSign, Bell, Building2, CreditCard, LifeBuoy, Palette, Plug, ShieldCheck, Sparkles, UserRound, type LucideIcon } from "lucide-react";

/**
 * « PROFIL ET PARAMÈTRES » (Greg, 1er novembre 2026) : le sommaire, en quatre groupes, chaque ligne ouvre sa rubrique
 * (`/compte/<id>`). Les titres et sous-titres sont ceux de la maquette, mot pour mot.
 */
export type RubriqueProfil =
  | "informations"
  | "entreprise"
  | "apparence"
  | "notifications"
  | "abonnement"
  | "adresse"
  | "connexions"
  | "preferences"
  | "donnees"
  | "aide";

export interface LigneProfil {
  id: RubriqueProfil;
  titre: string;
  sousTitre: string;
  icone: LucideIcon;
  /** Apparence : le fond jaune pâle de la maquette (la rubrique mise en avant). */
  enAvant?: boolean;
}

export const GROUPES_PROFIL: { titre: string; lignes: LigneProfil[] }[] = [
  {
    titre: "Mon compte",
    lignes: [
      { id: "informations", titre: "Informations personnelles", sousTitre: "Nom, e-mail et sécurité", icone: UserRound },
      { id: "entreprise", titre: "Mon entreprise", sousTitre: "Coordonnées, SIRET et métiers", icone: Building2 },
    ],
  },
  {
    titre: "Personnalisation",
    lignes: [
      { id: "apparence", titre: "Apparence", sousTitre: "Application, logo et demandes de prix", icone: Palette, enAvant: true },
      { id: "notifications", titre: "Notifications", sousTitre: "Réponses, analyses et achats groupés", icone: Bell },
    ],
  },
  {
    titre: "Services",
    lignes: [
      { id: "abonnement", titre: "Abonnement et factures", sousTitre: "Offre, analyses et paiements", icone: CreditCard },
      { id: "adresse", titre: "Adresse Mobiiz et réponses", sousTitre: "E-mails fournisseurs et reçus", icone: AtSign },
      { id: "connexions", titre: "Connexions", sousTitre: "Logiciel de devis", icone: Plug },
    ],
  },
  {
    titre: "Données et aide",
    lignes: [
      { id: "preferences", titre: "Préférences apprises", sousTitre: "Ce que Mobiiz retient pour t'aider", icone: Sparkles },
      { id: "donnees", titre: "Données et confidentialité", sousTitre: "Exporter ou supprimer", icone: ShieldCheck },
      { id: "aide", titre: "Aide et contact", sousTitre: "Questions fréquentes et contact", icone: LifeBuoy },
    ],
  },
];

export const LIGNES_PROFIL: LigneProfil[] = GROUPES_PROFIL.flatMap((g) => g.lignes);

export function ligneProfil(id: string): LigneProfil | null {
  return LIGNES_PROFIL.find((l) => l.id === id) ?? null;
}
