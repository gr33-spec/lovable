"use client";

import { useCallback } from "react";
import { api, ApiError, type Health } from "@/lib/api";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/** MISSIONS, « MESSAGES ET RÉPONSES », CLOCHE (Greg, 10 novembre 2026) : les types rendus par l'API et les petits appels. */
export interface EntrepriseVue { id: string; nom: string; initiales: string; verifiee: boolean; departement: string | null }
export interface FichierVue { id: string; nom: string; type: string; taille: number; categorie?: string | null; titre?: string | null; surProfil?: boolean }
export interface AnnonceVue {
  id: string;
  type: "mission" | "disponibilite";
  statut: "publiee" | "suspendue" | "fermee";
  mienne: boolean;
  titre: string;
  metier: string;
  autreMetier: string | null;
  lieu: string;
  departement: string;
  rayonKm: number | null;
  debut: string;
  fin: string | null;
  types: string[];
  description: string;
  niveau: string | null;
  experience: string | null;
  qualifications: string[];
  equipe: string | null;
  contexte: string | null;
  modeChiffrage: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budget: string | null;
  frais: string | null;
  conditions: string | null;
  tarifJour: number | null;
  tarifUnite: string | null;
  tarif: string | null;
  tarifVisible: boolean;
  dureeMinJours: number | null;
  negociable: boolean;
  entreprise: EntrepriseVue | null;
  consultations?: number;
  reponses?: number;
  conversations?: number;
  fichiers?: FichierVue[];
  enregistree?: boolean;
  maReponse?: { id: string; envoyeeLe: string } | null;
  conversationId?: string | null;
}
export interface ReponseVue {
  id: string;
  annonceId: string;
  entreprise: EntrepriseVue;
  niveau: string;
  niveauLibelle: string | null;
  experienceAns: number;
  equipe: number;
  message: string;
  tarif: string | null;
  jours: string | null;
  deplacement: string | null;
  documents: FichierVue[];
  conversationId: string | null;
  envoyeeLe: string;
  annonce?: AnnonceVue;
}
export interface ConversationResume { id: string; entreprise: EntrepriseVue; sujet: string; extrait: string; le: string; nonLu: boolean; archivee: boolean; bloquee: boolean }
export interface ConversationVue {
  id: string;
  entreprise: EntrepriseVue;
  annonce: { id: string; type: string; titre: string; debut: string; fin: string | null; statut: string };
  coordonnees: { etat: "privees" | "proposees_par_moi" | "proposees_par_l_autre" | "partagees"; nom?: string; contact?: string | null; telephone?: string | null; email?: string | null };
  bloquee: boolean;
  bloqueeParMoi: boolean;
  archivee: boolean;
  messages: { id: string; deMoi: boolean; texte: string; le: string; fichiers: FichierVue[] }[];
}
export interface AlerteVue { id: string; categorie: string; genre: "action" | "information"; titre: string; detail: string; action: string; href: string; lue: boolean; le: string }

/** Le réglage `MISSIONS_V1` de l'API (route de santé, publique) : `undefined` pendant le chargement. */
export function useMissionsActif(): boolean | undefined {
  const fetcher = useCallback((signal: AbortSignal) => api<Health>("/v1/health", { signal }), []);
  const { data, error } = useResource(fetcher);
  return error ? false : data === null ? undefined : data.features.missions === true;
}

/** La phrase à montrer pour un refus : celle de l'API d'abord, sinon une phrase simple selon le cas. */
export function phraseErreur(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.phrase) return e.phrase;
    if (e.code === "network") return "Pas de connexion. Vérifie ton réseau, puis réessaie.";
    if (e.status === 404) return "Cet élément n'existe plus ou ne t'est pas accessible.";
    if (e.status === 403) return "Tu n'as pas accès à cette action.";
    if (e.status === 413) return "Ce fichier est trop lourd (4 Mo au plus).";
    return e.message;
  }
  return "Ça n'a pas marché. Réessaie dans un instant.";
}

/** Ouvre un fichier professionnel par son lien privé et temporaire (5 minutes), dans l'afficheur de l'application. */
export async function ouvrirFichierPro(f: { id: string; nom: string }): Promise<void> {
  const { url } = await api<{ url: string }>(`/v1/fichiers-pro/${f.id}/lien`);
  openFile({ url, title: f.nom, fileName: f.nom });
}

export const cleEnvoi = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const tailleLisible = (octets: number) => (octets >= 1_000_000 ? `${(octets / 1_000_000).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(octets / 1000))} Ko`);
