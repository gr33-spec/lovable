import { AtSign, Bell, Building2, CreditCard, FolderOpen, LifeBuoy, Palette, Plug, ShieldCheck, Sparkles, UserRound, type LucideIcon } from "lucide-react";

/**
 * « PROFIL ET PARAMÈTRES » (Greg, 1er novembre 2026, puis 10 novembre : captures 18 et 19) : le sommaire, en quatre groupes,
 * chaque ligne ouvre sa rubrique (`/compte/<id>`). Les identifiants d'avant sont gardés (aucun lien cassé) ; trois rubriques
 * naissent : « Profil public et missions », « Documents et qualifications », « Guide et chantier fictif ». Renommées :
 * « Informations personnelles » → « Compte et sécurité », « Abonnement et factures » → « Abonnement, factures et reçus »,
 * « Adresse Mobiiz et réponses » → « E-mails Mobiiz et réponses », « Préférences apprises » → « Mémoire de Mobiiz ».
 */
export type RubriqueProfil =
  | "informations"
  | "entreprise"
  | "profil-public"
  | "documents"
  | "apparence"
  | "notifications"
  | "abonnement"
  | "adresse"
  | "connexions"
  | "preferences"
  | "donnees"
  | "aide"
  | "guide";

export interface LigneProfil {
  id: RubriqueProfil;
  titre: string;
  sousTitre: string;
  icone: LucideIcon;
  /** Apparence : le fond jaune de la maquette (la rubrique mise en avant). */
  enAvant?: boolean;
  /** Rubrique des missions : absente du sommaire tant que le réglage `MISSIONS_V1` est coupé. */
  missions?: boolean;
}

export const GROUPES_PROFIL: { titre: string; lignes: LigneProfil[] }[] = [
  {
    titre: "Entreprise",
    lignes: [
      { id: "entreprise", titre: "Mon entreprise", sousTitre: "Coordonnées, SIRET, métiers et zones", icone: Building2 },
      { id: "profil-public", titre: "Profil public et missions", sousTitre: "Présentation, services et disponibilités", icone: UserRound, missions: true },
      { id: "documents", titre: "Documents et qualifications", sousTitre: "Dossier, assurances, CV et références", icone: FolderOpen, missions: true },
    ],
  },
  {
    titre: "Préférences",
    lignes: [
      { id: "apparence", titre: "Apparence", sousTitre: "Mode clair, sombre ou automatique", icone: Palette, enAvant: true },
      { id: "notifications", titre: "Notifications", sousTitre: "E-mails, alertes et rappels", icone: Bell },
      { id: "preferences", titre: "Mémoire de Mobiiz", sousTitre: "Informations conservées pour t'aider", icone: Sparkles },
    ],
  },
  {
    titre: "Compte et services",
    lignes: [
      { id: "informations", titre: "Compte et sécurité", sousTitre: "Mot de passe, connexions et accès", icone: ShieldCheck },
      { id: "abonnement", titre: "Abonnement, factures et reçus", sousTitre: "Offre, paiements et documents", icone: CreditCard },
      { id: "adresse", titre: "E-mails Mobiiz et réponses", sousTitre: "Adresses d'envoi et messages reçus", icone: AtSign },
      { id: "connexions", titre: "Connexions", sousTitre: "Logiciels de devis et intégrations", icone: Plug },
    ],
  },
  {
    titre: "Données et aide",
    lignes: [
      { id: "donnees", titre: "Données et confidentialité", sousTitre: "Exporter, corriger ou supprimer", icone: ShieldCheck },
      { id: "aide", titre: "Aide et contact", sousTitre: "Questions fréquentes et assistance", icone: LifeBuoy },
      { id: "guide", titre: "Guide et chantier fictif", sousTitre: "Revoir le parcours sans risque", icone: Sparkles },
    ],
  },
];

export const LIGNES_PROFIL: LigneProfil[] = GROUPES_PROFIL.flatMap((g) => g.lignes);

export function ligneProfil(id: string): LigneProfil | null {
  return LIGNES_PROFIL.find((l) => l.id === id) ?? null;
}
